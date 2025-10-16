// app/api/bots/route.ts
// CRUD API for bot profiles

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import type { BotProfile } from "@/lib/types";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const rows = await sql`
      SELECT * FROM bots ORDER BY created_at DESC
    `;
    const bots: BotProfile[] = rows.map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      avatar: r.avatar ? String(r.avatar) : undefined,
      description: String(r.description || ""),
      webhook: String(r.webhook),
      expertise: r.expertise ? String(r.expertise) : undefined,
      active: Boolean(r.active),
      createdAt: Number(r.created_at) || Date.now(),
      updatedAt: Number(r.updated_at) || Date.now(),
    }));
    return NextResponse.json({ ok: true, bots });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load bots" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bot: BotProfile = body;
    await sql`
      INSERT INTO bots (id, name, avatar, description, webhook, expertise, active, created_at, updated_at)
      VALUES (${bot.id}, ${bot.name}, ${bot.avatar || null}, ${bot.description}, ${bot.webhook}, ${bot.expertise || null}, ${bot.active}, ${bot.createdAt}, ${bot.updatedAt})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        avatar = EXCLUDED.avatar,
        description = EXCLUDED.description,
        webhook = EXCLUDED.webhook,
        expertise = EXCLUDED.expertise,
        active = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at
    `;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to save bot" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const bot: BotProfile = body;
    await sql`
      UPDATE bots SET
        name = ${bot.name},
        avatar = ${bot.avatar || null},
        description = ${bot.description},
        webhook = ${bot.webhook},
        expertise = ${bot.expertise || null},
        active = ${bot.active},
        updated_at = ${bot.updatedAt}
      WHERE id = ${bot.id}
    `;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to update bot" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    await sql`DELETE FROM bots WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to delete bot" }, { status: 500 });
  }
}
