import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cashbooksRouter from "./cashbooks";
import transfersRouter from "./transfers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cashbooksRouter);
router.use(transfersRouter);

export default router;
