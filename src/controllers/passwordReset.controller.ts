import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from "../config/db.config";
import {sendPasswordResetEmail} from "../services/emailService";

// ✅ Stap 1: Request password reset (verstuur email)
export const requestPasswordReset = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        // ✅ Haal gebruiker op
        const user = await prisma.user.findUnique({ where: { email } });

        // ✅ BELANGRIJK: Altijd hetzelfde antwoord geven (security)
        // Zo kan een aanvaller niet zien of een email bestaat
        if (!user) {
            return res.status(200).json({
                message: "If this email exists, a password reset link has been sent"
            });
        }

        // ✅ Genereer een veilige reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // ✅ Sla token op in database met expiratie (1 uur)
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 uur

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: resetTokenHash,
                resetTokenExpiry: resetTokenExpiry,
            },
        });

        const baseUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
        await sendPasswordResetEmail(user.email, user.name || 'Gebruiker', resetUrl);

        // ✅ Generiek succesbericht
        res.status(200).json({
            message: "If this email exists, a password reset link has been sent"
        });

    } catch (err: any) {
        console.error('Password reset request error:', err);
        res.status(500).json({
            message: "An error occurred while processing your request"
        });
    }
};

// ✅ Stap 2: Reset password met token
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                message: "Token and new password are required"
            });
        }

        // ✅ Valideer wachtwoord sterkte
        if (newPassword.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long"
            });
        }

        // ✅ Hash de token om te vergelijken met database
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // ✅ Zoek gebruiker met geldige token
        const user = await prisma.user.findFirst({
            where: {
                resetToken: resetTokenHash,
                resetTokenExpiry: {
                    gte: new Date(), // Token moet nog niet verlopen zijn
                },
            },
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid or expired reset token"
            });
        }

        // ✅ Hash nieuw wachtwoord
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // ✅ Update wachtwoord en verwijder reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
                mustChangePassword: false, // Optioneel
            },
        });

        res.status(200).json({
            message: "Password has been reset successfully"
        });

    } catch (err: any) {
        console.error('Password reset error:', err);
        res.status(500).json({
            message: "An error occurred while resetting your password"
        });
    }
};