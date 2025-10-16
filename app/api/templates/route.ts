// app/api/templates/route.ts
// CRUD for schedule templates with Neon Postgres

import { NextResponse } from "next/server";
import type { ScheduleTemplate } from "@/lib/types";
import { uid } from "@/lib/id";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

function neonAvailable() {
  return Boolean(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
}

async function ensureTable() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS schedule_templates (
      id TEXT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

// GET - List all templates
export async function GET(req: Request) {
  try {
    if (!neonAvailable()) {
      return NextResponse.json({ 
        ok: false, 
        error: "Database not configured" 
      }, { status: 503 });
    }

    await ensureTable();
    const sql = getDb();
    
    const rows = await sql`
      SELECT 
        id, 
        name, 
        description, 
        tasks, 
        EXTRACT(EPOCH FROM created_at) * 1000 AS created_at,
        EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at
      FROM schedule_templates 
      ORDER BY created_at DESC
    `;

    const templates: ScheduleTemplate[] = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || undefined,
      tasks: Array.isArray(r.tasks) ? r.tasks : [],
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
    }));

    return NextResponse.json({ ok: true, templates });
  } catch (e: any) {
    console.error("GET /api/templates error:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Failed to list templates" 
    }, { status: 500 });
  }
}

// POST - Create or update a template
export async function POST(req: Request) {
  try {
    if (!neonAvailable()) {
      return NextResponse.json({ 
        ok: false, 
        error: "Database not configured" 
      }, { status: 503 });
    }

    const body = await req.json();
    const { id, name, description, tasks } = body;

    if (!name || !Array.isArray(tasks)) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required fields: name and tasks" 
      }, { status: 400 });
    }

    const templateId = id || uid("tpl");
    const now = Date.now();

    await ensureTable();
    const sql = getDb();

    await sql`
      INSERT INTO schedule_templates (id, name, description, tasks)
      VALUES (
        ${templateId}, 
        ${name}, 
        ${description || null}, 
        ${JSON.stringify(tasks)}::jsonb
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        tasks = EXCLUDED.tasks,
        updated_at = NOW()
    `;

    const template: ScheduleTemplate = {
      id: templateId,
      name,
      description,
      tasks,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ ok: true, template });
  } catch (e: any) {
    console.error("POST /api/templates error:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Failed to save template" 
    }, { status: 500 });
  }
}

// DELETE - Remove a template
export async function DELETE(req: Request) {
  try {
    if (!neonAvailable()) {
      return NextResponse.json({ 
        ok: false, 
        error: "Database not configured" 
      }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing template id" 
      }, { status: 400 });
    }

    await ensureTable();
    const sql = getDb();
    await sql`DELETE FROM schedule_templates WHERE id = ${id}`;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/templates error:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Failed to delete template" 
    }, { status: 500 });
  }
}
