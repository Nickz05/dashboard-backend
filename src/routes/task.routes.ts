import { Router } from "express";
import {authMiddleware} from "../middleware/auth.middleware";
import {authorizeRoles} from "../middleware/role.middleware";
import { createTask, updateTask } from "../controllers/task.controller";

export const taskRouter = Router();

taskRouter.use(authMiddleware);

// ADMIN: Taak aanmaken voor klant
taskRouter.post("/", authorizeRoles(['ADMIN']), createTask);

// CLIENT: Feedback en status update over eigen taken
taskRouter.put("/:id", authorizeRoles(['CLIENT', 'ADMIN']), updateTask);

// TO DO: voeg taskRouter toe aan app.ts