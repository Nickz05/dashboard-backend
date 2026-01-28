import { Request, Response } from "express";
import prisma from "../config/db.config";
import { ProjectStatus, Role } from "@prisma/client";
import jwt from 'jsonwebtoken';

// Helper functie om activities te loggen
async function logActivity(
    projectId: number,
    userId: number,
    type: string,
    description: string,
    metadata?: any
) {
    try {
        await prisma.activity.create({
            data: {
                projectId,
                userId,
                type: type as any,
                description,
                metadata: metadata || {}
            }
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// ADMIN: Nieuw project aanmaken
export const createProject = async (req: Request, res: Response) => {
    try {
        const { title, description, clientId, contactPerson, stagingUrl, timeline } = req.body;
        const userId = req.userId!;

        const project = await prisma.project.create({
            data: {
                title,
                description,
                clientId: parseInt(clientId),
                contactPerson,
                stagingUrl,
                timeline
            }
        });

        // Log activity
        const user = await prisma.user.findUnique({ where: { id: userId } });
        await logActivity(
            project.id,
            userId,
            'PROJECT_CREATED',
            `${user?.name || 'Gebruiker'} heeft het project "${title}" aangemaakt`
        );

        res.status(201).json(project);
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij aanmaken project", error: err.message });
    }
};

// ADMIN & CLIENT: Alle projecten ophalen
export const getProjects = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        const commonInclude = {
            client: { select: { name: true, email: true } },
            tasks: true,
            files: true,
            invoices: true,
            comments: {
                orderBy: { createdAt: 'desc' as const },
                take: 5,
                include: {
                    author: { select: { name: true, role: true } }
                }
            },
            features: {
                orderBy: { createdAt: 'desc' as const }
            }
        };

        let projects;
        if (user?.role === Role.ADMIN) {
            projects = await prisma.project.findMany({
                include: commonInclude
            });
        } else {
            projects = await prisma.project.findMany({
                where: { clientId: userId },
                include: commonInclude
            });
        }

        res.json(projects || []);

    } catch (err: any) {
        console.error("Fout in getProjects:", err);
        res.status(500).json({ message: "Interne serverfout bij ophalen projecten.", error: err.message });
    }
};

// ADMIN & CLIENT: Project details ophalen
export const getProjectDetails = async (req: Request, res: Response) => {
    try {
        const projectId = parseInt(req.params.id);
        const userId = req.userId!;

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                tasks: true,
                files: true,
                invoices: true,
                client: { select: { name: true, email: true } },
                comments: {
                    orderBy: { createdAt: 'desc' as const },
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        authorId: true,
                        author: {
                            select: {
                                name: true,
                                role: true,
                                email: true
                            }
                        }
                    }
                },
                features: {
                    orderBy: [
                        { status: 'asc' as const },
                        { priority: 'desc' as const }
                    ]
                }
            }
        });

        if (!project) return res.status(404).json({ message: "Project niet gevonden" });

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (user?.role === Role.CLIENT && project.clientId !== userId) {
            return res.status(403).json({ message: "Toegang geweigerd." });
        }

        res.json(project);
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij ophalen project", error: err.message });
    }
};

