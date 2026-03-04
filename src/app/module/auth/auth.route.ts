import { Router } from "express";
import { authController } from "./auth.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";


const router = Router();

router.post('/register', authController.registerPatient);
router.post('/login', authController.loginUser);
router.get('/my-profile', checkAuth(Role.ADMIN,Role.SUPER_ADMIN ,Role.DOCTOR , Role.PATIENT),authController.myProfile);

export const authRoutes = router;

