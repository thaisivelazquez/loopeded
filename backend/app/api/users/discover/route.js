import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { requireCurrentUser } from "../../../../lib/auth";
import { colorForId } from "../../../../lib/colors";
import { jsonError, withCors, corsPreflight } from "../../../../lib/format";

export async function OPTIONS() {
  return corsPreflight();
}

// GET /api/users/discover
// Backs onboarding step 2's "add a few friends to start" picker. The mock
// hardcoded 4 sample friends there; since the schema has no
// suggestion/mutual-friends logic, this just returns up to 4 other users
// who aren't already a friend or a pending request. Swap in something
// smarter (contacts match, mutuals, etc.) later — every route only cares
// that this returns the same {id, first, last, bio, color} shape as
// /api/friends.
export async function GET() {
  try {
    const user = await requireCurrentUser();
    const { rows } = await query(
      `SELECT id, "firstName", "lastName", bio
         FROM "User"
        WHERE id != $1
          AND id NOT IN (
            SELECT CASE WHEN "userAId" = $1 THEN "userBId" ELSE "userAId" END
              FROM "Friendship" WHERE $1 IN ("userAId", "userBId")
          )
        ORDER BY "firstName" ASC
        LIMIT 4`,
      [user.id]
    );

    const shaped = rows.map((r) => ({
      id: r.id,
      first: r.firstName,
      last: r.lastName,
      bio: r.bio || "no bio yet",
      color: colorForId(r.id)
    }));

    return withCors(NextResponse.json(shaped));
  } catch (err) {
    return jsonError(err);
  }
}
