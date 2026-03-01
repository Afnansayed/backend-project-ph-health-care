import { Router } from "express";
import { authRoutes } from "../app/module/auth/auth.route";



const router = Router();

router.use("/auth", authRoutes);

export const indexRoutes = router;