import e, { NextFunction, Request, Response } from "express";
import { envVars } from "../config/env";
import status from "http-status";
import { TErrorResponse, TErrorSources } from "../interfaces/error.interface";
import z from "zod";
import { handleZodError } from "../errorHelpers/handleZodError";
import AppError from "../errorHelpers/AppError";


export const globalErrorHandler = (err: any, req: Request, res: Response , next: NextFunction) => {
    if(envVars.NODE_ENV === "development"){
        console.error("Error from global error handler: ", err);
    }
    let errorSources:TErrorSources[] = [];
    let statusCode: number = status.INTERNAL_SERVER_ERROR;
    let message: string = "Internal server error";
    let stack: string | undefined = undefined;

    if(err instanceof  z.ZodError){
        const simplefiedError = handleZodError(err);
        statusCode = simplefiedError.statusCode as number;
        message = simplefiedError.message;
        errorSources = [...simplefiedError.errorSources];
        
    } else if (err instanceof AppError){
        statusCode = err.statusCode;
        message = err.message;
        stack = err.stack;
        errorSources = [
            {
                path: "",
                message: err.message
            }
        ];

    }
    else if(err instanceof Error){
        statusCode = status.INTERNAL_SERVER_ERROR;
        message = err.message;
        stack = err.stack;
        errorSources = [
            {
                path: "",
                message: err.message
            }
        ];
    }

    const errorResponse: TErrorResponse = {
        statusCode,
        success: false,
        message: message,
        errorSources,
        error: envVars.NODE_ENV === "development" ? err : undefined,
        stack: envVars.NODE_ENV === "development" ? stack : undefined
    }
    
    res.status(statusCode).json(errorResponse);
};