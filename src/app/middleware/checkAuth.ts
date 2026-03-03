import { NextFunction, Request, Response } from "express";
import { Role, UserStatus } from "../../generated/prisma/enums";
import { cookieUtils } from "../utils/cookie";
import AppError from "../errorHelpers/AppError";
import { envVars } from "../config/env";
import status from "http-status";
import { prisma } from "../lib/prisma";
import { jwtUtils } from "../utils/jwt";

export const checkAuth = (...allowedRoles: Role[]) => async (req: Request, res: Response, next: NextFunction) => {
         try{
             const sessionToken = cookieUtils.getCookie(req, "better-auth.session_token");

             if(!sessionToken){
               throw new AppError(status.UNAUTHORIZED, "Unauthorized: No session token provided");
             }
             
             if(sessionToken){
                const sessionExists = await prisma.session.findFirst({
                    where: {
                        token: sessionToken,
                        expiresAt: {
                            gt: new Date()
                        }
                    },
                    include: {
                        user: true
                    }
                });

                if(sessionExists && sessionExists.user){
                    const user = sessionExists.user;

                    const now = new Date();
                    const expiresAt = new Date(sessionExists.expiresAt);
                    const createdAt = new Date(sessionExists.createdAt);

                    const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
                    const timeRemaining = expiresAt.getTime() - now.getTime();
                    const percentageRemaining = (timeRemaining / sessionLifeTime) * 100;

                    if(percentageRemaining < 20){
                        res.setHeader("X-Session-Refresh", "true");
                        res.setHeader("X-Session_Expires-At", expiresAt.toISOString());
                        res.setHeader("X-Session-Remaining", timeRemaining.toString());

                        console.log("Time Expire soon!!")
                    }


                    if(allowedRoles.length > 0 && !allowedRoles.includes(user.role as Role)){
                        throw new AppError(status.FORBIDDEN, "Forbidden: You do not have permission to access this resource");
                    }

                    if(user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED){
                        throw new AppError(status.UNAUTHORIZED, "Unauthorized: Your account is not active");
                    }

                    if(user.isDeleted){
                        throw new AppError(status.UNAUTHORIZED, "Unauthorized: Your account is deleted");
                    }
                }
             }

              const accessToken = cookieUtils.getCookie(req, "accessToken");

            if(!accessToken){
                throw new AppError(status.UNAUTHORIZED, "Unauthorized: No access token provided");
            }

            const verifiedToken = jwtUtils.verifyToken(accessToken, envVars.ACCESS_TOKEN_SECRET);

            if(!verifiedToken){
                throw new AppError(status.UNAUTHORIZED, "Unauthorized: Invalid access token");
             }

             if(verifiedToken.data.role !== Role.PATIENT){
                throw new AppError(status.FORBIDDEN, "Forbidden: You do not have permission to access this resource");
             }
             next();
         }catch(error){
            next(error);
         }
}