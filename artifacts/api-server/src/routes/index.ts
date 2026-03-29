import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cashbooksRouter from "./cashbooks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cashbooksRouter);

export default router;
