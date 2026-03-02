import status from "http-status";
import { Role, Specialty } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ICreateDoctorPayload } from "./user.interface";


const createDoctor = async (payload: ICreateDoctorPayload) => {
     const sepecialties: Specialty[] = [];
     for(const speacialtyId of payload.specialties){
        const specialty = await prisma.specialty.findUnique({
            where: { id: speacialtyId }
        })
        if(!specialty){
            throw new AppError(status.NOT_FOUND, `Specialty with ID ${speacialtyId} not found`);
        }
        sepecialties.push(specialty);
     }
     
     const existUser = await prisma.user.findUnique({
        where: { email: payload.doctor.email }
     })
     if(existUser){
        throw new AppError(status.BAD_REQUEST, `User with email ${payload.doctor.email} already exists`);
     }

     const userData = await auth.api.signUpEmail({
        body: {
            email: payload.doctor.email,
            password: payload.password,
            name: payload.doctor.name,
            role: Role.DOCTOR,
            needPasswordChange: true,
        }
     })

     if(!userData.user){
        throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to create user for doctor");
     }

     try{
        const result = await prisma.$transaction(async (tx) => {
            const doctorData = await tx.doctor.create({
                data: {
                    userId: userData.user.id,
                    ...payload.doctor,
                }
            })

            //
            const doctorSpecialtyData = sepecialties.map(specialty => {
                return {
                    doctorId: doctorData.id,
                    specialtyId: specialty.id
                }
            });

            await tx.doctorSpecialty.createMany({
                data: doctorSpecialtyData
            })

            const doctor = await tx.doctor.findUnique({
                where: { id: doctorData.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    profilePhoto: true,
                    contactNumber: true,
                    address: true,
                    registrationNumber: true,
                    experience: true,
                    gender: true,
                    appointmentFee: true,
                    qualification: true,
                    currentWorkingPlace: true,
                    designation: true,
                    specialties: {
                        select: {
                            specialty: {
                                select: {
                                    id: true,
                                    title: true,
                                }
                            }
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                            status: true,
                        }
                    }
                }
            });

            return doctor;
        })

        return result;
     }catch(error){
        console.error("Transaction error:", error);
        // If there is an error while creating the doctor record or doctor-specialty records, we should delete the user that was just created to avoid having orphaned user records without corresponding doctor records.
        await prisma.user.delete({
            where: { id: userData.user.id }
        })
        throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to create doctor record, registration rolled back");
     }
}


export const userService = {
    createDoctor
}