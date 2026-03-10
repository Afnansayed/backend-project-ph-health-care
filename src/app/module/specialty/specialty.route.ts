import { Router } from "express";
import { SpecialtyController } from "./specialty.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { multerUpload } from "../../config/multer.config";
import { validateRequest } from "../../middleware/validateRequest";
import { SpecialtyValidation } from "./specialty.validation";

const router = Router();

router.post('/',
checkAuth(Role.ADMIN,Role.SUPER_ADMIN),
multerUpload.single("file"),
validateRequest(SpecialtyValidation.createSpecialtyZodSchema),
SpecialtyController.createSpecialty);
router.patch('/:id',checkAuth(Role.ADMIN,Role.SUPER_ADMIN), SpecialtyController.updateSpecialty);
router.get('/', SpecialtyController.getAllSpecialties);
router.delete('/:id',checkAuth(Role.ADMIN,Role.SUPER_ADMIN), SpecialtyController.deleteSpecialty);

export const specialtyRoute = router;