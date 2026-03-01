import express,{ Application, Request, Response } from "express";
import { indexRoutes } from "./routes";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFoundHandler } from "./app/middleware/notFound";

const app:Application = express()
// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());

app.use("/api/v1", indexRoutes);

// Basic route
app.get('/', async (req: Request, res: Response) => {
   res.send("wlcome to ph-healthcare backend");
});

// Global error handler
app.use(globalErrorHandler);
// Not found handler
app.use(notFoundHandler);

export default app;