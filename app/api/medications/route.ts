// app/api/medications/route.ts
// CRUD for medication configs using Neon Postgres. Mirrors rituals route style.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    webhook TEXT NOT NULL DEFAULT '',
    times JSONB NOT NULL DEFAULT '[]',
    repeat TEXT NOT NULL,
    days_of_week JSONB NULL,
    day_of_month INT NULL,
    start_date_iso TEXT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    emoji_path TEXT NULL,
    card_text TEXT NULL,
    buttons JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    const rows = await sql`SELECT id, name, webhook, times, repeat, days_of_week, day_of_month, start_date_iso, active, emoji_path, card_text, buttons FROM medications ORDER BY updated_at DESC`;
    const items = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      webhook: r.webhook,
      times: r.times ?? [],
      repeat: r.repeat,
      daysOfWeek: r.days_of_week ?? null,
      dayOfMonth: r.day_of_month ?? null,
      startDateIso: r.start_date_iso ?? null,
      active: r.active,
      emojiPath: r.emoji_path ?? null,
      cardText: r.card_text ?? null,
      buttons: r.buttons ?? [],
    }));
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    if (!body?.id || !body?.name || !Array.isArray(body?.times) || !body?.repeat) {
      return NextResponse.json({ ok: false, error: "id, name, times[], repeat required" }, { status: 400 });
    }
    await ensureTable();
    const sql = getDb();
    await sql`INSERT INTO medications (id, name, webhook, times, repeat, days_of_week, day_of_month, start_date_iso, active, emoji_path, card_text, buttons)
              VALUES (${body.id}, ${body.name}, ${body.webhook || ''}, ${JSON.stringify(body.times)}::jsonb, ${body.repeat}, ${body.daysOfWeek ? JSON.stringify(body.daysOfWeek) : null}::jsonb, ${body.dayOfMonth ?? null}, ${body.startDateIso ?? null}, ${body.active ?? true}, ${body.emojiPath ?? null}, ${body.cardText ?? null}, ${JSON.stringify(body.buttons || [])}::jsonb)
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                webhook = EXCLUDED.webhook,
                times = EXCLUDED.times,
                repeat = EXCLUDED.repeat,
                days_of_week = EXCLUDED.days_of_week,
                day_of_month = EXCLUDED.day_of_month,
                start_date_iso = EXCLUDED.start_date_iso,
                active = EXCLUDED.active,
                emoji_path = EXCLUDED.emoji_path,
                card_text = EXCLUDED.card_text,
                buttons = EXCLUDED.buttons,
                updated_at = NOW()`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    await ensureTable();
    const sql = getDb();
    await sql`DELETE FROM medications WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}
