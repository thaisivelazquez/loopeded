import { NextResponse } from "next/server";
import { twilioClient, VERIFY_SERVICE_SID } from "../../../../lib/twilio";
import { withCors, corsPreflight } from "../../../../lib/format";

export async function OPTIONS() {
  return corsPreflight();
}

// POST /api/verify/check   body: { phone: string, code: string }
// Frontend only calls POST /api/signup after this returns { approved: true }
// — see the updated signup route, which now marks phoneVerified true
// unconditionally since it's gated behind this check.
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

    // check.status is "approved" on success, "pending" if the code was wrong
    return withCors(NextResponse.json({ approved: check.status === "approved" }));
  } catch (err) {
    // Twilio throws (rather than returning pending) once the code has
    // expired or too many attempts have been made — surface that as a
    // normal "not approved" result rather than a 500.
    console.error(err);
    return withCors(NextResponse.json({ approved: false, error: err.message || "that code didn't work" }));
  }
}