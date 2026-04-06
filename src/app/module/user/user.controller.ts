import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { userService} from "./user.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";


const creteDoctor =  catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body;
        const result = await userService.createDoctor(payload);
        sendResponse(res, {
            httpStatusCode: status.CREATED,
            success: true,
            message: 'Doctor created successfully',
            data: result
        });
    }
)

const createAdmin = catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body;

        const result = await userService.createAdmin(payload);

        sendResponse(res, {
            httpStatusCode: status.CREATED,
            success: true,
            message: "Admin registered successfully",
            data: result,
        })
    }
)

export const userController = {
    creteDoctor,
    createAdmin
}