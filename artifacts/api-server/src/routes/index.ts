import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import copilotRouter from "../copilot/router";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use("/copilot", copilotRouter);

export default router;
