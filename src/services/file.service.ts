// src/services/file.service.ts

import cloudinary from '../config/cloudinary.config';
import prisma from '../config/db.config';
import fs from 'fs';

export async function uploadFileToCloudinary(
    filePath: string,
    originalName: string,
    projectId: number,
    userId: number,
    mimeType?: string
) {
    let uploadResult: any = null;

    try {
        console.log('☁️ Cloudinary Upload gestart:', {
            originalName,
            projectId,
            userId,
            localPath: filePath
        });

        // Check of het lokale bestand bestaat voordat we uploaden
        if (!fs.existsSync(filePath)) {
            throw new Error(`Lokaal bestand niet gevonden: ${filePath}`);
        }

        const fileStats = fs.statSync(filePath);
        console.log('📊 Bestandsinfo:', {
            size: `${(fileStats.size / 1024 / 1024).toFixed(2)}MB`,
            exists: true
        });

        // Upload het lokaal opgeslagen bestand naar Cloudinary
        uploadResult = await cloudinary.uploader.upload(filePath, {
            folder: `projects/${projectId}/files`,
            resource_type: 'auto',
            public_id: `${Date.now()}_${originalName.replace(/\s/g, '_')}`,
        });

        console.log('✅ Cloudinary upload succesvol:', {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            format: uploadResult.format
        });

        // 1. **Database Registratie:**
        const file = await prisma.file.create({
            data: {
                projectId: projectId,
                fileName: originalName,
                fileUrl: uploadResult.secure_url,
                fileType: mimeType || uploadResult.format || 'unknown',
                uploadedBy: 'CLIENT',
                uploaderId: userId,  // ✅ CORRECT - uploaderId zoals in schema
            }
        });

        console.log('✅ Database registratie succesvol:', {
            fileId: file.id,
            fileName: file.fileName
        });

        return {
            id: file.id,
            name: file.fileName,
            fileUrl: file.fileUrl,
            message: "Bestand succesvol geüpload en geregistreerd."
        };

    } catch (error: any) {
        console.error('❌ Upload naar Cloudinary mislukt:', {
            error: error.message,
            code: error.http_code,
            stack: error.stack
        });

        // Specifieke error messages voor debugging
        if (error.http_code === 401) {
            throw new Error('Cloudinary authenticatie mislukt. Check je API credentials.');
        } else if (error.http_code === 400) {
            throw new Error('Ongeldige upload parameters. Check bestandstype en grootte.');
        } else if (error.message?.includes('ENOENT')) {
            throw new Error('Lokaal bestand niet gevonden. Mogelijk al verwijderd.');
        } else {
            throw new Error(`Bestandsupload mislukt: ${error.message}`);
        }

    } finally {
        // Veilig verwijderen van het tijdelijke bestand
        if (filePath && fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error("⚠️ Fout bij verwijderen tijdelijk bestand:", err);
                } else {
                    console.log("🧹 Tijdelijk bestand verwijderd:", filePath);
                }
            });
        }
    }
}