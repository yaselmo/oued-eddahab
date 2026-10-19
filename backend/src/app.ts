import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes.js";
import locationRoutes from "./modules/locations/locations.routes.js";
import profileRoutes from "./modules/profile/profile.routes.js";
import resourcesRoutes from "./modules/resources/resources.routes.js";
import clubsRoutes from "./modules/clubs/clubs.routes.js";

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
app.use("/api/locations", locationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/resources", resourcesRoutes);
app.use("/api/clubs", clubsRoutes);

export default app;
