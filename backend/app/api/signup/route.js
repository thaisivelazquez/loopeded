import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query } from "../../../lib/db";
import { withCors, corsPreflight } from "../../../lib/format";

export async function OPTIONS() {
  return corsPreflight();
}

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
       VALUES ($1, $2, $3, $4, false)`,
      [userId, firstName, lastName || null, phone]
    );
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
