import app from "./app";
import dotenv from "dotenv";
import {initializeAdmin} from "./utils/InitAdmin";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await initializeAdmin();

    app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
};

startServer();