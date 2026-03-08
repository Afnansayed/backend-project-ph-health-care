import status from "http-status";
import { UserStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { tokenUtils } from "../../utils/token";
import { IRequestUser } from "../../interfaces/request.interface";
import { jwtUtils } from "../../utils/jwt";
import { envVars } from "../../config/env";
import { JwtPayload } from "jsonwebtoken";

interface IRegisterPatient {
    name: string;
    email: string;
    password: string;
}

const registerPatient = async (payload: IRegisterPatient) => {
    const { name, email, password } = payload;

    const data = await auth.api.signUpEmail({
        body: {
            email,
            password,
            name,
            // role: "PATIENT" # better-auth will automatically set the default role to PATIENT, so we don't need to specify it here
        }
    })
    if(!data.user){
        throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to register patient");
    }

    // if user successfully registered, we can create a patient record in our database and link it to the user
    try{
        const patient = await prisma.$transaction(async (tx) => {
             const createPatient = await tx.patient.create({
                data: {
                    name: payload.name,
                    email: payload.email,
                    userId: data.user.id
                }
             })
             return createPatient;
        })

    //** create tokens */
     const accessToken =  tokenUtils.getAccessToken({
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        status: data.user.status,
        isDeleted: data.user.isDeleted,
        emailVerified: data.user.emailVerified
     });
    //  ** refresh token
    const refreshToken = tokenUtils.getRefreshToken({  
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        status: data.user.status,
        isDeleted: data.user.isDeleted,
        emailVerified: data.user.emailVerified
         });

        return {
            ...data,
            accessToken,
            refreshToken,
            patient
        }
    }catch(error){
        // If there is an error while creating the patient record, we should delete the user that was just created to avoid having orphaned user records without corresponding patient records.
        console.error("Transaction error:", error);
        await prisma.user.delete({
            where: { id: data.user.id }
        })
        throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to create patient record, registration rolled back");
    }
}

interface IloginUser  {
    email: string;
    password: string;
}

const loginUser = async (payload: IloginUser) => {
    const { email, password } = payload;
    
    const data = await auth.api.signInEmail({
        body: {
            email,
            password
        }
    })

    if(data.user.isDeleted || data.user.status === UserStatus.DELETED){
        throw new AppError(status.BAD_REQUEST, "User is deleted and cannot login");
    }
    if(data.user.status === UserStatus.BLOCKED){
        throw new AppError(status.BAD_REQUEST, "User is blocked and cannot login");
    }

    //** create tokens */
     const accessToken =  tokenUtils.getAccessToken({
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        status: data.user.status,
        isDeleted: data.user.isDeleted,
        emailVerified: data.user.emailVerified
     });
    //  ** refresh token
    const refreshToken = tokenUtils.getRefreshToken({  
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        status: data.user.status,
        isDeleted: data.user.isDeleted,
        emailVerified: data.user.emailVerified
         });

    return { ...data, accessToken, refreshToken };
}

const myProfile = async (user: IRequestUser) => {
    const isUserExists = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
            patient: {
                include: {
                    appointments: true,
                     medicalReports: true,
                     prescriptions: true,
                     reviews: true,
                     patientHealthData: true
                }
            },
            doctor: {
                include: {
                    appointments: true,
                    reviews: true,
                    specialties: true,
                    prescriptions: true
                }
            },
            admin: true
        }
    })

    if(!isUserExists){
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    return isUserExists;
}

const getNewToken = async (refreshToken: string, sessionToken: string) => {
    const isSessionTokenExist = await prisma.session.findUnique({
        where: {
            token: sessionToken,
        },
        include: {
            user: true
        }
    })
    if(!isSessionTokenExist){
        throw new AppError(status.UNAUTHORIZED, "Invalid session token");
    }

    const verifiedRefreshToken = jwtUtils.verifyToken(refreshToken , envVars.REFRESH_TOKEN_SECRET);
    if(!verifiedRefreshToken.success && verifiedRefreshToken.error){
        throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
    }

    const data = verifiedRefreshToken.data as JwtPayload;
    
      //** create tokens */
     const newAccessToken =  tokenUtils.getAccessToken({
        userId: data.userId,
        role: data.role,
        name: data.name,
        email: data.email,
        status: data.status,
        isDeleted: data.isDeleted,
        emailVerified: data.emailVerified
     });
    //  ** refresh token
    const newRefreshToken = tokenUtils.getRefreshToken({  
        userId: data.userId,
        role: data.role,
        name: data.name,
        email: data.email,
        status: data.status,
        isDeleted: data.isDeleted,
        emailVerified: data.emailVerified
        });
     const {token}  = await prisma.session.update({
        where: {
            token: sessionToken,
        },
        data: {
            token: sessionToken,
            expiresAt: new Date(Date.now() + 60 * 60 * 24 * 1000),
            updatedAt: new Date(),

        }
     }) 
     
     return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        sessionToken: token
     }

}

export const authService = {
    registerPatient,
    loginUser,
    myProfile,
    getNewToken
}
