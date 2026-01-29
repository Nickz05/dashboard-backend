// src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.config";

// Breid de Express Request interface uit om userId EN userRole op te slaan
declare global {
    namespace Express {
        interface Request {
            userId?: number;
            userRole?: 'ADMIN' | 'CLIENT';  // ← NIEUW
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
        // 2. Verifieer de token en voeg role toe aan type
        const decoded = jwt.verify(token, jwtConfig.secret) as {
            id: number;
            email: string;
            role: 'ADMIN' | 'CLIENT';  // ← NIEUW
        };

        // 3. Sla de gebruiker-ID EN role op in het request object
        req.userId = decoded.id;
        req.userRole = decoded.role;  // ← NIEUW

        // 4. Ga verder naar de volgende middleware of controller
        next();
    } catch (err) {
        // 5. Afhandeling van ongeldige tokens (verlopen, foutieve handtekening)
        return res.status(401).json({ message: "Ongeldig token of token verlopen." });
    }
};