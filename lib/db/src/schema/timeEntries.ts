import { pgTable, text, serial, timestamp, integer, date, json, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";

export interface TimeInterval {
  comeTime: string; // HH:MM
  goTime: string;   // HH:MM
}

export const timeEntriesTable = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  intervals: json("intervals").$type<TimeInterval[]>().notNull().default([]),
  note: text("note"),
  totalMinutes: integer("total_minutes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("time_entries_employee_date_unique").on(table.employeeId, table.date),
]);

export const insertTimeEntrySchema = createInsertSchema(timeEntriesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntriesTable.$inferSelect;