// ADMIN: Project updaten (MET ACTIVITY TRACKING)
export const updateProject = async (req: Request, res: Response) => {
    try {
        const projectId = parseInt(req.params.id);
        const userId = req.userId!;
        const { title, description, clientId, contactPerson, stagingUrl, timeline, status } = req.body;

        // Haal het huidige project op
        const currentProject = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!currentProject) {
            return res.status(404).json({ message: "Project niet gevonden" });
        }

        // Haal gebruiker op
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const userName = user?.name || 'Gebruiker';

        const dataToUpdate: any = {
            title,
            description,
            clientId: clientId ? parseInt(clientId) : undefined,
            contactPerson,
            stagingUrl,
            timeline,
            status,
        };

        Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: dataToUpdate
        });

        // Log activities
        if (title && title !== currentProject.title) {
            await logActivity(
                projectId,
                userId,
                'TITLE_CHANGED',
                `${userName} wijzigde de titel van "${currentProject.title}" naar "${title}"`,
                { oldValue: currentProject.title, newValue: title }
            );
        }

        if (status && status !== currentProject.status) {
            const statusNames: Record<string, string> = {
                'CONCEPT': 'Concept',
                'IN_DESIGN': 'In Design',
                'WAITING_FOR_CONTENT': 'Wacht op Content',
                'DEVELOPMENT': 'In Ontwikkeling',
                'STAGING': 'Staging',
                'LIVE': 'Live'
            };

            await logActivity(
                projectId,
                userId,
                'STATUS_CHANGED',
                `${userName} wijzigde de status naar "${statusNames[status] || status}"`,
                { oldValue: currentProject.status, newValue: status }
            );
        }

        if (timeline && timeline !== currentProject.timeline) {
            await logActivity(
                projectId,
                userId,
                'TIMELINE_UPDATED',
                `${userName} heeft de timeline bijgewerkt`
            );
        }

        res.json(updatedProject);
        console.log('📤 Opgeslagen project:', updatedProject);
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij updaten project", error: err.message });
    }
};

// ADMIN: Project verwijderen
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const projectId = parseInt(req.params.id);
        const userId = req.userId!;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.role !== Role.ADMIN) {
            return res.status(403).json({ message: "Alleen admins kunnen projecten verwijderen" });
        }

        await prisma.project.delete({ where: { id: projectId } });
        res.json({ message: "Project succesvol verwijderd" });
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij verwijderen project", error: err.message });
    }
};

// ADMIN & CLIENT: Project comments ophalen
export const getProjectComments = async (req: Request, res: Response) => {
    try {
        const projectId = parseInt(req.params.id);
        const userId = req.userId!;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) return res.status(404).json({ message: "Project niet gevonden" });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.role === Role.CLIENT && project.clientId !== userId) {
            return res.status(403).json({ message: "Toegang geweigerd." });
        }

        const comments = await prisma.comment.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' as const },
            select: {
                id: true,
                content: true,
                createdAt: true,
                authorId: true,
                author: {
                    select: {
                        name: true,
                        role: true,
                        email: true
                    }
                }
            }
        });

        res.json(comments);
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij ophalen comments", error: err.message });
    }
};

// ADMIN & CLIENT: Comment toevoegen (MET ACTIVITY TRACKING)
export const addComment = async (req: Request, res: Response) => {
    try {
        const projectId = parseInt(req.params.id);
        const userId = req.userId!;
        const { content, parentId } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ message: "Comment mag niet leeg zijn" });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const project = await prisma.project.findUnique({ where: { id: projectId } });

        if (!project) return res.status(404).json({ message: "Project niet gevonden" });
        if (user?.role === 'CLIENT' && project.clientId !== userId) {
            return res.status(403).json({ message: "Toegang geweigerd" });
        }

        if (parentId) {
            const parent = await prisma.comment.findUnique({ where: { id: parseInt(parentId) } });
            if (!parent || parent.projectId !== projectId) {
                return res.status(400).json({ message: "Ongeldige parent comment" });
            }
        }

        const comment = await prisma.comment.create({
            data: {
                content: content.trim(),
                projectId,
                authorId: userId,
                parentId: parentId ? parseInt(parentId) : null,
            },
            select: {
                id: true,
                content: true,
                createdAt: true,
                author: { select: { name: true, role: true, email: true } },
                parentId: true,
            },
        });

        // Log activity (alleen voor top-level comments)
        if (!parentId) {
            const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
            await logActivity(
                projectId,
                userId,
                'COMMENT',
                `${user?.name} plaatste een opmerking: "${preview}"`,
                { commentId: comment.id }
            );
        }

        res.status(201).json(comment);
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij toevoegen comment", error: err.message });
    }
};

