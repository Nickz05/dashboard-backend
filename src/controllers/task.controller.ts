import { Request, Response } from "express";
import prisma from "../config/db.config";

// ADMIN: Nieuwe taak aanmaken (User Story III.2)
export const createTask = async (req: Request, res: Response) => {
    const { title, description, projectId, isClientTask } = req.body;
    try {
        const task = await prisma.task.create({
            data: { title, description, projectId, isClientTask }
        });
        res.status(201).json(task);
    } catch (err) {
        res.status(500).json({ message: "Fout bij aanmaken taak." });
    }
};

// CLIENT: Feedback/Status update over een taak (User Story III.1)
export const updateTask = async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.id);
    const userId = req.userId!;
    const { status, feedback } = req.body; // Client mag status of feedback aanpassen

    try {
        const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
        if (!task || task.project.clientId !== userId) {
            return res.status(403).json({ message: "Toegang geweigerd: Taak is niet van dit project." });
        }

        // Taak van het project van de klant
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: { status, feedback }
        });

        // Hier moet de logica voor notificatie (III.4) komen.
        // Eenvoudige versie: console.log of een e-mail versturen.

        res.json(updatedTask);
    } catch (err) {
        res.status(500).json({ message: "Fout bij updaten taak." });
    }
};