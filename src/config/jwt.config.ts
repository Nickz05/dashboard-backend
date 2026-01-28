// src/config/jwt.config.ts

export const jwtConfig = {
    // Zorg ervoor dat dit dezelfde sleutel is als de JWT_SECRET in je .env
    secret: process.env.JWT_SECRET || "5q6Esj5dkpBesWCg&TT4RJvnaq7Nfpb46C5jwmbeTwa4Qez@NWYdHd4Dh8Q@33XbeKDh^4A8q6Rsy6EtwfkEh3a4D6QvjLTWUS^QckAAGBuYZUC&7TwBLf&9@E@JWk&&LmhiTkBRBVZoCfTzR7SFam",
    expiresIn: "1h",
};