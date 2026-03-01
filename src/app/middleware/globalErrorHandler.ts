import { NextFunction, Request, Response } from "express";
import { envVars } from "../config/env";
import status from "http-status";


export const globalErrorHandler = (err: any, req: Request, res: Response , next: NextFunction) => {
    if(envVars.NODE_ENV === "development"){
        console.error("Error from global error handler: ", err);
    }

    let statusCode: number = status.INTERNAL_SERVER_ERROR;
    let message: string = "Internal server error";
    
    res.status(statusCode).json({
        success: false,
        message: message,
        error: err.message,
    })
};