// ADMIN & CLIENT: Comment verwijderen
export const deleteComment = async (req: Request, res: Response) => {
    try {
        const commentId = parseInt(req.params.commentId);
        const userId = req.userId!;

        console.log('deleteComment called:', { commentId, userId });

        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: { project: true }
        });

        console.log('Comment found:', comment ? { id: comment.id, authorId: comment.authorId } : 'null');

        if (!comment) {
            return res.status(404).json({ message: "Comment niet gevonden" });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        console.log('Auth check:', {
            commentAuthorId: comment.authorId,
            userId,
            isAuthor: comment.authorId === userId,
            userRole: user?.role,
            isAdmin: user?.role === Role.ADMIN
        });

        if (comment.authorId !== userId && user?.role !== Role.ADMIN) {
            console.log('Authorization failed: not author and not admin');
            return res.status(403).json({ message: "Je kan alleen je eigen comments verwijderen" });
        }

        if (user?.role === Role.CLIENT && comment.project.clientId !== userId) {
            console.log('Authorization failed: client without project access');
            return res.status(403).json({ message: "Toegang geweigerd" });
        }

        console.log('Deleting comment:', commentId);
        await prisma.comment.delete({
            where: { id: commentId }
        });

        console.log('Comment deleted successfully');
        res.json({ message: "Comment succesvol verwijderd" });
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij verwijderen comment", error: err.message });
    }
};

// ADMIN: Feature toevoegen (MET ACTIVITY TRACKING)
export const addFeature = async (req: Request, res: Response) => {
    try {
        const projectId = parseInt(req.params.id);
        const { title, description, priority } = req.body;
        const userId = req.userId!;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.role !== Role.ADMIN) {
            return res.status(403).json({ message: "Alleen admins kunnen features toevoegen" });
        }

        if (!title) {
            return res.status(400).json({ message: "Feature titel is verplicht" });
        }

        const feature = await prisma.feature.create({
            data: {
                title,
                description: description || '',
                priority: priority || 'MEDIUM',
                status: 'TODO',
                projectId
            }
        });

        // Log activity
        await logActivity(
            projectId,
            userId,
            'FEATURE_ADDED',
            `${user.name} voegde feature toe: "${title}"`,
            { featureId: feature.id, priority }
        );

        res.status(201).json(feature);
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij toevoegen feature", error: err.message });
    }
};

// ADMIN: Feature updaten (MET ACTIVITY TRACKING)
export const updateFeature = async (req: Request, res: Response) => {
    try {
        const featureId = parseInt(req.params.featureId);
        const { status, title, description, priority } = req.body;
        const userId = req.userId!;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.role !== Role.ADMIN) {
            return res.status(403).json({ message: "Alleen admins kunnen features aanpassen" });
        }

        const currentFeature = await prisma.feature.findUnique({
            where: { id: featureId },
            include: { project: true }
        });

        if (!currentFeature) {
            return res.status(404).json({ message: "Feature niet gevonden" });
        }

        const updateData: any = {};
        if (status) updateData.status = status;
        if (title) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (priority) updateData.priority = priority;

        const updatedFeature = await prisma.feature.update({
            where: { id: featureId },
            data: updateData
        });

        // Log activity voor status wijziging
        if (status && status !== currentFeature.status) {
            const statusNames: Record<string, string> = {
                'TODO': 'Te Doen',
                'IN_PROGRESS': 'In Uitvoering',
                'COMPLETED': 'Afgerond'
            };

            let activityDescription = '';
            if (status === 'COMPLETED') {
                activityDescription = `${user.name} heeft feature "${currentFeature.title}" afgerond ✅`;
            } else {
                activityDescription = `${user.name} wijzigde status van feature "${currentFeature.title}" naar ${statusNames[status]}`;
            }

            await logActivity(
                currentFeature.projectId,
                userId,
                'FEATURE_UPDATED',
                activityDescription,
                {
                    featureId,
                    oldStatus: currentFeature.status,
                    newStatus: status
                }
            );
        }

        res.json(updatedFeature);
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij updaten feature", error: err.message });
    }
};

