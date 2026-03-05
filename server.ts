import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { initDb } from "./src/server/db";
import { setupRoutes } from "./src/server/routes";
import { startDetectionEngine } from "./src/server/engine/detection";
import { startLogSimulator } from "./src/server/engine/simulator";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Initialize Database
  initDb();

  app.use(express.json());

  // Setup API Routes
  setupRoutes(app, io);

  // Start Detection Engine & Simulator
  startDetectionEngine(io);
  startLogSimulator();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Sentinel SOC running on http://localhost:${PORT}`);
  });
}

startServer();
