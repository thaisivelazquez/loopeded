// ====================================================
// SAVE TO: backend/app/api/users/lookup/route.js
// ====================================================
import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { withCors, corsPreflight } from "../../../../lib/format";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

// POST /api/users/lookup   body: { phone: string }
// Used by onboarding step 1, right after the phone number is entered, to
// decide the next screen: if this number already has an account, skip
// straight to sending the verification code (no need to ask for a name
// again — "already on looped? we'll log you right in"); if it's new, go
// collect a name first, then send the code.
//
// Deliberately returns ONLY a boolean — never the account's name or any
// other detail — so this can't be used to look up who a number belongs to.
export async function POST(request) {
  try {
    const body = await request.json();
    const phone = (body.phone ?? "").trim();
    if (!phone) {
      return withCors(NextResponse.json({ error: "phone is required" }, { status: 400 }));
    }

    const { rows } = await query(`SELECT id FROM "User" WHERE phone = $1`, [phone]);
    return withCors(NextResponse.json({ exists: rows.length > 0 }));
  } catch (err) {
    console.error("phone lookup failed:", err);
    return withCors(NextResponse.json({ error: err.message || "lookup failed" }, { status: 500 }));
  }
}