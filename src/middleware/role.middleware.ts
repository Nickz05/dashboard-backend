import { Request, Response, NextFunction } from "express";
import prisma from "../config/db.config"; // Zorg dat het pad klopt

// Definieer de rollen die toegang hebben
export const authorizeRoles = (roles: Array<'ADMIN' | 'CLIENT'>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.userId) {
            return res.status(401).json({ message: "Autorisatie vereist." });
        }

        try {
            const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });

            if (!user) {
                return res.status(404).json({ message: "Gebruiker niet gevonden." });
            }

            // Controleer of de rol van de gebruiker in de toegestane rollenlijst staat
            if (!roles.includes(user.role as 'ADMIN' | 'CLIENT')) {
                return res.status(403).json({ message: "Toegang geweigerd: Onvoldoende rechten." });
            }

            next();
        } catch (error) {
            res.status(500).json({ message: "Fout bij autorisatie." });
        }
    };
};