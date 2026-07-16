import { NextResponse } from "next/server";
import { withCors, corsPreflight } from "../../../lib/format";

export async function OPTIONS() {
  return corsPreflight();
}

// POST /api/logout
// Clears the "userId" cookie set at signup. JS on the frontend can't clear
// an httpOnly cookie itself, so <Profile />'s "reset app" action needs a
// real endpoint to call instead of just wiping localStorage like the mock
// version did.
export async function POST() {
  const res = withCors(NextResponse.json({ ok: true }));
  res.cookies.set("userId", "", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 0
  });
  return res;
}
