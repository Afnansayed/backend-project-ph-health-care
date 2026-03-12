import { NextFunction, Request, Response } from "express"
import z from "zod"

export const validateRequest = (zodSchema: z.ZodObject) => {
     return (req:Request, res: Response, next:NextFunction) => {
        if(req.body?.data){
            req.body = JSON.parse(req.body.data);
        }
        // console.log("Validating request body: ", req.body);
        const parsedResult  = zodSchema.safeParse(req.body);

        if(!parsedResult.success){
            next(parsedResult.error);
        }

        // sanitized the data        
        req.body = parsedResult.data;
        // console.log("Validated data: ", req.body);
        next();
     }
}