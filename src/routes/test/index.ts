import { Router } from "express";
import { TestRoute } from "../../controller/test";

const router = Router();

router.get("/", TestRoute);

export default router;
