// E:\scribble_backend\src\app.ts
import { executionAsyncResource } from "async_hooks";
import express from "express";
import Test from "./routes/test";

import { errorHandler } from "./middleware/errorHandler";
const app = express();

app.use(express.json());

app.use("/api/test", Test);

app.use(errorHandler);

export { app };
