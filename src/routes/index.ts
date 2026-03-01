import { Router } from "express";
import { authRoutes } from "../app/module/auth/auth.route";
import { specialtyRoute } from "../app/module/specialty/specialty.route";



const router = Router();

router.use("/auth", authRoutes);
router.use("/specialty", specialtyRoute);

export const indexRoutes = router;