import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, employeesTable, timeEntriesTable } from "@workspace/db";
import type { TimeInterval } from "@workspace/db";
import {
  GetMonthlyReportQueryParams,
  GetEmployeeReportQueryParams,
  GetDashboardSummaryQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function monthTargetMinutes(annualHours: number, pensum: number, year: number, month: number): number {
  const daysInMonth = getDaysInMonth(year, month);
  const daysInYear = new Date(year, 1, 29).getDate() === 29 ? 366 : 365;
  return Math.round((annualHours * 60 * (pensum / 100)) * (daysInMonth / daysInYear));
}

function yearToDateTargetMinutes(annualHours: number, pensum: number, year: number, month: number): number {
  let total = 0;
  for (let m = 1; m <= month; m++) {
    total += monthTargetMinutes(annualHours, pensum, year, m);
  }
  return total;
}

function padDate(year: number, month: number, day?: number): string {
  const m = String(month).padStart(2, "0");
  if (day === undefined) return `${year}-${m}`;
  return `${year}-${m}-${String(day).padStart(2, "0")}`;
}

router.get("/reports/monthly", async (req, res): Promise<void> => {
  const qp = GetMonthlyReportQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }
  const { year, month } = qp.data;
  const dateFrom = `${padDate(year, month)}-01`;
  const dateTo = `${padDate(year, month)}-${getDaysInMonth(year, month)}`;

  const employees = await db.select().from(employeesTable).orderBy(employeesTable.lastName);
  const entries = await db.select().from(timeEntriesTable).where(
    and(gte(timeEntriesTable.date, dateFrom), lte(timeEntriesTable.date, dateTo))
  );

  const yearFrom = `${year}-01-01`;
  const yearTo = dateTo;
  const ytdEntries = await db.select().from(timeEntriesTable).where(
    and(gte(timeEntriesTable.date, yearFrom), lte(timeEntriesTable.date, yearTo))
  );

  const result = employees.map((emp) => {
    const annualHours = Number(emp.annualHours);
    const pensum = Number(emp.pensum);
    const monthEntries = entries.filter((e) => e.employeeId === emp.id);
    const ytd = ytdEntries.filter((e) => e.employeeId === emp.id);
    const totalMinutes = monthEntries.reduce((s, e) => s + e.totalMinutes, 0);
    const yearTotalMinutes = ytd.reduce((s, e) => s + e.totalMinutes, 0);
    const targetMinutes = monthTargetMinutes(annualHours, pensum, year, month);
    const yearTargetMinutes = yearToDateTargetMinutes(annualHours, pensum, year, month);
    return {
      employeeId: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      pensum,
      annualHours,
      totalMinutes,
      targetMinutes,
      differenceMinutes: totalMinutes - targetMinutes,
      yearTotalMinutes,
      yearTargetMinutes,
    };
  });

  res.json({ year, month, employees: result });
});

router.get("/reports/employee-monthly", async (req, res): Promise<void> => {
  const qp = GetEmployeeReportQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }
  const { employeeId, year, month } = qp.data;

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));
  if (!emp) {
    res.status(404).json({ error: "Mitarbeiter nicht gefunden" });
    return;
  }

  const dateFrom = `${padDate(year, month)}-01`;
  const daysInMonth = getDaysInMonth(year, month);
  const dateTo = `${padDate(year, month)}-${daysInMonth}`;

  const entries = await db.select().from(timeEntriesTable).where(
    and(eq(timeEntriesTable.employeeId, employeeId), gte(timeEntriesTable.date, dateFrom), lte(timeEntriesTable.date, dateTo))
  );

  const yearFrom = `${year}-01-01`;
  const ytdEntries = await db.select().from(timeEntriesTable).where(
    and(eq(timeEntriesTable.employeeId, employeeId), gte(timeEntriesTable.date, yearFrom), lte(timeEntriesTable.date, dateTo))
  );

  const annualHours = Number(emp.annualHours);
  const pensum = Number(emp.pensum);

  // Build per-day entries
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = padDate(year, month, day);
    const entry = entries.find((e) => e.date === dateStr);
    return {
      date: dateStr,
      totalMinutes: entry?.totalMinutes ?? 0,
      intervals: (entry?.intervals as TimeInterval[]) ?? [],
      note: entry?.note ?? null,
      timeEntryId: entry?.id ?? null,
    };
  });

  const totalMinutes = entries.reduce((s, e) => s + e.totalMinutes, 0);
  const targetMinutes = monthTargetMinutes(annualHours, pensum, year, month);
  const yearTotalMinutes = ytdEntries.reduce((s, e) => s + e.totalMinutes, 0);
  const yearTargetMinutes = yearToDateTargetMinutes(annualHours, pensum, year, month);

  res.json({
    employee: { ...emp, pensum, annualHours, createdAt: emp.createdAt.toISOString() },
    year,
    month,
    days,
    totalMinutes,
    targetMinutes,
    differenceMinutes: totalMinutes - targetMinutes,
    yearTotalMinutes,
    yearTargetMinutes,
  });
});

router.get("/reports/summary", async (req, res): Promise<void> => {
  const qp = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }
  const now = new Date();
  const year = qp.data.year ?? now.getFullYear();
  const month = qp.data.month ?? (now.getMonth() + 1);

  const dateFrom = `${padDate(year, month)}-01`;
  const dateTo = `${padDate(year, month)}-${getDaysInMonth(year, month)}`;
  const yearFrom = `${year}-01-01`;

  const employees = await db.select().from(employeesTable).orderBy(employeesTable.lastName);
  const monthEntries = await db.select().from(timeEntriesTable).where(
    and(gte(timeEntriesTable.date, dateFrom), lte(timeEntriesTable.date, dateTo))
  );
  const ytdEntries = await db.select().from(timeEntriesTable).where(
    and(gte(timeEntriesTable.date, yearFrom), lte(timeEntriesTable.date, dateTo))
  );

  const result = employees.map((emp) => {
    const annualHours = Number(emp.annualHours);
    const pensum = Number(emp.pensum);
    const monthMins = monthEntries.filter((e) => e.employeeId === emp.id).reduce((s, e) => s + e.totalMinutes, 0);
    const yearMins = ytdEntries.filter((e) => e.employeeId === emp.id).reduce((s, e) => s + e.totalMinutes, 0);
    return {
      employeeId: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      pensum,
      annualHours,
      monthMinutes: monthMins,
      monthTargetMinutes: monthTargetMinutes(annualHours, pensum, year, month),
      yearMinutes: yearMins,
      yearTargetMinutes: yearToDateTargetMinutes(annualHours, pensum, year, month),
    };
  });

  res.json({ year, month, employees: result });
});

export default router;
