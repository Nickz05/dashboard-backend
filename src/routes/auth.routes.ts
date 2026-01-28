import { Router } from "express";
import {changePassword, login, register} from "../controllers/auth.controller";
import {authorizeRoles} from "../middleware/role.middleware";
import {authMiddleware} from "../middleware/auth.middleware";

export const authRouter = Router();
authRouter.post("/login", login);

authRouter.use(authMiddleware);
authRouter.post("/change-password", changePassword);

authRouter.post("/register", authorizeRoles(['ADMIN']), register);


