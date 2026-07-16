import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query } from "../../../lib/db";
import { requireCurrentUser } from "../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../lib/format";
import { toBoardFields, fromBoardFields, postedAgo } from "../../../lib/time";
import { dayLabelFor } from "../../../lib/dayLabel";

export async function OPTIONS() {
  return corsPreflight();
}

// GET /api/events
// Returns activities shaped for the v1 board (TodayBoard + the "later this
// week" list): id, who, emoji, what, place, note, hour, dur, joined, spots,
// dist, postedAgo, day, dayOffset, isYours, youIn.
//
// Window: everything from 24h ago (so "wrapped" items still render today)
// through 5 days out (matches the composer's day picker, which only offers
// 0-5). `who` is the host's userId — the frontend already looks friends up
// by id via friendById(), so no name-joining is needed here.
export async function GET() {
  try {
    const user = await requireCurrentUser();
    const now = new Date();

    const { rows: events } = await query(
      `SELECT e.*
         FROM "Event" e
        WHERE e."startAt" >= NOW() - INTERVAL '24 hours'
          AND e."startAt" <= NOW() + INTERVAL '5 days'
          AND (
            e.visibility = 'everyone'
            OR e."hostId" = $1
            OR EXISTS (
              SELECT 1 FROM "Friendship" f
               WHERE f.status = 'accepted'
                 AND (
                   (f."userAId" = $1 AND f."userBId" = e."hostId") OR
                   (f."userBId" = $1 AND f."userAId" = e."hostId")
                 )
            )
          )
        ORDER BY e."startAt" ASC`,
      [user.id]
    );

    if (events.length === 0) return withCors(NextResponse.json([]));

    const eventIds = events.map((e) => e.id);
    const { rows: joins } = await query(
      `SELECT "eventId", "userId" FROM "EventJoin" WHERE "eventId" = ANY($1::text[])`,
      [eventIds]
    );
    const joinsByEvent = new Map();
    for (const j of joins) {
      if (!joinsByEvent.has(j.eventId)) joinsByEvent.set(j.eventId, []);
      joinsByEvent.get(j.eventId).push(j.userId);
    }

    const shaped = events.map((e) => {
      const joinedIds = joinsByEvent.get(e.id) ?? [];
      const youIn = joinedIds.includes(user.id);
      const { hour, dayOffset } = toBoardFields(e.startAt, now);
      const isYours = e.hostId === user.id;

      return {
        id: e.id,
        who: isYours ? "you" : e.hostId,
        isYours,
        emoji: e.emoji,
        what: e.title,
        place: e.location,
        note: e.note || "",
        hour,
        dur: Number(e.durationHours),
        dayOffset,
        day: dayOffset > 0 ? dayLabelFor(dayOffset) : undefined,
        spots: e.spots,
        // joined excludes the viewer — the frontend tracks the viewer's own
        // join state separately (see youIn) and adds it back in when it
        // needs a total headcount.
        joined: joinedIds.filter((id) => id !== user.id),
        youIn,
        dist: e.distance || undefined,
        postedAgo: postedAgo(e.createdAt, now)
      };
    });

    return withCors(NextResponse.json(shaped));
  } catch (err) {
    return jsonError(err);
  }
}

// POST /api/events   body from <Composer />: { emoji, what, place, note, dayOffset, hour, spots }
export async function POST(request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();

    const what = (body.what ?? "").trim();
    const emoji = (body.emoji ?? "✨").trim() || "✨";
    if (!what) {
      return withCors(NextResponse.json({ error: "what is required" }, { status: 400 }));
    }

    const place = (body.place ?? "").trim() || "somewhere good";
    const note = (body.note ?? "").trim() || null;
    const spots = Math.max(0, parseInt(body.spots, 10) || 0);
    const dur = 1.5;
    const startAt = fromBoardFields(body.dayOffset, body.hour);

    const id = randomUUID();
    const { rows } = await query(
      `INSERT INTO "Event"
         (id, "hostId", emoji, title, location, note, "timeLabel", "startAt", visibility, status, spots, "durationHours")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'everyone', 'now', $9, $10)
       RETURNING *`,
      [id, user.id, emoji, what, place, note, what, startAt, spots, dur]
    );

    // Notify friends there's something new on the board.
    const { rows: friendRows } = await query(
      `SELECT CASE WHEN "userAId" = $1 THEN "userBId" ELSE "userAId" END AS id
         FROM "Friendship" WHERE status = 'accepted' AND $1 IN ("userAId", "userBId")`,
      [user.id]
    );
    for (const f of friendRows) {
      await query(
        `INSERT INTO "Ping" (id, "recipientId", "eventId", text, cta, read)
         VALUES ($1, $2, $3, $4, $5, false)`,
        [randomUUID(), f.id, id, `${user.firstName.toLowerCase()} posted ${what} ${emoji}`, "i'm in"]
      );
    }

    const e = rows[0];
    const { hour, dayOffset } = toBoardFields(e.startAt);
    return withCors(
      NextResponse.json(
        {
          id: e.id,
          who: "you",
          isYours: true,
          emoji: e.emoji,
          what: e.title,
          place: e.location,
          note: e.note || "",
          hour,
          dur: Number(e.durationHours),
          dayOffset,
          day: dayOffset > 0 ? dayLabelFor(dayOffset) : undefined,
          spots: e.spots,
          joined: [],
          youIn: true,
          postedAgo: "posted just now"
        },
        { status: 201 }
      )
    );
  } catch (err) {
    return jsonError(err);
  }
}
