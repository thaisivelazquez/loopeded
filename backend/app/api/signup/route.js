// ====================================================
// SAVE TO: backend/app/api/signup/route.js
// ====================================================
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query } from "../../../lib/db";
import { withCors, corsPreflight } from "../../../lib/format";
import { notifyUser } from "../../../lib/notify";

export async function OPTIONS() {
  return corsPreflight();
}

const WELCOME_TEXT =
  "welcome to looped 👋 quick tour: on 'today' you post a sidequest (what/where/when) and friends " +
  "join with one tap — the board shows what's happening now and what's coming up this week. under " +
  "'friends' you'll find everyone you're looped with, plus a ring view — the inner ring is friends " +
  "out or about to be (something starting within the hour), the outer ring is friends who are free " +
  "right now. invite people by phone number, or link contacts to search by name. this 'pings' tab is " +
  "your notifications — new sidequests from friends, join requests, reminders before things start, " +
  "and heads-ups if something's cancelled. 'you' has your bio, stats, and settings. have fun out there 🎉";

// POST /api/signup   body from <Onboarding />: { firstName, lastName, phone }
// v1's onboarding only requires a first name and phone (lastName is
// optional there — obLast can be blank), so lastName is no longer required
// here. Sets the userId cookie every other route's requireCurrentUser()
// depends on. SameSite is "none" + Secure because the frontend is a
// different origin (Vite dev server / separately hosted SPA) — "lax" only
// works for same-site requests.
export async function POST(request) {
  const body = await request.json();
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  const phone = (body.phone ?? "").trim();

  if (!firstName || !phone) {
    return withCors(NextResponse.json({ error: "firstName and phone are required" }, { status: 400 }));
  }

  const { rows: existing } = await query(`SELECT id FROM "User" WHERE phone = $1`, [phone]);

  let userId;
  if (existing[0]) {
    userId = existing[0].id;
  } else {
    userId = randomUUID();
    await query(
      `INSERT INTO "User" (id, "firstName", "lastName", phone, "phoneVerified")
       VALUES ($1, $2, $3, $4, true)`,
      [userId, firstName, lastName || null, phone]
    );
    await notifyUser({ recipientId: userId, text: WELCOME_TEXT });
  }

  const res = withCors(NextResponse.json({ userId }));
  res.cookies.set("userId", userId, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/"
  });
  return res;
}