import { Router } from "express";
import { requestPasswordReset, resetPassword } from "../controllers/passwordReset.controller";

export const passwordResetRouter = Router();

passwordResetRouter.post("/forgot-password", requestPasswordReset);
passwordResetRouter.post("/reset-password", resetPassword);