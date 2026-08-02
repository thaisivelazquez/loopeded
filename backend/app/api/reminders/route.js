// ====================================================
// SAVE TO: backend/app/api/reminders/route.js
// ====================================================
import { NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { notifyUsers } from "../../../lib/notify";
import { withCors, corsPreflight } from "../../../lib/format";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

// GET /api/reminders?token=CRON_SECRET
// Meant to be hit by an external scheduler (cron-job.org, Vercel Cron, a
// system crontab curling this URL, etc.) every ~10 minutes. Not tied to any
// one user's session — protected by a shared secret instead of a cookie.
//
// Sends two kinds of hour-before reminders, each gated by a "sentAt" column
// on Event so a slightly-overlapping cron window never double-sends:
//
// 1. "starting soon" — to the host + everyone who already joined, for any
//    event starting in the next ~hour (remindersSentAt). Everyone in this
//    list already has access (they're the host or already in), so no
//    visibility check is needed here.
// 2. "last call" — to friends of the host who *haven't* joined yet, only
//    for spot-capped events ("invites") that still have room, starting in
//    the next ~hour (lastCallSentAt). Carries the same "i'm in" cta as a
//    normal post so tapping it joins directly. Scoped by the event's
//    visibility exactly like a normal "friend posted" notification: only
//    friends who could actually see this event on their board get pinged —
//    everyone/outer goes to all accepted friends, inner goes only to the
//    friends the host has placed in their inner circle.
//
// Window is 50-70 minutes out rather than exactly 60 to tolerate cron jitter
// without needing sub-minute scheduling.
export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token");

  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return withCors(
      NextResponse.json(
        { error: "unauthorized" },
        { status: 401 }
      ),
      request
    );
  }

  const soonCount = await sendStartingSoonReminders();
  const lastCallCount = await sendLastCallReminders();

  return withCors(
    NextResponse.json({
      ok: true,
      soonCount,
      lastCallCount,
    }),
    request
  );
}

async function sendStartingSoonReminders() {
  const { rows: events } = await query(
    `SELECT id, "hostId", title
       FROM "Event"
      WHERE "startAt" BETWEEN NOW() + INTERVAL '50 minutes' AND NOW() + INTERVAL '70 minutes'
        AND "remindersSentAt" IS NULL`
  );

  let count = 0;
  for (const event of events) {
    const { rows: joinRows } = await query(
      `SELECT "userId" FROM "EventJoin" WHERE "eventId" = $1`,
      [event.id]
    );
    const recipients = [...new Set([event.hostId, ...joinRows.map((r) => r.userId)])];

    await notifyUsers(recipients, {
      eventId: event.id,
      text: `heads up — ${event.title} starts in about an hour`
    });
    await query(`UPDATE "Event" SET "remindersSentAt" = NOW() WHERE id = $1`, [event.id]);
    count += recipients.length;
  }
  return count;
}

async function sendLastCallReminders() {
  const { rows: events } = await query(
    `SELECT e.id, e."hostId", e.title, e.visibility,
            (SELECT COUNT(*)::int FROM "EventJoin" WHERE "eventId" = e.id) AS "joinCount"
       FROM "Event" e
      WHERE e."startAt" BETWEEN NOW() + INTERVAL '50 minutes' AND NOW() + INTERVAL '70 minutes'
        AND e."lastCallSentAt" IS NULL
        AND e.spots > 0`
  );

  let count = 0;
  for (const event of events) {
    if (event.joinCount >= event.spots) {
      // full — nothing to invite people into, but still mark it sent so we
      // don't keep re-checking this event every cron tick
      await query(`UPDATE "Event" SET "lastCallSentAt" = NOW() WHERE id = $1`, [event.id]);
      continue;
    }

    // Same access rule as a normal "friend posted" notification: everyone/
    // outer visibility reaches any accepted friend, inner visibility only
    // reaches friends the host has placed in their inner circle. Reading
    // "circleA"/"circleB" from the host's side, same as the board's
    // visibility filter and the initial post notification.
    const { rows: friendRows } = await query(
      `SELECT
         CASE WHEN "userAId" = $1 THEN "userBId" ELSE "userAId" END AS id,
         CASE WHEN "userAId" = $1 THEN "circleA" ELSE "circleB" END AS circle
         FROM "Friendship" WHERE status = 'accepted' AND $1 IN ("userAId", "userBId")`,
      [event.hostId]
    );
    const withAccess =
      event.visibility === "inner" ? friendRows.filter((f) => f.circle === "inner") : friendRows;

    const { rows: joinRows } = await query(
      `SELECT "userId" FROM "EventJoin" WHERE "eventId" = $1`,
      [event.id]
    );
    const alreadyJoined = new Set(joinRows.map((r) => r.userId));
    const recipients = withAccess.map((f) => f.id).filter((id) => !alreadyJoined.has(id));

    if (recipients.length) {
      await notifyUsers(recipients, {
        eventId: event.id,
        text: `last call — spot open for ${event.title} in about an hour`,
        cta: "i'm in"
      });
      count += recipients.length;
    }
    await query(`UPDATE "Event" SET "lastCallSentAt" = NOW() WHERE id = $1`, [event.id]);
  }
  return count;
}