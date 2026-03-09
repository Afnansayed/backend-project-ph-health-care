import { Router } from "express";
import { authController } from "./auth.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";


const router = Router();

router.post('/register', authController.registerPatient);
router.post('/login', authController.loginUser);
router.get('/my-profile', checkAuth(Role.ADMIN,Role.SUPER_ADMIN ,Role.DOCTOR , Role.PATIENT),authController.myProfile);
router.post("/refresh-token", authController.getNewToken)
router.post("/change-password", checkAuth(Role.ADMIN,Role.SUPER_ADMIN ,Role.DOCTOR , Role.PATIENT), authController.changePassword);
router.post("/logout", checkAuth(Role.ADMIN,Role.SUPER_ADMIN ,Role.DOCTOR , Role.PATIENT), authController.logoutUser);
router.post("/verify-email", authController.verifyEmail);
router.post("/forget-password", authController.forgetPassword);
router.post("/reset-password", authController.resetPassword);

export const authRoutes = router;

