import { NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { requireCurrentUser } from "../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../lib/format";

export async function OPTIONS() {
  return corsPreflight();
}

// GET /api/pings
// Shaped for <Pings />: id, who (host userId, for the avatar/initial), text,
// when, unread, action (cta label or null), going (viewer already joined
// the linked event, so the button reads "going" instead of showing an
// action). Newest first, capped to the last 50 so this stays cheap.
export async function GET() {
  try {
    const user = await requireCurrentUser();

    const { rows } = await query(
      `SELECT p.id, p.text, p.cta, p.read, p."createdAt", p."eventId",
              e."hostId"
         FROM "Ping" p
         LEFT JOIN "Event" e ON e.id = p."eventId"
        WHERE p."recipientId" = $1
        ORDER BY p."createdAt" DESC
        LIMIT 50`,
      [user.id]
    );

    let joinedEventIds = new Set();
    const eventIds = rows.map((r) => r.eventId).filter(Boolean);
    if (eventIds.length) {
      const { rows: joins } = await query(
        `SELECT "eventId" FROM "EventJoin" WHERE "userId" = $1 AND "eventId" = ANY($2::text[])`,
        [user.id, eventIds]
      );
      joinedEventIds = new Set(joins.map((j) => j.eventId));
    }

    const shaped = rows.map((r) => ({
      id: r.id,
      who: r.hostId || null,
      actId: r.eventId || null,
      text: r.text,
      when: relativeTime(r.createdAt),
      unread: !r.read,
      action: r.cta || null,
      going: r.eventId ? joinedEventIds.has(r.eventId) : false
    }));

    return withCors(NextResponse.json(shaped));
  } catch (err) {
    return jsonError(err);
  }
}

function relativeTime(createdAt) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  return "a while ago";
}
