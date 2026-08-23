// ====================================================
// SAVE TO: backend/app/api/events/public/route.js
// ====================================================
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query } from "../../../../lib/db";
import { requireCurrentUser } from "../../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../../lib/format";
import { toBoardFields, fromBoardFields } from "../../../../lib/time";
import { dayLabelFor } from "../../../../lib/dayLabel";
import { notifyUsers } from "../../../../lib/notify";
import { geocodeAddress } from "../../../../lib/geocode";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

// POST /api/events/public   body from the Public tab's composer:
// { emoji, what, place, note, dayOffset, hour, endHour, spots }
//
// This is the ONLY way an event's visibility ends up "everyone" — it's
// hard-coded below and never read from the request body. Regular
// POST /api/events (the normal composer) rejects "everyone" outright (see
// its VALID_VISIBILITY set), so there's no path to a public post except
// this one. Every user on the app gets pinged, not just friends — that's
// the whole point of "public."
export async function POST(request) {
  try {
    const user = await requireCurrentUser(request);
    const body = await request.json();

    const what = (body.what ?? "").trim();
    const emoji = (body.emoji ?? "✨").trim() || "✨";
    if (!what) {
      return withCors(NextResponse.json({ error: "what is required" }, { status: 400 }));
    }

    const place = (body.place ?? "").trim() || "somewhere good";
    const note = (body.note ?? "").trim() || null;
    const spots = Math.max(0, parseInt(body.spots, 10) || 0);

    // Same optional-end-time handling as the regular composer.
    const hourNum = Number(body.hour);
    let dur = null;
    if (body.endHour != null) {
      const endHourNum = Number(body.endHour);
      if (Number.isFinite(endHourNum) && endHourNum > hourNum) {
        dur = endHourNum - hourNum;
      } else {
        return withCors(NextResponse.json({ error: "end time must be after the start time" }, { status: 400 }));
      }
    }
    const startAt = fromBoardFields(body.dayOffset, body.hour);
    const coords = await geocodeAddress(place);

    const id = randomUUID();
    const { rows } = await query(
      `INSERT INTO "Event"
         (id, "hostId", emoji, title, location, note, "timeLabel", "startAt", visibility, status, spots, "durationHours", lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'everyone', 'now', $9, $10, $11, $12)
       RETURNING *`,
      [id, user.id, emoji, what, place, note, what, startAt, spots, dur, coords?.lat ?? null, coords?.lng ?? null]
    );

    // Invite literally everyone else on the app — this is what makes a
    // public post different from a normal one, which only pings friends.
    const { rows: everyoneElse } = await query(`SELECT id FROM "User" WHERE id != $1`, [user.id]);
    if (everyoneElse.length) {
      await notifyUsers(
        everyoneElse.map((u) => u.id),
        {
          eventId: id,
          text: `${user.firstName.toLowerCase()} posted a public event: ${what} ${emoji}`,
          cta: "i'm in"
        }
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
          dur: e.durationHours != null ? Number(e.durationHours) : null,
          dayOffset,
          day: dayOffset > 0 ? dayLabelFor(dayOffset) : undefined,
          spots: e.spots,
          visibility: e.visibility,
          lat: e.lat ?? undefined,
          lng: e.lng ?? undefined,
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