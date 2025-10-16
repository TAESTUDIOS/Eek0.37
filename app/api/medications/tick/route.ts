// app/api/medications/tick/route.ts
// Secure dispatcher to trigger due medication reminders.
// Header required: X-Scheduler-Token: <token> (SCHEDULER_TOKEN env)

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { dueMedicationIds, hhmmInTz } from "@/lib/meds";

function nowInTz(_tz: string) {
  return new Date();
}

export async function GET(req: Request) {
  try {
    const tokenHeader = process.env.SCHEDULER_TOKEN || "";
    const sent = (req.headers.get("x-scheduler-token") || "").trim();
    if (!tokenHeader || !sent || sent !== tokenHeader) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const tz = process.env.SCHEDULER_TZ || "UTC";
    const now = nowInTz(tz);

    // Load medications from DB
    let meds: Array<any> = [];
    try {
      const sql = getDb();
      const rows = await sql`SELECT id, name, webhook, times, repeat, days_of_week, day_of_month, start_date_iso, active, emoji_path, card_text, buttons FROM medications`;
      meds = rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        webhook: r.webhook,
        times: Array.isArray(r.times) ? r.times : [],
        repeat: r.repeat,
        daysOfWeek: r.days_of_week ?? undefined,
        dayOfMonth: r.day_of_month ?? undefined,
        startDateIso: r.start_date_iso ?? undefined,
        active: r.active,
        emojiPath: r.emoji_path ?? undefined,
        cardText: r.card_text ?? undefined,
        buttons: Array.isArray(r.buttons) ? r.buttons : ["Taken", "Snooze", "Skip"],
      }));
    } catch {}

    const dueIds = dueMedicationIds(now, tz, meds);
    const hhmm = hhmmInTz(now, tz);

    const triggered: string[] = [];
    for (const id of dueIds) {
      const m = meds.find((x) => x.id === id);
      if (!m) continue;
      try {
        // Fire n8n webhook; n8n is responsible for injecting the reminder card
        if (m.webhook) {
          await fetch(m.webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              medicationId: m.id,
              name: m.name,
              timestamp: Date.now(),
              timeslot: hhmm,
              repeat: m.repeat,
            }),
          }).catch(() => {});
        }
        triggered.push(id);
      } catch {
        // continue others
      }
    }

    return NextResponse.json({ ok: true, due: dueIds, triggered, time: hhmm });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "scheduler error" }, { status: 500 });
  }
}
