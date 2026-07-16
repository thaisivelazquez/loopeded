import { NextResponse } from "next/server";
import { twilioClient, VERIFY_SERVICE_SID } from "../../../../lib/twilio";
import { withCors, corsPreflight } from "../../../../lib/format";

export async function OPTIONS() {
  return corsPreflight();
}

// POST /api/verify/send   body: { phone: string }
// Fires right after step 1 (name + phone) in onboarding, before the account
// is actually created. Twilio Verify handles the code generation, storage,
// expiry (10 min default), and rate limiting for you — nothing is stored in
// our own DB for this step.
export async function POST(request) {
  try {
    const body = await request.json();
    const phone = (body.phone ?? "").trim();
    if (!phone) {
      return withCors(NextResponse.json({ error: "phone is required" }, { status: 400 }));
    }

    await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });

    return withCors(NextResponse.json({ sent: true }));
  } catch (err) {
    // Twilio errors (bad number format, unverified trial number, etc.) come
    // back with a human-readable `message` — safe to forward as-is.
    console.error(err);
    return withCors(
      NextResponse.json({ error: err.message || "couldn't send that code" }, { status: 400 })
    );
  }
}