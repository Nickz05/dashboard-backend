import { Request, Response } from "express";
import prisma from "../config/db.config";

// ✅ Profielinformatie ophalen van de ingelogde gebruiker
export const getProfile = async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Niet geauthenticeerd." });

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, role: true, mustChangePassword: true },
        });

        if (!user) return res.status(404).json({ message: "Gebruiker niet gevonden." });

        res.json(user);
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij ophalen profiel." });
    }
};

// ✅ Profielinformatie bijwerken
export const updateProfile = async (req: Request, res: Response) => {
    const userId = req.userId;
    const { name, email } = req.body;

    if (!userId) return res.status(401).json({ message: "Niet geauthenticeerd." });

    try {
        if (email) {
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing && existing.id !== userId) {
                return res.status(400).json({ message: "Dit e-mailadres is al in gebruik." });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { name, email },
            select: { id: true, email: true, name: true, role: true }
        });

        res.json(updatedUser);
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij bijwerken profiel." });
    }
};

// ✅ Alle gebruikers ophalen (alleen voor ADMIN)
export const getAllUsers = async (req: Request, res: Response) => {
    const userId = req.userId;

    try {
        const requestingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (requestingUser?.role !== 'ADMIN') {
            return res.status(403).json({ message: "Geen toegang: alleen admins mogen gebruikers beheren." });
        }

        const users = await prisma.user.findMany({
            select: { id: true, email: true, name: true, role: true }
        });

        res.json(users);
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij ophalen gebruikerslijst." });
    }

};

export const deleteUser = async (req: Request, res: Response) => {
    const userId = req.userId;
    const targetId = parseInt(req.params.id);

    if (!userId) return res.status(401).json({ message: "Niet geauthenticeerd." });

    try {
        const requestingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (requestingUser?.role !== 'ADMIN') {
            return res.status(403).json({ message: "Geen toegang: alleen admins mogen gebruikers verwijderen." });
        }

        await prisma.user.delete({
            where: { id: targetId }
        });

        res.json({ message: `Gebruiker ${targetId} succesvol verwijderd.` });
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij verwijderen gebruiker." });
    }
};

import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

export const createUser = async (req: Request, res: Response) => {
    const userId = req.userId;
    const { name, email, role } = req.body;

    if (!userId) return res.status(401).json({ message: "Niet geauthenticeerd." });

    try {
        const requestingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (requestingUser?.role !== 'ADMIN') {
            return res.status(403).json({ message: "Geen toegang: alleen admins mogen gebruikers aanmaken." });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ message: "E-mailadres is al in gebruik." });
        }

        // 🔐 Genereer een uniek wachtwoord
        const plainPassword = randomBytes(8).toString('hex'); // bv. 16 tekens

        // 🔒 Hash het wachtwoord
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // 👤 Maak gebruiker aan
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                role: role || 'CLIENT',
                password: hashedPassword
            },
            select: { id: true, name: true, email: true, role: true }
        });

        // ✅ Toon wachtwoord aan admin
        res.status(201).json({
            user: newUser,
            generatedPassword: plainPassword
        });

    } catch (err: any) {
        res.status(500).json({ message: "Fout bij aanmaken gebruiker." });
    }
};