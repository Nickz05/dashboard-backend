import bcrypt from "bcrypt";
import prisma from "../config/db.config";

export const initializeAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const adminName = process.env.ADMIN_NAME || "Admin";

        if (!adminEmail || !adminPassword) {
            console.log("ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping admin creation");
            return;
        }

        // Check if admin already exists
        const existingAdmin = await prisma.user.findUnique({
            where: { email: adminEmail }
        });

        if (existingAdmin) {
            console.log("Admin account already exists:", adminEmail);
            return;
        }

        // Create admin account
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const admin = await prisma.user.create({
            data: {
                name: adminName,
                email: adminEmail,
                password: hashedPassword,
                role: "ADMIN",
                mustChangePassword: false
            }
        });

        console.log("Admin account created successfully:", admin.email);
    } catch (error) {
        console.error("Error creating admin account:", error);
    }
};