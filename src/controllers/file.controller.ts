// src/controllers/file.controller.ts

import { Request, Response, NextFunction } from "express";
import multer from "multer";
import prisma from "../config/db.config"; // Zorg dat dit de correcte import is voor je Prisma client
import { uploadFileToCloudinary } from "../services/file.service";
import fs from 'fs';

// De multer-configuratie voor TIJDELIJKE lokale opslag voordat het naar Cloudinary gaat.
const upload = multer({ dest: 'temp/' });

// Custom Request interface voor type safety
interface CustomRequest extends Request {
    userId?: number;
    userRole?: 'ADMIN' | 'CLIENT';
}

// Helper functie voor veilig bestand verwijderen
const safeUnlink = (filePath: string) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('✅ Temp bestand verwijderd:', filePath);
        }
    } catch (error) {
        console.error('⚠️ Fout bij verwijderen temp bestand:', error);
        // Niet verder crashen als cleanup faalt
    }
};

// ------------------------------------
// 1. Upload Bestand (POST)
// ------------------------------------
export const uploadFile = [
    // 1. Multer middleware: slaat het inkomende bestand tijdelijk op
    upload.single('file'),

    // 2. Controller handler
    async (req: CustomRequest, res: Response, next: NextFunction) => {

        // Gebruik de veiliger getypte properties van CustomRequest
        const userId = req.userId;
        const userRole = req.userRole;

        // Haal projectId uit de URL, of probeer de body als fallback
        const projectIdFromParam = parseInt(req.params.projectId as string);
        const projectId = isNaN(projectIdFromParam) ? parseInt(req.body.projectId) : projectIdFromParam;

        console.log('📥 Upload aanvraag ontvangen:', {
            userId,
            userRole,
            projectId,
            hasFile: !!req.file,
            fileName: req.file?.originalname
        });

        if (!req.file || !userId) {
            // Opruimen als er een bestand is geüpload maar er geen user of ID is
            if (req.file) safeUnlink(req.file.path);
            return res.status(400).json({ message: "Geen bestand of gebruiker geauthenticeerd." });
        }

        try {
            // Controleer of het project bestaat en van de klant is
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                select: { clientId: true }
            });

            console.log('🔍 Project gevonden:', project);

            // Controle logica
            const isClient = project?.clientId === userId;

            // Fix: Check of de gebruiker de Client is OF een ADMIN
            const hasAccess = isClient || userRole === 'ADMIN';

            console.log('🔐 Toegangscontrole:', { isClient, userRole, hasAccess });

            if (!project || !hasAccess) {
                safeUnlink(req.file.path);
                return res.status(403).json({ message: "Toegang geweigerd: Project niet gevonden of onvoldoende rechten." });
            }

            console.log('☁️ Start Cloudinary upload...');

            // ROEP DE CLOUDINARY SERVICE AAN (zorgt ook voor database registratie en cleanup)
            const result = await uploadFileToCloudinary(
                req.file.path,
                req.file.originalname,
                projectId,
                userId,
                req.file.mimetype
            );

            console.log('✅ Upload succesvol:', result);

            res.status(201).json(result);

        } catch (err: any) {
            console.error('❌ Upload fout:', err);

            // Opruimen bij fouten - gebruik safe unlink
            if (req.file) safeUnlink(req.file.path);

            // Stuur een bruikbare error message terug
            res.status(500).json({
                message: "Upload mislukt",
                error: err.message,
                details: process.env.NODE_ENV === 'development' ? err.stack : undefined
            });
        }
    }
];

// ------------------------------------
// 2. Lijst Bestanden Ophalen (GET)
// ------------------------------------
export const getProjectFiles = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const projectId = parseInt(req.params.projectId as string);
    const userId = req.userId;
    const userRole = req.userRole;

    if (isNaN(projectId) || !userId) {
        return res.status(400).json({ message: "Ongeldig Project ID of gebruiker niet geauthenticeerd." });
    }

    try {
        // Controleer op toegang
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { clientId: true }
        });

        const isClient = project?.clientId === userId;

        // Fix: Maak de toegangscontrole expliciet: Client is OK of Admin is OK
        const hasAccess = isClient || userRole === 'ADMIN';

        if (!project || !hasAccess) {
            return res.status(403).json({ message: "Toegang geweigerd." });
        }

        // Haal alle bestanden voor dit project op
        const files = await prisma.file.findMany({
            where: { projectId: projectId },
            // Sorteer op recentste upload (optioneel, maar aanbevolen)
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                fileName: true,
                fileUrl: true,
                uploadedBy: true,
                createdAt: true,
                // Haal de uploader naam op om de 'uploadedBy' string in de frontend te vullen
                uploader: {
                    select: { name: true }
                }
            }
        });

        // Formatteer de output om de client's interface te matchen
        const formattedFiles = files.map(file => ({
            id: file.id,
            fileName: file.fileName,
            fileUrl: file.fileUrl,
            // Gebruik de naam van de uploader, of val terug op de opgeslagen rol
            uploadedBy: file.uploadedBy === 'ADMIN' ? 'Zomer Dev' : (file.uploader?.name || 'Client'),
            createdAt: file.createdAt.toISOString(),
        }));


        res.status(200).json(formattedFiles);

    } catch (err) {
        next(err);
    }
};

// ------------------------------------
// 3. Factuur Aanmaken (POST)
// ------------------------------------
export const createInvoice = async (req: Request, res: Response) => {
    // ... (bestaande logica)
    const { invoiceNumber, amount, dueDate, projectId, fileUrl } = req.body;
    try {
        const invoice = await prisma.invoice.create({
            data: { invoiceNumber, amount, dueDate: new Date(dueDate), projectId, fileUrl }
        });
        res.status(201).json(invoice);
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij aanmaken factuur.", error: err.message });
    }
};