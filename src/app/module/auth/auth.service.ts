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
import {
  IChangePassword,
  IloginUser,
  IRegisterPatient,
} from "./auth.interface";

const registerPatient = async (payload: IRegisterPatient) => {
  const { name, email, password } = payload;

  const data = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
      // role: "PATIENT" # better-auth will automatically set the default role to PATIENT, so we don't need to specify it here
    },
  });
  if (!data.user) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to register patient",
    );
  }

  // if user successfully registered, we can create a patient record in our database and link it to the user
  try {
    const patient = await prisma.$transaction(async (tx) => {
      const createPatient = await tx.patient.create({
        data: {
          name: payload.name,
          email: payload.email,
          userId: data.user.id,
        },
      });
      return createPatient;
    });

    //** create tokens */
    const accessToken = tokenUtils.getAccessToken({
      userId: data.user.id,
      role: data.user.role,
      name: data.user.name,
      email: data.user.email,
      status: data.user.status,
      isDeleted: data.user.isDeleted,
      emailVerified: data.user.emailVerified,
    });
    //  ** refresh token
    const refreshToken = tokenUtils.getRefreshToken({
      userId: data.user.id,
      role: data.user.role,
      name: data.user.name,
      email: data.user.email,
      status: data.user.status,
      isDeleted: data.user.isDeleted,
      emailVerified: data.user.emailVerified,
    });

    return {
      ...data,
      accessToken,
      refreshToken,
      patient,
    };
  } catch (error) {
    // If there is an error while creating the patient record, we should delete the user that was just created to avoid having orphaned user records without corresponding patient records.
    console.error("Transaction error:", error);
    await prisma.user.delete({
      where: { id: data.user.id },
    });
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to create patient record, registration rolled back",
    );
  }
};

const loginUser = async (payload: IloginUser) => {
  const { email, password } = payload;

  const data = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
  });

  if (data.user.isDeleted || data.user.status === UserStatus.DELETED) {
    throw new AppError(status.BAD_REQUEST, "User is deleted and cannot login");
  }
  if (data.user.status === UserStatus.BLOCKED) {
    throw new AppError(status.BAD_REQUEST, "User is blocked and cannot login");
  }

  //** create tokens */
  const accessToken = tokenUtils.getAccessToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });
  //  ** refresh token
  const refreshToken = tokenUtils.getRefreshToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  return { ...data, accessToken, refreshToken };
};

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
          patientHealthData: true,
        },
      },
      doctor: {
        include: {
          appointments: true,
          reviews: true,
          specialties: true,
          prescriptions: true,
        },
      },
      admin: true,
    },
  });

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return isUserExists;
};

const getNewToken = async (refreshToken: string, sessionToken: string) => {
  const isSessionTokenExist = await prisma.session.findUnique({
    where: {
      token: sessionToken,
    },
    include: {
      user: true,
    },
  });
  if (!isSessionTokenExist) {
    throw new AppError(status.UNAUTHORIZED, "Invalid session token");
  }

  const verifiedRefreshToken = jwtUtils.verifyToken(
    refreshToken,
    envVars.REFRESH_TOKEN_SECRET,
  );
  if (!verifiedRefreshToken.success && verifiedRefreshToken.error) {
    throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
  }

  const data = verifiedRefreshToken.data as JwtPayload;

  //** create tokens */
  const newAccessToken = tokenUtils.getAccessToken({
    userId: data.userId,
    role: data.role,
    name: data.name,
    email: data.email,
    status: data.status,
    isDeleted: data.isDeleted,
    emailVerified: data.emailVerified,
  });
  //  ** refresh token
  const newRefreshToken = tokenUtils.getRefreshToken({
    userId: data.userId,
    role: data.role,
    name: data.name,
    email: data.email,
    status: data.status,
    isDeleted: data.isDeleted,
    emailVerified: data.emailVerified,
  });
  const { token } = await prisma.session.update({
    where: {
      token: sessionToken,
    },
    data: {
      token: sessionToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 24 * 1000),
      updatedAt: new Date(),
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    sessionToken: token,
  };
};

const changePassword = async (
  payload: IChangePassword,
  sessionToken: string,
) => {
  const session = await auth.api.getSession({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  if (!session) {
    throw new AppError(status.UNAUTHORIZED, "Invalid session");
  }

  const { currentPassword, newPassword } = payload;

  const result = await auth.api.changePassword({
    body: {
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    },
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  // After password change, if the user was required to change password, we can reset that flag in our database
  if(session.user.needPasswordChange){
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        needPasswordChange: false,
      },
    });
  }

  //** create tokens */
  const accessToken = tokenUtils.getAccessToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    status: session.user.status,
    isDeleted: session.user.isDeleted,
    emailVerified: session.user.emailVerified,
  });
  //  ** refresh token
  const refreshToken = tokenUtils.getRefreshToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    status: session.user.status,
    isDeleted: session.user.isDeleted,
    emailVerified: session.user.emailVerified,
  });

  return {
    ...result,
    accessToken,
    refreshToken,
  };
};

const logoutUser = async (sessionToken: string) => {
  const result = await auth.api.signOut({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  return result;
};

const verifyEmail = async (email: string, otp: string) => {
  const result = await auth.api.verifyEmailOTP({
    body: {
      email,
      otp,
    },
  });

  if (result.status && !result.user.emailVerified) {
    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: true,
      },
    });
  }
  return result;
};

const forgetPassword = async (email: string) => {
  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (!isUserExist) {
    throw new AppError(status.NOT_FOUND, "User with this email does not exist");
  }

  if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
    throw new AppError(
      status.BAD_REQUEST,
      "User is deleted and cannot reset password",
    );
  }

  if (!isUserExist.emailVerified) {
    throw new AppError(
      status.BAD_REQUEST,
      "Email is not verified. Please verify your email before resetting password",
    );
  }

  await auth.api.requestPasswordResetEmailOTP({
    body: {
      email,
    },
  });
};

const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (!isUserExist) {
    throw new AppError(status.NOT_FOUND, "User with this email does not exist");
  }
  if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
    throw new AppError(
      status.BAD_REQUEST,
      "User is deleted and cannot reset password",
    );
  }
  if (!isUserExist.emailVerified) {
    throw new AppError(
      status.BAD_REQUEST,
      "Email is not verified. Please verify your email before resetting password",
    );
  }

  await auth.api.resetPasswordEmailOTP({
    body: {
      email,
      otp,
      password: newPassword,
    },
  });

  if (isUserExist.needPasswordChange) {
    await prisma.user.update({
      where: { email },
      data: {
        needPasswordChange: false,
      },
    });
  }

  await prisma.session.deleteMany({
    where: {
      userId: isUserExist.id,
    },
  });


};

export const authService = {
  registerPatient,
  loginUser,
  myProfile,
  getNewToken,
  changePassword,
  logoutUser,
  verifyEmail,
  forgetPassword,
  resetPassword,
};
