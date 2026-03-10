/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import  { NextFunction, Request, Response } from "express";
import { envVars } from "../config/env";
import status from "http-status";
import { TErrorResponse, TErrorSources } from "../interfaces/error.interface";
import z from "zod";
import { handleZodError } from "../errorHelpers/handleZodError";
import AppError from "../errorHelpers/AppError";
import { deleteFileFromCloudinary } from "../config/cloudinary.config";


export const globalErrorHandler = async (err: any, req: Request, res: Response , _next: NextFunction) => {
    if(envVars.NODE_ENV === "development"){
        console.error("Error from global error handler: ", err);
    }

    if(req.file){
        await deleteFileFromCloudinary(req.file.path)
    }

    if(req.files && Array.isArray(req.files) && req.files.length > 0){
        const imageUrls = req.files.map((file) => file.path);
        await Promise.all(imageUrls.map(url => deleteFileFromCloudinary(url))); 
    }
    
    let errorSources:TErrorSources[] = [];
    let statusCode: number = status.INTERNAL_SERVER_ERROR;
    let message: string = "Internal server error";
    let stack: string | undefined = undefined;

    if(err instanceof  z.ZodError){
        const simplifiedError = handleZodError(err);
        statusCode = simplifiedError.statusCode as number;
        message = simplifiedError.message;
        errorSources = [...simplifiedError.errorSources];
        
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