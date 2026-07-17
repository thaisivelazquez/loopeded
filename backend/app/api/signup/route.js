import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { query } from "../../../lib/db";
import { withCors, corsPreflight } from "../../../lib/format";
import { notifyUser } from "../../../lib/notify";

export async function OPTIONS() {
  return corsPreflight();
}

const WELCOME_TEXT =
  "welcome to looped 👋 quick tour: on 'today' you post a sidequest (what/where/when) and friends join with one tap — the board shows what's happening now and what's coming up this week.";

export async function POST(request) {
  try {
    const body = await request.json();

    const firstName = (body.firstName ?? "").trim();
    const lastName = (body.lastName ?? "").trim();
    const phone = (body.phone ?? "").trim();

    if (!firstName || !phone) {
      return withCors(
        NextResponse.json(
          { error: "firstName and phone are required" },
          { status: 400 }
        )
      );
    }

    const { rows: existing } = await query(
      `SELECT id FROM "User" WHERE phone = $1`,
      [phone]
    );

    let userId;

    if (existing[0]) {
      userId = existing[0].id;
    } else {
      userId = randomUUID();

      await query(
        `INSERT INTO "User"
        (id, "firstName", "lastName", phone, "phoneVerified")
        VALUES ($1, $2, $3, $4, true)`,
        [
          userId,
          firstName,
          lastName || null,
          phone
        ]
      );

      await notifyUser({
        recipientId: userId,
        text: WELCOME_TEXT
      });
    }

    const res = withCors(
      NextResponse.json({ userId })
    );

    res.cookies.set("userId", userId, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/"
    });

    return res;

  } catch (err) {
    console.error("SIGNUP ERROR:", err);

    return withCors(
      NextResponse.json(
        {
          error: err.message || "signup failed"
        },
        {
          status: 500
        }
      )
    );
  }
}