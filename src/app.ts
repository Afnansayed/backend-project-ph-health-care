import express,{ Application, Request, Response } from "express";
import { indexRoutes } from "./routes";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFoundHandler } from "./app/middleware/notFound";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./app/lib/auth";
import path from "path";
import cors from "cors";
import { envVars } from "./app/config/env";
import qs from "qs";

const app:Application = express();

//set qs for parse 
app.set("query parser", (str : string) => qs.parse(str));

app.set("view engine" , "ejs");
app.set("views", path.resolve(process.cwd(), `src/app/templates`));

app.use(cors({
    origin: [envVars.FRONTEND_URL, envVars.BETTER_AUTH_URL, "http://localhost:3000", "http://localhost:5000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// better-auth routes
app.use('/api/auth' , toNodeHandler(auth)); 
// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

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