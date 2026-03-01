import express,{ Application, Request, Response } from "express";
import { prisma } from "./app/lib/prisma";
import { indexRoutes } from "./routes";

const app:Application = express()
// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());

app.use("/api/v1", indexRoutes);

// Basic route
app.get('/', async (req: Request, res: Response) => {
   const specilty = await prisma.specialty.create({
    data: {
      title: "Cardiology",
      description: "Specializes in heart and cardiovascular diseases",
      icon: "heart"
    }
  });
  res.status(200).json({ message: "Welcome to the Healthcare API!", specialty: specilty });
});

export default app;