import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import {authRouter} from "./routes/auth.routes";
import {passwordResetRouter} from "./routes/passwordReset.routes"; // ✅ TOEVOEGEN
import {userRouter} from "./routes/user.routes";
import {projectRouter} from "./routes/project.routes";
import {taskRouter} from "./routes/task.routes";
import {fileRouter} from "./routes/file.routes";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
    'http://localhost:5173',
    'https://dashboard.nickzomer.com',
    process.env.FRONTEND_URL || '',
];

const corsOptions: cors.CorsOptions = {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads'));


app.use("/api/auth", passwordResetRouter); // ✅ TOEVOEGEN - EERST!

// Routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/projects", projectRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/files", fileRouter);

// Testroute
app.get("/", (_, res) => {
    res.send("🌞 Zomer Development Dashboard API running");
});

export default app;