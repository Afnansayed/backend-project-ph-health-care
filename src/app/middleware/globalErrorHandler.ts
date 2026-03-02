import { NextFunction, Request, Response } from "express";
import { envVars } from "../config/env";
import status from "http-status";
import { TErrorResponse, TErrorSources } from "../interfaces/error.interface";
import z from "zod";
import { handleZodError } from "../errorHelpers/handleZodError";


export const globalErrorHandler = (err: any, req: Request, res: Response , next: NextFunction) => {
    if(envVars.NODE_ENV === "development"){
        console.error("Error from global error handler: ", err);
    }
    let errorSources:TErrorSources[] = [];
    let statusCode: number = status.INTERNAL_SERVER_ERROR;
    let message: string = "Internal server error";

    if(err instanceof  z.ZodError){
        const simplefiedError = handleZodError(err);
        statusCode = simplefiedError.statusCode as number;
        message = simplefiedError.message;
        errorSources = [...simplefiedError.errorSources];
    }

    const errorResponse: TErrorResponse = {
        statusCode,
        success: false,
        message: message,
        errorSources,
        error: envVars.NODE_ENV === "development" ? err.message : undefined,

    }
    
    res.status(statusCode).json(errorResponse);
};