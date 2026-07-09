import { Router, type IRouter } from "express";
import healthRouter from "./health";
import employeesRouter from "./employees";
import timeEntriesRouter from "./timeEntries";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(employeesRouter);
router.use(timeEntriesRouter);
router.use(reportsRouter);

export default router;
