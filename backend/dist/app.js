import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
const app = express();
app.use(cors());
app.use(express.json());
app.get("/api/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Oued Eddahab API is running",
    });
});
app.use("/api/auth", authRoutes);
export default app;
//# sourceMappingURL=app.js.map