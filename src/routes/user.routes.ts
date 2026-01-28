// src/routes/user.routes.ts

import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {deleteUser, getAllUsers, getProfile} from "../controllers/user.controller";

export const userRouter = Router();


userRouter.get("/me", authMiddleware, getProfile);     // voor eigen profiel
userRouter.get("/", authMiddleware, getAllUsers);      // voor klantenbeheer
userRouter.delete("/:id", authMiddleware, deleteUser);

