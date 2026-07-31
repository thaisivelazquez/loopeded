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
    return withCors(
      NextResponse.json(
        { error: err.message },
        { status: err.status }
      )
    );
  }

  console.error(err);

  return withCors(
    NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  );
}

// Frontend origins allowed to call this API.
// Railway production frontend + local development.
const ALLOWED_ORIGINS = new Set([
  "https://looped.up.railway.app",
  "http://localhost:5173",
]);

function getAllowedOrigin(request) {
  const requestOrigin = request?.headers?.get("origin");

  if (requestOrigin && ALLOWED_ORIGINS.has(requestOrigin)) {
    return requestOrigin;
  }

  // Fallback for server-side calls or missing origin.
  return "https://looped.up.railway.app";
}

export function withCors(res, request = null) {
  res.headers.set(
    "Access-Control-Allow-Origin",
    getAllowedOrigin(request)
  );

  res.headers.set(
    "Access-Control-Allow-Credentials",
    "true"
  );

  res.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS"
  );

  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  return res;
}

export function corsPreflight(request) {
  return withCors(
    new NextResponse(null, { status: 204 }),
    request
  );
}