import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, employeesTable } from "@workspace/db";
import {
  ListEmployeesResponseItem,
  CreateEmployeeBody,
  GetEmployeeParams,
  GetEmployeeResponse,
  UpdateEmployeeParams,
  UpdateEmployeeBody,
  DeleteEmployeeParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/employees", async (_req, res): Promise<void> => {
  const rows = await db.select().from(employeesTable).orderBy(employeesTable.lastName);
  res.json(rows.map((r) => ListEmployeesResponseItem.parse({
    ...r,
    pensum: Number(r.pensum),
    annualHours: Number(r.annualHours),
  })));
});

router.post("/employees", async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(employeesTable).values({
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email ?? null,
    pensum: String(parsed.data.pensum),
    annualHours: String(parsed.data.annualHours),
  }).returning();
  res.status(201).json(GetEmployeeResponse.parse({
    ...row,
    pensum: Number(row.pensum),
    annualHours: Number(row.annualHours),
  }));
});

router.get("/employees/:id", async (req, res): Promise<void> => {
  const params = GetEmployeeParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(employeesTable).where(eq(employeesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Mitarbeiter nicht gefunden" });
    return;
  }
  res.json(GetEmployeeResponse.parse({
    ...row,
    pensum: Number(row.pensum),
    annualHours: Number(row.annualHours),
  }));
});

router.patch("/employees/:id", async (req, res): Promise<void> => {
  const params = UpdateEmployeeParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.firstName !== undefined) updateData.firstName = parsed.data.firstName;
  if (parsed.data.lastName !== undefined) updateData.lastName = parsed.data.lastName;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
  if (parsed.data.pensum !== undefined) updateData.pensum = String(parsed.data.pensum);
  if (parsed.data.annualHours !== undefined) updateData.annualHours = String(parsed.data.annualHours);

  const [row] = await db.update(employeesTable).set(updateData).where(eq(employeesTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Mitarbeiter nicht gefunden" });
    return;
  }
  res.json(GetEmployeeResponse.parse({
    ...row,
    pensum: Number(row.pensum),
    annualHours: Number(row.annualHours),
  }));
});

router.delete("/employees/:id", async (req, res): Promise<void> => {
  const params = DeleteEmployeeParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.delete(employeesTable).where(eq(employeesTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Mitarbeiter nicht gefunden" });
    return;
  }
  res.sendStatus(204);
});

export default router;
