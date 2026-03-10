import { Router } from "express";
import { SpecialtyController } from "./specialty.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { multerUpload } from "../../config/multer.config";

const router = Router();

router.post('/',
// checkAuth(Role.ADMIN,Role.SUPER_ADMIN),
multerUpload.single("file"),
 SpecialtyController.createSpecialty);
router.patch('/:id',checkAuth(Role.ADMIN,Role.SUPER_ADMIN), SpecialtyController.updateSpecialty);
router.get('/', SpecialtyController.getAllSpecialties);
router.delete('/:id',checkAuth(Role.ADMIN,Role.SUPER_ADMIN), SpecialtyController.deleteSpecialty);

export const specialtyRoute = router;