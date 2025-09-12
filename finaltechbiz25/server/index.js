import path from "node:path";
import fs from "node:fs";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";

import { pool } from "../src/db.js";
import authRouter from "../src/routes/auth.js";
import certificatesRouter from "../src/routes/certificates.js";
import companiesRouter from "../src/routes/companies.js";
import signaturesRouter from "../src/routes/signatures.js";
import applicationsRouter from "../src/routes/applications.js";
import { ensureCompanyKeypairs } from "../src/cryptoKeys.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Ensure required directories exist
const uploadDir = process.env.UPLOAD_DIR || "uploads";
fs.mkdirSync(uploadDir, { recursive: true });

// Ensure RSA keypairs exist in companies.json on startup (dev/demo purpose)
ensureCompanyKeypairs();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), "public")));

// Health
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("select 1 as ok");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/certificates", certificatesRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/signatures", signaturesRouter);
app.use("/api/applications", applicationsRouter);

// Fallback to index.html for simple front-end pages
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});


