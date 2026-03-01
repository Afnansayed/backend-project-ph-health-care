import { Router } from "express";
import { authRoutes } from "../app/module/auth/auth.route";
import { specialtyRoute } from "../app/module/specialty/specialty.route";
import { userRoute } from "../app/module/user/user.route";
import { doctorRoutes } from "../app/module/doctor/doctor.route";



const router = Router();

router.use("/auth", authRoutes);
router.use("/specialty", specialtyRoute);
router.use("/user", userRoute);
router.use("/doctor", doctorRoutes);

export const indexRoutes = router;