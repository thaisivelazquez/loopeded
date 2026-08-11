import { NextResponse } from "next/server";
import { twilioClient, VERIFY_SERVICE_SID } from "../../../../lib/twilio";
import { withCors, corsPreflight } from "../../../../lib/format";
import { query } from "../../../../lib/db";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

// POST /api/verify/check   body: { phone: string, code: string }
// Onboarding now asks for the phone number first, verifies it, and only
// THEN decides what happens next:
//   - if a User already exists for this (now-verified) phone, this check
//     IS the login — we set the session cookie right here and hand back
//     their account, so the frontend can skip straight to "today" instead
//     of re-asking a returning person for their name
//   - if no User exists yet, nothing is created here (there's no name to
//     create it with) — the frontend moves on to the name step, and THAT
//     is what actually creates the account via POST /api/signup
export async function POST(request) {
  try {
    const body = await request.json();
    const phone = (body.phone ?? "").trim();
    const code = (body.code ?? "").trim();
    if (!phone || !code) {
      return withCors(NextResponse.json({ error: "phone and code are required" }, { status: 400 }));
    }

    const check = await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });

    const approved = check.status === "approved";
    if (!approved) {
      // check.status is "pending" if the code was wrong
      return withCors(NextResponse.json({ approved: false }));
    }

    const { rows } = await query(
      `SELECT id, "firstName", "lastName" FROM "User" WHERE phone = $1`,
      [phone]
    );
    const existing = rows[0];

    if (!existing) {
      return withCors(NextResponse.json({ approved: true, accountExists: false }));
    }

    const res = withCors(
      NextResponse.json({
        approved: true,
        accountExists: true,
        userId: existing.id,
        firstName: existing.firstName,
        lastName: existing.lastName
      })
    );
    res.cookies.set("userId", existing.id, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/"
    });
    return res;
  } catch (err) {
    // Twilio throws (rather than returning pending) once the code has
    // expired or too many attempts have been made — surface that as a
    // normal "not approved" result rather than a 500.
    console.error(err);
    return withCors(NextResponse.json({ approved: false, error: err.message || "that code didn't work" }));
  }
}