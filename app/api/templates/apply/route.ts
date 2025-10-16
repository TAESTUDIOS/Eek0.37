// app/api/templates/apply/route.ts
// Apply a template to a specific date by creating appointments

import { NextResponse } from "next/server";
import type { Appointment } from "@/lib/types";
import { uid } from "@/lib/id";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

function neonAvailable() {
  return Boolean(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
}

async function ensureAppointmentsTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    start TIME NOT NULL,
    duration_min INTEGER NOT NULL,
    notes TEXT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS remind_1h BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS remind_30m BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS remind_10m BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS remind_at_start BOOLEAN NOT NULL DEFAULT FALSE`;
}

async function ensureTemplatesTable() {
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

// POST - Apply template to a date
export async function POST(req: Request) {
  try {
    if (!neonAvailable()) {
      return NextResponse.json({ 
        ok: false, 
        error: "Database not configured" 
      }, { status: 503 });
    }

    const body = await req.json();
    const { templateId, date } = body;

    if (!templateId || !date) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required fields: templateId and date" 
      }, { status: 400 });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ 
        ok: false, 
        error: "Invalid date format. Use YYYY-MM-DD" 
      }, { status: 400 });
    }

    await ensureTemplatesTable();
    await ensureAppointmentsTable();
    const sql = getDb();

    // Fetch the template
    const templateRows = await sql`
      SELECT id, name, tasks 
      FROM schedule_templates 
      WHERE id = ${templateId}
    `;

    if (templateRows.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: "Template not found" 
      }, { status: 404 });
    }

    const template = templateRows[0];
    const tasks = Array.isArray(template.tasks) ? template.tasks : [];

    if (tasks.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: "Template has no tasks" 
      }, { status: 400 });
    }

    // Create appointments from template tasks
    const createdAppointments: Appointment[] = [];

    for (const task of tasks) {
      const appointment: Appointment = {
        id: uid("appt"),
        title: task.title,
        date,
        start: task.start,
        durationMin: task.durationMin,
        notes: task.notes,
        remind1h: Boolean(task.remind1h),
        remind30m: Boolean(task.remind30m),
        remind10m: Boolean(task.remind10m),
        remindAtStart: Boolean(task.remindAtStart),
      };

      await sql`
        INSERT INTO appointments (
          id, title, date, start, duration_min, notes, 
          remind_1h, remind_30m, remind_10m, remind_at_start
        )
        VALUES (
          ${appointment.id}, 
          ${appointment.title}, 
          ${appointment.date}, 
          ${appointment.start}, 
          ${appointment.durationMin}, 
          ${appointment.notes || null},
          ${appointment.remind1h || false}, 
          ${appointment.remind30m || false}, 
          ${appointment.remind10m || false}, 
          ${appointment.remindAtStart || false}
        )
      `;

      createdAppointments.push(appointment);
    }

    return NextResponse.json({ 
      ok: true, 
      message: `Applied template "${template.name}" to ${date}`,
      count: createdAppointments.length,
      appointments: createdAppointments
    });
  } catch (e: any) {
    console.error("POST /api/templates/apply error:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Failed to apply template" 
    }, { status: 500 });
  }
}
