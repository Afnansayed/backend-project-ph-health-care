import express,{ Application, Request, Response } from "express";
import { indexRoutes } from "./routes";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFoundHandler } from "./app/middleware/notFound";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./app/lib/auth";
import path from "path";

const app:Application = express();

app.set("view engine" , "ejs");
app.set("views", path.resolve(process.cwd(), `src/app/templates`));

// better-auth routes
app.use('/api/auth' , toNodeHandler(auth)); 
// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1", indexRoutes);

// Basic route
app.get('/', async (req: Request, res: Response) => {
   res.send("welcome to ph-healthcare backend");
});

// Global error handler
app.use(globalErrorHandler);
// Not found handler
app.use(notFoundHandler);

export default app;