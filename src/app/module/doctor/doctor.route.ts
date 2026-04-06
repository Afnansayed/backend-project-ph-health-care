import { Router } from "express";
import { doctorController } from "./doctor.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/browser";
import { validateRequest } from "../../middleware/validateRequest";
import { updateDoctorZodSchema } from "./doctor.validation";

const router = Router();

router.get("/", doctorController.getAllDoctors);
router.get("/:id",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR),
    doctorController.getDoctorById);
router.patch("/:id",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN ,Role.DOCTOR),
    validateRequest(updateDoctorZodSchema), doctorController.updateDoctor);
router.delete("/:id",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    doctorController.deleteDoctor);

export const doctorRoutes = router;