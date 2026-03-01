import { Router } from "express";
import { authRoutes } from "../app/module/auth/auth.route";
import { specialtyRoute } from "../app/module/specialty/specialty.route";
import { userRoute } from "../app/module/user/user.route";



const router = Router();

router.use("/auth", authRoutes);
router.use("/specialty", specialtyRoute);
router.use("/user", userRoute);

export const indexRoutes = router;