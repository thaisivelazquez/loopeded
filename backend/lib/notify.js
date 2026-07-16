import { randomUUID } from "crypto";
import { query } from "./db";
import { twilioClient } from "./twilio";

// Requires TWILIO_FROM_NUMBER in .env.local — a Twilio phone number capable
// of sending SMS (separate from TWILIO_VERIFY_SERVICE_SID, which only
// handles OTP codes). Get one from the Twilio console under
// Phone Numbers > Manage > Active Numbers.
const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

// notifyUser: the one place every notification (ping + SMS) goes through.
// - Always writes a Ping row, so it shows up in the Pings tab regardless of
//   whether SMS succeeds.
// - Best-effort sends the same text as an SMS if the recipient has a
//   phoneVerified number and TWILIO_FROM_NUMBER is configured. SMS failures
//   are logged but never block the ping or bubble up to the caller — a
//   notification should never fail an event/join/cancel request.
export async function notifyUser({ recipientId, eventId = null, text, cta = null }) {
  await query(
    `INSERT INTO "Ping" (id, "recipientId", "eventId", text, cta, read)
     VALUES ($1, $2, $3, $4, $5, false)`,
    [randomUUID(), recipientId, eventId, text, cta]
  );

  if (!FROM_NUMBER) return;

  try {
    const { rows } = await query(
      `SELECT phone, "phoneVerified" FROM "User" WHERE id = $1`,
      [recipientId]
    );
    const recipient = rows[0];
    if (recipient?.phone && recipient.phoneVerified) {
      await twilioClient.messages.create({ to: recipient.phone, from: FROM_NUMBER, body: text });
    }
  } catch (err) {
    console.error("SMS notify failed for", recipientId, err);
  }
}

// Same as notifyUser, but for a batch of recipients — used by the reminders
// cron and the "friend posted" fan-out, so one slow/failed SMS doesn't hold
// up the rest.
export async function notifyUsers(recipientIds, { eventId = null, text, cta = null }) {
  await Promise.all(
    recipientIds.map((recipientId) => notifyUser({ recipientId, eventId, text, cta }))
  );
}