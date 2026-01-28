// src/routes/project.routes.ts

import { Router } from "express";
import {
    createProject,
    getProjects,
    getProjectDetails,
    updateProject,
    addComment,
    deleteComment,
    addFeature,
    updateFeature,
    deleteFeature, getProjectComments, deleteProject, getProjectStats, getAdminDashboardStats, getAdminActivityLog
} from "../controllers/project.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

export const projectRouter = Router();

// Alle routes vereisen authenticatie
projectRouter.use(authMiddleware);

// ============= PROJECT CRUD =============
// ADMIN: Nieuw project aanmaken
projectRouter.post("/", authorizeRoles(['ADMIN']), createProject);

projectRouter.get("/dashboard/admin-stats", authorizeRoles(['ADMIN']), getAdminDashboardStats);
projectRouter.get("/:id/stats", getProjectStats);
// ADMIN & CLIENT: Projecten ophalen (filters binnen controller)
projectRouter.get("/", getProjects);
projectRouter.delete("/:id", deleteProject)

// ADMIN & CLIENT: Project details ophalen
projectRouter.get("/:id", getProjectDetails);

// ADMIN: Project updaten (status, timeline, etc.)
projectRouter.put("/:id", authorizeRoles(['ADMIN']), updateProject);


projectRouter.post("/:id/comments", addComment);
projectRouter.get("/:id/comments", getProjectComments);
projectRouter.delete("/:id/comments/:commentId", deleteComment);


projectRouter.post("/:id/features", authorizeRoles(['ADMIN']), addFeature);


projectRouter.put("/:id/features/:featureId", authorizeRoles(['ADMIN']), updateFeature);

// ADMIN: Feature verwijderen
projectRouter.delete("/:id/features/:featureId", authorizeRoles(['ADMIN']), deleteFeature);

projectRouter.get("/admin/activity-log", authorizeRoles(['ADMIN']), getAdminActivityLog);