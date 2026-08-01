import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requireCurrentUser } from "../../../../lib/auth";
import { jsonError, withCors, corsPreflight } from "../../../../lib/format";

export async function OPTIONS(request) {
  return corsPreflight(request);
}

// GET /api/pings/unread-count — cheap endpoint for the <NavBar /> dot.
export async function GET(request) {
  try {
    const user = await requireCurrentUser(request);
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count FROM "Ping" WHERE "recipientId" = $1 AND read = false`,
      [user.id]
    );
    return withCors(NextResponse.json({ count: rows[0].count }));
  } catch (err) {
    return jsonError(err);
  }
}