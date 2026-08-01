// ====================================================
// SAVE TO: backend/app/api/events/[id]/route.js
// ====================================================
import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requireCurrentUser } from "../../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../../lib/format";
import { notifyUsers } from "../../../../lib/notify";
import { toBoardFields, fromBoardFields } from "../../../../lib/time";
import { dayLabelFor } from "../../../../lib/dayLabel";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

const VALID_VISIBILITY = new Set(["everyone", "inner", "outer"]);

// PATCH /api/events/:id
// Backs the "edit" button on your own posts in <EventDetail /> / <Composer />.
// Host-only. Accepts the same shape the composer posts on create:
// { emoji, what, place, note, dayOffset, hour, spots, visibility }.
// Anyone already joined gets a light heads-up ping that the plan changed.
export async function PATCH(request, { params }) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = params;
    const body = await request.json();

    const { rows: existingRows } = await query(`SELECT * FROM "Event" WHERE id = $1`, [id]);
    const existing = existingRows[0];
    if (!existing) {
      return withCors(NextResponse.json({ error: "not found" }, { status: 404 }));
    }
    if (existing.hostId !== user.id) {
      return withCors(NextResponse.json({ error: "only the host can edit this" }, { status: 403 }));
    }

    const what = (body.what ?? existing.title).trim() || existing.title;
    const emoji = (body.emoji ?? existing.emoji).trim() || existing.emoji;
    const place = (body.place ?? existing.location).trim() || existing.location;
    const note = body.note != null ? (body.note.trim() || null) : existing.note;
    const spots = body.spots != null ? Math.max(0, parseInt(body.spots, 10) || 0) : existing.spots;
    const visibility = VALID_VISIBILITY.has(body.visibility) ? body.visibility : existing.visibility;

    const startAt =
      body.dayOffset != null && body.hour != null
        ? fromBoardFields(body.dayOffset, body.hour)
        : existing.startAt;

    const { rows } = await query(
      `UPDATE "Event"
          SET emoji = $1, title = $2, location = $3, note = $4,
              "timeLabel" = $2, "startAt" = $5, spots = $6, visibility = $7
        WHERE id = $8
        RETURNING *`,
      [emoji, what, place, note, startAt, spots, visibility, id]
    );
    const e = rows[0];

    const { rows: joinRows } = await query(`SELECT "userId" FROM "EventJoin" WHERE "eventId" = $1`, [id]);
    const joinedIds = joinRows.map((r) => r.userId);
    if (joinedIds.length) {
      await notifyUsers(joinedIds, {
        eventId: id,
        text: `${user.firstName.toLowerCase()} updated the details for ${what} ${emoji}`
      });
    }

    const { hour, dayOffset } = toBoardFields(e.startAt);
    return withCors(
      NextResponse.json({
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
        visibility: e.visibility
      })
    );
  } catch (err) {
    return jsonError(err);
  }
}

// DELETE /api/events/:id
// Backs <EventDetail />'s "cancel" / "call it off" action, and the cancel
// button on your own board cards. Host-only; also clears joins and any
// pings that reference the event so nothing dangles. Anyone who had joined
// gets a cancellation notification (ping + SMS) before the row disappears.
export async function DELETE(request, { params }) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = params;

    const { rows } = await query(`SELECT "hostId", title FROM "Event" WHERE id = $1`, [id]);
    const event = rows[0];
    if (!event) {
      return withCors(NextResponse.json({ error: "not found" }, { status: 404 }));
    }
    if (event.hostId !== user.id) {
      return withCors(NextResponse.json({ error: "only the host can cancel this" }, { status: 403 }));
    }

    const { rows: joinRows } = await query(`SELECT "userId" FROM "EventJoin" WHERE "eventId" = $1`, [id]);
    const joinedIds = joinRows.map((r) => r.userId);

    await query(`DELETE FROM "Ping" WHERE "eventId" = $1`, [id]);
    await query(`DELETE FROM "EventJoin" WHERE "eventId" = $1`, [id]);
    await query(`DELETE FROM "Event" WHERE id = $1`, [id]);

    if (joinedIds.length) {
      // eventId is intentionally omitted (null) — the Event row is already
      // gone by the time this notification is read, so it can't link back.
      await notifyUsers(joinedIds, {
        text: `${event.title} was called off — ${user.firstName.toLowerCase()} cancelled it`
      });
    }

    return withCors(NextResponse.json({ ok: true }));
  } catch (err) {
    return jsonError(err);
  }
}