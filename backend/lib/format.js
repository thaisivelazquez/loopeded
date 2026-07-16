import { NextResponse } from "next/server";
import { HttpError } from "./auth";

// "kat" + "tran" -> "kat tran" (raw first/last; the frontend's own fmtName()
// in app/src/lib/data.js turns this into "kat t." for display, so the API
// hands back the raw pieces instead of a pre-formatted string).
export function displayName(firstName, lastName) {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
}

export function jsonError(err) {
  if (err instanceof HttpError) {
    return withCors(NextResponse.json({ error: err.message }, { status: err.status }));
  }
  console.error(err);
  return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
}

// The v1 frontend (Vite, its own dev port) is a different origin from this
// Next.js API, and every route relies on the httpOnly "userId" cookie, so
// requests need `credentials: "include"` on the client and an explicit
// CORS allow-list (with credentials) on the server — "*" won't work once
// credentials are involved. Set FRONTEND_ORIGIN in .env.local, e.g.
// FRONTEND_ORIGIN=http://localhost:5173
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

export function withCors(res) {
  res.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export function corsPreflight() {
  return withCors(new NextResponse(null, { status: 204 }));
}
