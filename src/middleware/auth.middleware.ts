// src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.config"; // Gebruik je eigen config

// Breid de Express Request interface uit om de gebruiker-ID op te slaan
declare global {
    namespace Express {
        interface Request {
            userId?: number;
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // 1. Haal de token op uit de Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication vereist: Geen token verstrekt." });
    }

    const token = authHeader.split(" ")[1];

    try {
        // 2. Verifieer de token
        const decoded = jwt.verify(token, jwtConfig.secret) as { id: number, email: string };

        // 3. Sla de gebruiker-ID op in het request object
        // Dit maakt de ID beschikbaar voor je controllers
        req.userId = decoded.id;

        // 4. Ga verder naar de volgende middleware of controller
        next();
    } catch (err) {
        // 5. Afhandeling van ongeldige tokens (verlopen, foutieve handtekening)
        return res.status(401).json({ message: "Ongeldig token of token verlopen." });
    }
};