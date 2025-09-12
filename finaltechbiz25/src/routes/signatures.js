import express from "express";
import fs from "node:fs";
import path from "node:path";
import Joi from "joi";
import jwt from "jsonwebtoken";
import { signCredentialsWithCompany, verifyCredentialsWithCompany } from "../cryptoKeys.js";

const router = express.Router();

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function loadCompanies() {
  const companiesPath = path.join(process.cwd(), "src", "companies.json");
  try {
    const raw = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

// Generate a text file containing signatures per company for the provided credentials
router.post("/generate", auth, async (req, res) => {
  const schema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const { email, password } = value;

  const companies = loadCompanies();
  const lines = [];
  for (const entry of companies) {
    const name = entry.Name || entry.name || "";
    const cin = entry.CIN || entry.cin || "";
    const key = cin || name;
    if (!key) continue;
    const signature = signCredentialsWithCompany(key, email, password);
    lines.push(`${name}\t${cin}\t${signature || ""}`);
  }

  const outDir = path.join(process.cwd(), "uploads");
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `signatures-${Date.now()}.txt`);
  fs.writeFileSync(filePath, lines.join("\n"));
  res.json({ filePath });
});

// Generate a JSON file containing signatures per company for the provided credentials
router.post("/generate-json", auth, async (req, res) => {
  const schema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const { email, password } = value;

  const companies = loadCompanies();
  const items = [];
  for (const entry of companies) {
    const name = entry.Name || entry.name || "";
    const cin = entry.CIN || entry.cin || "";
    const key = cin || name;
    if (!key) continue;
    const signatureBase64 = signCredentialsWithCompany(key, email, password) || "";
    items.push({ name, cin, signatureBase64 });
  }

  const outDir = path.join(process.cwd(), "uploads");
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `signatures-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ email, items }, null, 2));
  res.json({ filePath, count: items.length });
});

// Persist signatures into a project file: src/signatures.json (overwrite)
router.post("/write", auth, async (req, res) => {
  const schema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const { email, password } = value;

  const companies = loadCompanies();
  const items = [];
  for (const entry of companies) {
    const name = entry.Name || entry.name || "";
    const cin = entry.CIN || entry.cin || "";
    const key = cin || name;
    if (!key) continue;
    const signatureBase64 = signCredentialsWithCompany(key, email, password) || "";
    items.push({ name, cin, signatureBase64 });
  }

  const destPath = path.join(process.cwd(), "src", "signatures.json");
  fs.writeFileSync(destPath, JSON.stringify({ email, items }, null, 2));
  res.json({ filePath: destPath, count: items.length });
});

// Verify a provided signature against the logged-in student's email/password
router.post("/verify", auth, async (req, res) => {
  const schema = Joi.object({ company: Joi.string().required(), email: Joi.string().email().required(), password: Joi.string().required(), signatureBase64: Joi.string().required() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const { company, email, password, signatureBase64 } = value;

  const ok = verifyCredentialsWithCompany(company, email, password, signatureBase64);
  res.json({ verified: ok });
});

export default router;


