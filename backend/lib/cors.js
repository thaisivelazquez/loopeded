import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "https://looped.up.railway.app",
  "http://localhost:5173",
]);

function getAllowedOrigin(request) {
  const requestOrigin = request?.headers?.get("origin");

  if (requestOrigin && ALLOWED_ORIGINS.has(requestOrigin)) {
    return requestOrigin;
  }

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