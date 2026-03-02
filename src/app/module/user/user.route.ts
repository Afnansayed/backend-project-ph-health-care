import { Router } from "express";
import { userController } from "./user.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createDoctorZodSchema } from "./user.validation";

const router = Router();

router.post('/create-doctor', validateRequest(createDoctorZodSchema), userController.creteDoctor);

export const userRoute = router;