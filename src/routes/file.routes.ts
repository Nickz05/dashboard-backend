import { Router } from "express";

import { uploadFile, createInvoice } from "../controllers/file.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

// Importeer de controller voor het ophalen van de lijst
import { getProjectFiles } from "../controllers/file.controller";

export const fileRouter = Router();

fileRouter.use(authMiddleware);

// CLIENT/ADMIN: Bestanden uploaden voor een specifiek project
fileRouter.post("/projects/:projectId/upload", authorizeRoles(['CLIENT', 'ADMIN']), uploadFile);

// ADMIN & CLIENT: Lijst van geüploade bestanden voor een project ophalen (NU MET /list)
fileRouter.get(
    '/projects/:projectId',
    authorizeRoles(['CLIENT', 'ADMIN']),
    getProjectFiles
);
// ADMIN: Facturen en contracten toevoegen
fileRouter.post("/invoice", authorizeRoles(['ADMIN']), createInvoice);

// TO DO: voeg fileRouter toe aan app.ts (app.use('/api/files', fileRouter);)