import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, timeEntriesTable } from "@workspace/db";
import type { TimeInterval } from "@workspace/db";
import {
  CreateTimeEntryBody,
  GetTimeEntryParams,
  GetTimeEntryResponse,
  UpdateTimeEntryParams,
  UpdateTimeEntryBody,
  DeleteTimeEntryParams,
} from "@workspace/api-zod";
const router: IRouter = Router();

/** Convert a zod.coerce.date() result to "YYYY-MM-DD" (UTC). */
function toDateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse list query params manually – date strings arrive as plain strings, avoid zod.date() coercion issues. */
function parseListQuery(query: Record<string, unknown>): { employeeId?: number; dateFrom?: string; dateTo?: string } | null {
  const employeeId = query.employeeId !== undefined ? Number(query.employeeId) : undefined;
  if (employeeId !== undefined && isNaN(employeeId)) return null;
  const dateFrom = query.dateFrom !== undefined ? String(query.dateFrom) : undefined;
  if (dateFrom !== undefined && !DATE_RE.test(dateFrom)) return null;
  const dateTo = query.dateTo !== undefined ? String(query.dateTo) : undefined;
  if (dateTo !== undefined && !DATE_RE.test(dateTo)) return null;
  return { employeeId, dateFrom, dateTo };
}

function calcMinutes(intervals: TimeInterval[]): number {
  let total = 0;
  for (const iv of intervals) {
    const [ch, cm] = iv.comeTime.split(":").map(Number);
    const [gh, gm] = iv.goTime.split(":").map(Number);
    total += (gh * 60 + gm) - (ch * 60 + cm);
  }
  return Math.max(0, total);
}

function serializeEntry(row: typeof timeEntriesTable.$inferSelect) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    date: row.date,
    intervals: row.intervals as TimeInterval[],
    note: row.note ?? null,
    totalMinutes: row.totalMinutes,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/time-entries", async (req, res): Promise<void> => {
  const qp = parseListQuery(req.query as Record<string, unknown>);
  if (!qp) {
    res.status(400).json({ error: "Ungültige Abfrageparameter" });
    return;
  }
  const conditions = [];
  if (qp.employeeId !== undefined) conditions.push(eq(timeEntriesTable.employeeId, qp.employeeId));
  if (qp.dateFrom !== undefined) conditions.push(gte(timeEntriesTable.date, qp.dateFrom));
  if (qp.dateTo !== undefined) conditions.push(lte(timeEntriesTable.date, qp.dateTo));

  const rows = conditions.length > 0
    ? await db.select().from(timeEntriesTable).where(and(...conditions)).orderBy(timeEntriesTable.date)
    : await db.select().from(timeEntriesTable).orderBy(timeEntriesTable.date);

  res.json(rows.map(serializeEntry));
});

router.post("/time-entries", async (req, res): Promise<void> => {
  const parsed = CreateTimeEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const intervals = parsed.data.intervals as TimeInterval[];
  const totalMinutes = calcMinutes(intervals);
  const dateStr = toDateString(parsed.data.date as unknown as Date);  // zod.coerce.date() gives a Date

  // Upsert: if an entry already exists for this employee+date, update it instead
  const [existing] = await db
    .select()
    .from(timeEntriesTable)
    .where(and(eq(timeEntriesTable.employeeId, parsed.data.employeeId), eq(timeEntriesTable.date, dateStr)));

  if (existing) {
    const [row] = await db
      .update(timeEntriesTable)
      .set({ intervals, note: parsed.data.note ?? existing.note, totalMinutes })
      .where(eq(timeEntriesTable.id, existing.id))
      .returning();
    res.status(200).json(GetTimeEntryResponse.parse(serializeEntry(row)));
    return;
  }

  const [row] = await db.insert(timeEntriesTable).values({
    employeeId: parsed.data.employeeId,
    date: dateStr,
    intervals,
    note: parsed.data.note ?? null,
    totalMinutes,
  }).returning();
  res.status(201).json(GetTimeEntryResponse.parse(serializeEntry(row)));
});

router.get("/time-entries/:id", async (req, res): Promise<void> => {
  const params = GetTimeEntryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Zeiteintrag nicht gefunden" });
    return;
  }
  res.json(GetTimeEntryResponse.parse(serializeEntry(row)));
});

router.patch("/time-entries/:id", async (req, res): Promise<void> => {
  const params = UpdateTimeEntryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTimeEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Zeiteintrag nicht gefunden" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.note !== undefined) updateData.note = parsed.data.note;
  if (parsed.data.intervals !== undefined) {
    const intervals = parsed.data.intervals as TimeInterval[];
    updateData.intervals = intervals;
    updateData.totalMinutes = calcMinutes(intervals);
  }

  const [row] = await db.update(timeEntriesTable).set(updateData).where(eq(timeEntriesTable.id, params.data.id)).returning();
  res.json(GetTimeEntryResponse.parse(serializeEntry(row)));
});

router.delete("/time-entries/:id", async (req, res): Promise<void> => {
  const params = DeleteTimeEntryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.delete(timeEntriesTable).where(eq(timeEntriesTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Zeiteintrag nicht gefunden" });
    return;
  }
  res.sendStatus(204);
});

export default router;
