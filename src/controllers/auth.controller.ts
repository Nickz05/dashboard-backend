import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import prisma from "../config/db.config";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// ✅ Registratie door admin
export const register = async (req: Request, res: Response) => {
    const requesterId = req.userId;

    if (!requesterId) return res.status(401).json({ message: "Niet geauthenticeerd." });

    try {
        const requester = await prisma.user.findUnique({
            where: { id: requesterId },
            select: { role: true }
        });

        if (requester?.role !== 'ADMIN') {
            return res.status(403).json({ message: "Alleen admins mogen gebruikers registreren." });
        }

        const { name, email, role } = req.body;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ message: "Email already in use" });

        const plainPassword = crypto.randomBytes(8).toString('hex');
        const hashed = await bcrypt.hash(plainPassword, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                role,
                password: hashed,
                mustChangePassword: true
            },
        });

        res.status(201).json({
            message: "User registered successfully",
            user: { id: user.id, email: user.email, role: user.role },
            generatedPassword: plainPassword
        });
    } catch (err: any) {
        console.error("Fout bij registreren gebruiker:", err);
        res.status(500).json({ message: "Error registering user", error: err.message });
    }
};

// ✅ Login
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // ✅ Fetch user
        const user = await prisma.user.findUnique({ where: { email } });

        // ✅ Check password (even if user doesn't exist)
        // This prevents timing attacks by always executing bcrypt.compare
        const passwordToCheck = user?.password || '$2b$10$InvalidHashToPreventTimingAttack';
        const valid = await bcrypt.compare(password, passwordToCheck);

        // ✅ Generic error message for both cases
        if (!user || !valid) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // ✅ Generate token WITH role
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role  // ← TOEGEVOEGD!
            },
            JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.json({
            message: "Login successful",
            token,
            mustChangePassword: user.mustChangePassword
        });
    } catch (err: any) {
        res.status(500).json({
            message: "An error occurred during login",
            error: err.message
        });
    }
};

// ✅ Wachtwoord wijzigen na eerste login
export const changePassword = async (req: Request, res: Response) => {
    const userId = req.userId;
    const { newPassword, confirmPassword } = req.body;

    if (!userId) return res.status(401).json({ message: "Niet geauthenticeerd." });

    if (!newPassword || newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Wachtwoorden komen niet overeen." });
    }

    try {
        const hashed = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashed,
                mustChangePassword: false
            }
        });

        res.json({ message: "Wachtwoord succesvol gewijzigd." });
    } catch (err: any) {
        console.error("Fout bij wijzigen wachtwoord:", err);
        res.status(500).json({ message: "Error changing password", error: err.message });
    }
};