// ADMIN: Feature verwijderen (MET ACTIVITY TRACKING)
export const deleteFeature = async (req: Request, res: Response) => {
    try {
        const featureId = parseInt(req.params.featureId);
        const userId = req.userId!;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.role !== Role.ADMIN) {
            return res.status(403).json({ message: "Alleen admins kunnen features verwijderen" });
        }

        const feature = await prisma.feature.findUnique({
            where: { id: featureId }
        });

        if (!feature) {
            return res.status(404).json({ message: "Feature niet gevonden" });
        }

        await prisma.feature.delete({
            where: { id: featureId }
        });

        // Log activity
        await logActivity(
            feature.projectId,
            userId,
            'FEATURE_DELETED',
            `${user.name} verwijderde feature: "${feature.title}"`,
            { featureId, title: feature.title }
        );

        res.json({ message: "Feature succesvol verwijderd" });
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij verwijderen feature", error: err.message });
    }
};

// Project stats met activities
export const getProjectStats = async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.id);
    const userId = req.userId!;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: "Project niet gevonden" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === Role.CLIENT && project.clientId !== userId)
        return res.status(403).json({ message: "Toegang geweigerd" });

    const [
        totalFeatures,
        completedFeatures,
        inProgressFeatures,
        todoFeatures,
        recentComments,
        recentActivities
    ] = await Promise.all([
        prisma.feature.count({ where: { projectId } }),
        prisma.feature.count({ where: { projectId, status: 'COMPLETED' } }),
        prisma.feature.count({ where: { projectId, status: 'IN_PROGRESS' } }),
        prisma.feature.count({ where: { projectId, status: 'TODO' } }),
        prisma.comment.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                content: true,
                createdAt: true,
                author: { select: { name: true } }
            }
        }),
        // Haal echte activities op
        prisma.activity.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                user: {
                    select: {
                        name: true
                    }
                }
            }
        })
    ]);

    // Converteer activities
    const formattedActivities = recentActivities.map(activity => ({
        id: `activity-${activity.id}`,
        type: activity.type.toLowerCase(),
        description: activity.description,
        timestamp: activity.createdAt.toISOString(),
        author: {
            name: activity.user.name
        }
    }));

    res.json({
        totalFeatures,
        completedFeatures,
        inProgressFeatures,
        todoFeatures,
        recentComments,
        recentActivities: formattedActivities
    });
};

// project.controller.ts

// ... (logActivity en andere imports/functies blijven ongewijzigd)

