import { UserStatus } from "../../../generated/prisma/enums";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

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
        throw new Error("Failed to register patient");
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

        return {
            ...data,
            patient
        }
    }catch(error){
        // If there is an error while creating the patient record, we should delete the user that was just created to avoid having orphaned user records without corresponding patient records.
        console.error("Transaction error:", error);
        await prisma.user.delete({
            where: { id: data.user.id }
        })
        throw new Error("Failed to create patient record, registration rolled back");
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
        throw new Error("User is deleted and cannot login");
    }
    if(data.user.status === UserStatus.BLOCKED){
        throw new Error("User is blocked and cannot login");
    }

    return data;
}

export const authService = {
    registerPatient,
    loginUser
}