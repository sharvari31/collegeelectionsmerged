// backend/server/server.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import voteRoutes from "./routes/vote.routes.js";
import electionRoutes from "./routes/election.routes.js";
import candidateRoutes from "./routes/candidate.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import resultsRoutes from "./routes/results.routes.js";

// ⬇️ for serving the built frontend in production
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

// ✅ Dynamic CORS — works locally and after deployment
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// ✅ API routes
app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/results", resultsRoutes);

// ⬇️ Serve frontend build when running in production (Render, etc.)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === "production") {
  // path to: <repo-root>/client/dist
  const frontendPath = path.join(__dirname, "../../client/dist");
  app.use(express.static(frontendPath));

  // let React Router handle remaining routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

const PORT = process.env.PORT || 5000;

// ✅ Connect DB and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
});