// Admin dashboard stats - AANGEPASTE IMPLEMENTATIE
export const getAdminDashboardStats = async (req: Request, res: Response) => {
    try {
        console.log('Fetching projects for admin dashboard...');

        const token = req.headers.authorization?.split(' ')[1];
        let adminId: number | undefined;

        if (token) {
            try {
                // Gebruik van JWT voor adminId voor comment-filterlogica
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
                adminId = decoded.id;
                console.log('Decoded admin ID from token:', adminId);
            } catch (error) {
                console.error('Error decoding token:', error);
            }
        }

        // Haal projecten op met comments en features voor stats en openCommentsCount
        const projects = await prisma.project.findMany({
            include: {
                features: true,
                comments: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                name: true,
                                role: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: "desc"
                    }
                },
                client: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        console.log('Projects fetched:', projects.length);
        const projectIds = projects.map(p => p.id); // Verzamel alle project ID's

        // BEREKENING VAN OPEN COMMENTS COUNT (blijft ongewijzigd)
        const openCommentsCount = projects.reduce((total, project) => {
            const topLevelComments = project.comments.filter(c => c.parentId === null);

            const hasUnrepliedComment = topLevelComments.some(comment => {
                const replies = project.comments.filter(r => r.parentId === comment.id);

                console.log(`Comment ${comment.id} - authorId: ${comment.authorId}, replies: ${replies.length}`);

                if (replies.length === 0) {
                    const shouldCount = comment.authorId !== adminId;
                    console.log(`  No replies - original by admin? ${comment.authorId === adminId}, shouldCount: ${shouldCount}`);
                    return shouldCount;
                }

                replies.sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                const lastReply = replies[0];
                console.log(`  Last reply authorId: ${lastReply.authorId}, admin: ${adminId}`);

                const shouldCount = lastReply.authorId !== adminId;
                console.log(`  Should count: ${shouldCount}`);
                return shouldCount;
            });

            console.log(`Project ${project.title}: hasUnrepliedComment: ${hasUnrepliedComment}`);

            return total + (hasUnrepliedComment ? 1 : 0);
        }, 0);

        console.log('Total open comments:', openCommentsCount);

        // OPHALEN EN FORMATTEREN VAN ECHTE ACTIVITIES (De correctie)
        const recentActivitiesData = await prisma.activity.findMany({
            where: {
                projectId: {
                    in: projectIds, // Haal activities op voor alle projecten
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                user: {
                    select: {
                        name: true
                    }
                },
                project: { // Projecttitel is nodig voor context in de Admin view
                    select: {
                        title: true
                    }
                }
            }
        });

        const formattedActivities = recentActivitiesData.map(activity => {
            // Voeg de projecttitel toe aan de beschrijving, behalve voor PROJECT_CREATED
            let description = activity.description;
            if (activity.type !== 'PROJECT_CREATED' && activity.project?.title) {
                description = `[${activity.project.title}] ${activity.description}`;
            }

            return {
                id: `activity-${activity.id}`,
                type: activity.type.toLowerCase(), // Frontend verwacht lowercase
                description: description,
                timestamp: activity.createdAt.toISOString(),
                author: {
                    name: activity.user.name
                }
            };
        });

        res.json({
            openCommentsCount,
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status !== 'CONCEPT').length,
            recentActivities: formattedActivities, // Gebruik nu de correcte, echte activiteiten
            totalFeatures: projects.reduce((sum, p) => sum + (p.features?.length || 0), 0),
            completedFeatures: projects.reduce((sum, p) =>
                sum + (p.features?.filter(f => f.status === 'COMPLETED').length || 0), 0
            ),
            inProgressFeatures: projects.reduce((sum, p) =>
                sum + (p.features?.filter(f => f.status === 'IN_PROGRESS').length || 0), 0
            ),
            todoFeatures: projects.reduce((sum, p) =>
                sum + (p.features?.filter(f => f.status === 'TODO').length || 0), 0
            )
        });

    } catch (error) {
        console.error("Error in getAdminDashboardStats:", error);
        res.status(500).json({
            message: "Error fetching admin dashboard stats",
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// src/controllers/project.controller.ts

// ...

// ADMIN: Logs ophalen binnen tijdsbestek voor export
export const getAdminActivityLog = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query; // Query parameters
        const userId = req.userId!;

        const start = startDate ? new Date(startDate as string) : new Date(0);
        const end = endDate ? new Date(endDate as string) : new Date();
        end.setHours(23, 59, 59, 999); // Zorg ervoor dat de einddatum de hele dag dekt

        // Haal alle relevante activiteiten op tussen de tijden
        const activities = await prisma.activity.findMany({
            where: {
                createdAt: {
                    gte: start, // Greater than or equal to (vanaf)
                    lte: end    // Less than or equal to (tot)
                },
                // Optionele filtering op Admin-gerelateerde types (u kunt dit aanpassen)
                type: {
                    in: ['FEATURE_ADDED', 'FEATURE_UPDATED', 'FEATURE_DELETED', 'STATUS_CHANGED', 'TITLE_CHANGED', 'TIMELINE_UPDATED', 'PROJECT_CREATED'] // Admin-acties
                }
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, email: true } },
                project: { select: { title: true } }
            }
        });

        // Formatteren voor download (bijv. CSV-achtig formaat of simpel JSON)
        const formattedLogs = activities.map(a => ({
            timestamp: a.createdAt.toISOString(),
            user: a.user.name,
            email: a.user.email,
            project: a.project.title,
            activityType: a.type,
            description: a.description,
            metadata: a.metadata,
        }));

        // Nu stuurt u de data terug. De frontend is verantwoordelijk voor de SVG-generatie.
        res.json(formattedLogs);
    } catch (err: any) {
        res.status(500).json({ message: "Fout bij ophalen logs", error: err.message });
    }
};