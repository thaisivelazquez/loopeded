// ====================================================
// SAVE TO: backend/app/api/events/[id]/route.js
// ====================================================
import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requireCurrentUser } from "../../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../../lib/format";
import { notifyUsers } from "../../../../lib/notify";
import { toBoardFields, fromBoardFields, formatClock } from "../../../../lib/time";
import { dayLabelFor } from "../../../../lib/dayLabel";
import { geocodeAddress } from "../../../../lib/geocode";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

// Input validation only — "everyone" isn't accepted from a client here on
// purpose. An event only ever becomes public through POST /api/events/public;
// this just stops a regular edit from escalating a private event into one.
// An already-public event stays public across edits regardless (see below:
// falling through to existing.visibility, never forced back to private).
const VALID_VISIBILITY = new Set(["inner", "outer"]);

// PATCH /api/events/:id
// Backs the "edit" button on your own posts in <EventDetail /> / <Composer />.
// Host-only. Accepts the same shape the composer posts on create:
// { emoji, what, place, note, dayOffset, hour, spots, visibility }.
// Anyone already joined gets a ping, but only when it's a change they'd
// actually care about — location, time, or the note — not every edit (e.g.
// bumping the spot count or tweaking the title doesn't notify anyone).
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

    // endHour works the same as on create: omit/null it for an open-ended
    // event, or send an end after the start to set a duration. Not sent at
    // all (undefined) leaves the existing duration untouched.
    let dur = existing.durationHours;
    if (body.hour != null && "endHour" in body) {
      if (body.endHour == null) {
        dur = null;
      } else {
        const endHourNum = Number(body.endHour);
        const hourNum = Number(body.hour);
        if (Number.isFinite(endHourNum) && endHourNum > hourNum) {
          dur = endHourNum - hourNum;
        } else {
          return withCors(NextResponse.json({ error: "end time must be after the start time" }, { status: 400 }));
        }
      }
    }

    // Only re-geocode (a paid, non-free API call) when the place text
    // actually changed — otherwise keep the coordinates we already have.
    const placeChanged = place !== existing.location;
    const coords = placeChanged ? await geocodeAddress(place) : null;
    const lat = placeChanged ? coords?.lat ?? null : existing.lat;
    const lng = placeChanged ? coords?.lng ?? null : existing.lng;

    const { rows } = await query(
      `UPDATE "Event"
          SET emoji = $1, title = $2, location = $3, note = $4,
              "timeLabel" = $2, "startAt" = $5, spots = $6, visibility = $7,
              lat = $8, lng = $9, "durationHours" = $10
        WHERE id = $11
        RETURNING *`,
      [emoji, what, place, note, startAt, spots, visibility, lat, lng, dur, id]
    );
    const e = rows[0];

    const { rows: joinRows } = await query(`SELECT "userId" FROM "EventJoin" WHERE "eventId" = $1`, [id]);
    const joinedIds = joinRows.map((r) => r.userId);
    if (joinedIds.length) {
      // Only these four count as a "heads up" — a spots/visibility/title
      // tweak shouldn't ping everyone who's already going.
      const changes = [];
      if (place !== existing.location) {
        changes.push(`moved to ${place}`);
      }
      if (new Date(startAt).getTime() !== new Date(existing.startAt).getTime()) {
        changes.push(`time changed to ${formatClock(startAt)}`);
      }
      const existingDur = existing.durationHours != null ? Number(existing.durationHours) : null;
      const newDur = dur != null ? Number(dur) : null;
      if (newDur !== existingDur) {
        changes.push(newDur == null ? "removed the end time" : "changed the end time");
      }
      const noteChanged = (note || null) !== (existing.note || null);
      if (noteChanged) {
        if (!existing.note && note) changes.push("added a note");
        else if (existing.note && !note) changes.push("removed the note");
        else changes.push("updated the note");
      }

      if (changes.length) {
        await notifyUsers(joinedIds, {
          eventId: id,
          text: `${user.firstName.toLowerCase()} ${changes.join(", ")} for ${what} ${emoji}`
        });
      }
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
        dur: e.durationHours != null ? Number(e.durationHours) : null,
        dayOffset,
        day: dayOffset > 0 ? dayLabelFor(dayOffset) : undefined,
        spots: e.spots,
        visibility: e.visibility,
        lat: e.lat ?? undefined,
        lng: e.lng ?? undefined
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