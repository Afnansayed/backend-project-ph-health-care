import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { authService } from "./auth.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { tokenUtils } from "../../utils/token";
import { IRequestUser } from "../../interfaces/request.interface";
import AppError from "../../errorHelpers/AppError";
import { cookieUtils } from "../../utils/cookie";
import { envVars } from "../../config/env";
import { auth } from "../../lib/auth";


const registerPatient = catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body;
        const result = await authService.registerPatient(payload);

        const { accessToken, refreshToken, token , ...rest } = result;
        tokenUtils.setAccessTokenCookie(res, accessToken);
        tokenUtils.setRefreshTokenCookie(res, refreshToken);
        tokenUtils.betterAuthSessionCookie(res, token as string);

        sendResponse(res, {
            httpStatusCode: status.CREATED,
            success: true,
            message: "Patient registered successfully",
            data: {
                token,
                accessToken,
                refreshToken,
                ...rest
            },
        })
    }
)

const loginUser = catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body;
        const result = await authService.loginUser(payload);

        const { accessToken, refreshToken, token , ...rest } = result;
        tokenUtils.setAccessTokenCookie(res, accessToken);
        tokenUtils.setRefreshTokenCookie(res, refreshToken);
        tokenUtils.betterAuthSessionCookie(res, token);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "User logged in successfully",
            data: {
                token,
                accessToken,
                refreshToken,
                ...rest
            },
        })
    }
)

const myProfile = catchAsync(
    async (req: Request, res: Response) => {
        const user = req.user;
        const result = await authService.myProfile(user as IRequestUser);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "User profile fetched successfully",
            data: result,
        })
    }
)

const getNewToken = catchAsync(
    async (req: Request, res: Response) => {
        const refreshToken = req.cookies.refreshToken;
        const betterAuthSessionToken = req.cookies["better-auth.session_token"];
        if (!refreshToken) {
            throw new AppError(status.UNAUTHORIZED, "Refresh token is missing");
        }
        const result = await authService.getNewToken(refreshToken, betterAuthSessionToken);

        const { accessToken, refreshToken: newRefreshToken, sessionToken } = result;

        tokenUtils.setAccessTokenCookie(res, accessToken);
        tokenUtils.setRefreshTokenCookie(res, newRefreshToken);
        tokenUtils.betterAuthSessionCookie(res, sessionToken);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "New tokens generated successfully",
            data: {
                accessToken,
                refreshToken: newRefreshToken,
                sessionToken,
            },
        });
    }
)

const changePassword = catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body;

        const betterAuthSessionToken = req.cookies["better-auth.session_token"];

        if (!betterAuthSessionToken) {
            throw new AppError(status.UNAUTHORIZED, "Session token is missing");
        }

        const result = await authService.changePassword(payload, betterAuthSessionToken);

        const { accessToken, refreshToken, token } = result;

        tokenUtils.setAccessTokenCookie(res, accessToken);
        tokenUtils.setRefreshTokenCookie(res, refreshToken);
        tokenUtils.betterAuthSessionCookie(res, token as string);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Password changed successfully",
            data: result,
        });

    }
)

const logoutUser = catchAsync(
    async (req: Request, res: Response) => {
        const betterAuthSessionToken = req.cookies["better-auth.session_token"];

        if (!betterAuthSessionToken) {
            throw new AppError(status.UNAUTHORIZED, "Session token is missing");
        }

      const result  = await authService.logoutUser(betterAuthSessionToken);
       
      cookieUtils.clearCookie(res, "accessToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      cookieUtils.clearCookie(res, "refreshToken" , {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      cookieUtils.clearCookie(res, "better-auth.session_token", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });

     sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "User logged out successfully",
            data: result,
        });
    }
)

const verifyEmail = catchAsync(
    async (req: Request, res: Response) => {
        const { email, otp } = req.body;

        const result = await authService.verifyEmail(email, otp);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Email verified successfully",
            data: result,
        });
    }
)

const forgetPassword = catchAsync(
    async (req: Request, res: Response) => {
        const { email } = req.body;

        const result = await authService.forgetPassword(email);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Password reset OTP sent to email successfully",
            data: result,
        });
    }
);

const resetPassword = catchAsync(
    async (req: Request, res: Response) => {
        const { email, otp, newPassword } = req.body;

        const result = await authService.resetPassword(email, otp, newPassword);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Password reset successfully",
            data: result,
        });
    }
);

// /api/v1/auth/login/google?redirect=/profile
const googleLogin = catchAsync(async (req: Request, res: Response) => {
      const redirectPath = req.query.redirect || "/dashboard";

      const encodedRedirectPath = encodeURIComponent(redirectPath as string);

      const callbackURL = `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success?redirect=${encodedRedirectPath}`;

      res.render("googleRedirect", {
        callbackURL: callbackURL,
        betterAuthUrl: envVars.BETTER_AUTH_URL,
      })
});
const googleLoginSuccess = catchAsync(async (req: Request, res: Response) => {
    const redirectPath = req.query.redirect as string || "/dashboard";
    const sessionToken = req.cookies["better-auth.session_token"];

    if (!sessionToken) {
        return res.redirect(`${envVars.FRONTEND_URL}/login?error=oauth_failed`);
    }

    const session = await auth.api.getSession({
        headers: {
            "Cookie": `better-auth.session_token=${sessionToken}`,
        }
    });

    if (!session ) {
        return res.redirect(`${envVars.FRONTEND_URL}/login?error=no_session_found`);
    }

    if(session &&  !session.user){
        return res.redirect(`${envVars.FRONTEND_URL}/login?error=no_user_found`);
    }

    const result = await authService.googleLoginSuccess(session);

    const { accessToken, refreshToken } = result;

    tokenUtils.setAccessTokenCookie(res, accessToken);
    tokenUtils.setRefreshTokenCookie(res, refreshToken);

    const isValidedRedirectPath = redirectPath.startsWith("/") && !redirectPath.startsWith("//");
    const finalRedirectPath = isValidedRedirectPath ? redirectPath : "/dashboard";

    res.redirect(`${envVars.FRONTEND_URL}${finalRedirectPath}`);
});
const handleOAuthError = catchAsync(async (req: Request, res: Response) => {
      const error = req.query.error as string || "oauth_failed";
        res.redirect(`${envVars.FRONTEND_URL}/login?error=${error}`);
});




export const authController = {
    registerPatient,
    loginUser,
    myProfile,
    verifyEmail,
    getNewToken,
    changePassword,
    logoutUser,
    forgetPassword,
    resetPassword,
    googleLogin,
    googleLoginSuccess,
    handleOAuthError
}