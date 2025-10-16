// app/api/medications/inject/route.ts
// Secure endpoint for n8n to inject a medication ritual message into chat.
// Auth: Authorization: Bearer <N8N_WEBHOOK_TOKEN>
// Idempotency: optional Idempotency-Key header; duplicates are ignored.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { uid } from "@/lib/id";

async function ensureMessagesTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    ritual_id TEXT,
    buttons JSONB,
    metadata JSONB,
    timestamp_ms BIGINT NOT NULL
  )`;
}

async function ensureIdempotencyTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export async function POST(req: Request) {
  try {
    // Auth: allow either Bearer <N8N_WEBHOOK_TOKEN> or Basic <base64(user:pass)>
    const auth = req.headers.get("authorization") || "";
    const token = (process.env.N8N_WEBHOOK_TOKEN || "").trim();
    const basicUser = (process.env.N8N_BASIC_USER || "").trim();
    const basicPass = (process.env.N8N_BASIC_PASS || "").trim();

    let authorized = false;
    if (token && auth === `Bearer ${token}`) {
      authorized = true;
    } else if (auth.startsWith("Basic ")) {
      try {
        const raw = atob(auth.slice(6));
        const idx = raw.indexOf(":");
        const u = idx >= 0 ? raw.slice(0, idx) : raw;
        const p = idx >= 0 ? raw.slice(idx + 1) : "";
        // Accept explicit user/pass pair from env, or username == token with empty password
        if ((basicUser && basicPass && u === basicUser && p === basicPass) || (token && u === token && p === "")) {
          authorized = true;
        }
      } catch {}
    }
    if (!authorized) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const idemKey = (req.headers.get("idempotency-key") || "").trim();

    const body = await req.json().catch(() => ({} as any));
    const medicationId = String(body?.medicationId || body?.id || "").trim();
    const name = String(body?.name || "Medication").trim();
    const timeslot = String(body?.timeslot || body?.time || "").trim(); // e.g., "08:00"
    const text = typeof body?.text === "string" && body.text.trim()
      ? String(body.text)
      : (timeslot ? `Time to take ${name} (${timeslot}).` : `Time to take ${name}.`);
    const ritualId = String(body?.ritualId || "medication");
    const buttons = Array.isArray(body?.buttons) && body.buttons.length > 0
      ? body.buttons
      : ["Taken", "Snooze", "Skip"];

    // Idempotency check
    if (idemKey) {
      await ensureIdempotencyTable();
      const sqlIdem = getDb();
      try {
        await sqlIdem`INSERT INTO webhook_events (id) VALUES (${idemKey})`;
      } catch {
        // Duplicate -> already processed
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }

    // Persist ritual message
    const msg = {
      id: uid("m"),
      role: "ritual" as const,
      text,
      ritualId,
      buttons,
      timestamp: Date.now(),
      metadata: {
        demo: "medicationReminder",
        medicationId: medicationId || undefined,
        name,
        timeslot: timeslot || undefined,
      },
    };

    await ensureMessagesTable();
    const sql = getDb();
    await sql`INSERT INTO messages (id, role, text, ritual_id, buttons, metadata, timestamp_ms)
              VALUES (${msg.id}, ${msg.role}, ${msg.text}, ${msg.ritualId || null}, ${JSON.stringify(msg.buttons)}::jsonb, ${JSON.stringify(msg.metadata)}::jsonb, ${msg.timestamp})`;
    await sql`DELETE FROM messages WHERE id IN (
      SELECT id FROM messages ORDER BY timestamp_ms DESC OFFSET 100
    )`;

    return NextResponse.json({ ok: true, message: msg });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}
