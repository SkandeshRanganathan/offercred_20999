import express from "express";
import Joi from "joi";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { query } from "../db.js";
import multer from "multer";
import { isCompanyVerified } from "../companyVerifier.js";
import jwt from "jsonwebtoken";
import { signBufferWithCompanyPrivateKey, verifyBufferWithCompanyPublicKey } from "../cryptoKeys.js";

const router = express.Router();
const upload = multer({ dest: path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads") });

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

function canonicalize(obj) {
  // Stable stringify with sorted keys
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map((v) => canonicalize(v)).join(",")}]`;
  const keys = Object.keys(obj).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`);
  return `{${parts.join(",")}}`;
}

function loadPublicKeyForCompany(cinOrName) {
  const dir = process.env.RSA_PUBLIC_KEYS_DIR || path.join(process.cwd(), "keys", "public");
  const candidates = [
    path.join(dir, `${cinOrName}.pem`),
    path.join(dir, `${cinOrName}.pub`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf-8");
  }
  return null;
}

router.post("/verify-upload", auth, async (req, res) => {
  const schema = Joi.object({
    company: Joi.string().required(), // CIN or Name
    courseName: Joi.string().required(),
    payload: Joi.object().required(), // JSON provided by issuer
    signatureBase64: Joi.string().required(),
    storeFileName: Joi.string().optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  if (req.user.role !== "student") return res.status(403).json({ error: "Only students can upload" });

  const { company, courseName, payload, signatureBase64, storeFileName } = value;

  const verifiedCompany = isCompanyVerified(company);
  if (!verifiedCompany.ok) return res.status(400).json({ error: "Unverified company" });

  const publicKey = loadPublicKeyForCompany(verifiedCompany.company.cin || company);
  if (!publicKey) return res.status(400).json({ error: "Public key not found for company" });

  const canonical = canonicalize(payload);
  const signature = Buffer.from(signatureBase64, "base64");

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(canonical);
  verifier.end();
  const ok = verifier.verify(publicKey, signature);

  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  let storedPath = null;
  if (storeFileName) {
    // Store canonical payload alongside signature for audit
    const base = path.basename(storeFileName);
    storedPath = path.join(uploadDir, `${Date.now()}-${base}`);
    fs.writeFileSync(storedPath, canonical);
  }

  const result = await query(
    `insert into certificates(student_id, company_cin, course_name, payload_json, signature_base64, verified, verified_at, stored_path)
     values ($1,$2,$3,$4,$5,$6, case when $6 then now() else null end, $7)
     returning *`,
    [req.user.id, verifiedCompany.company.cin || company, courseName, payload, signatureBase64, ok, storedPath]
  );

  res.json({ certificate: result.rows[0], signatureValid: ok });
});

// New: simple file upload (PDF or similar). Stores file and creates a certificate row (unverified)
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Only students can upload" });
  const schema = Joi.object({
    company: Joi.string().required(), // CIN or Name
    courseName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    signatureBase64: Joi.string().required(), // user-provided signature
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { company, courseName, email, password, signatureBase64: providedSig } = value;
  const verifiedCompany = isCompanyVerified(company);
  if (!verifiedCompany.ok) return res.status(400).json({ error: "Unverified company" });
  if (!req.file) return res.status(400).json({ error: "Missing file" });

  const storedPath = req.file.path;
  // Use provided signature if given; otherwise sign the raw file bytes (demo)
  const fileBuffer = fs.readFileSync(storedPath);
  // Step 1: Compute h1 from provided credentials
  const message = Buffer.from(`${email}\n${password}`, "utf-8");
  const h1 = signBufferWithCompanyPrivateKey(verifiedCompany.company.cin || company, message);
  // Step 2: Verify provided signature (h2) with company public key
  const h2ok = verifyBufferWithCompanyPublicKey(verifiedCompany.company.cin || company, message, providedSig);
  const signatureBase64 = providedSig;

  const result = await query(
    `insert into certificates(student_id, company_cin, course_name, payload_json, signature_base64, verified, verified_at, stored_path)
     values ($1,$2,$3,$4,$5,$6, case when $6 then now() else null end, $7)
     returning *`,
    [
      req.user.id,
      verifiedCompany.company.cin || company,
      courseName,
      { email },
      signatureBase64,
      Boolean(h2ok && h1 && providedSig),
      storedPath,
    ]
  );

  res.json({ certificate: result.rows[0], verified: Boolean(h2ok && h1 && providedSig) });
});

// Verify a stored certificate by re-hashing the file and checking signature with public key
router.post("/verify/:id", auth, async (req, res) => {
  const { id } = req.params;
  const result = await query(`select * from certificates where id=$1 and student_id=$2`, [id, req.user.id]);
  const cert = result.rows[0];
  if (!cert) return res.status(404).json({ error: "Not found" });
  const storedPath = cert.stored_path;
  if (!storedPath || !fs.existsSync(storedPath)) return res.status(400).json({ error: "Stored file missing" });
  const buffer = fs.readFileSync(storedPath);
  const ok = verifyBufferWithCompanyPublicKey(cert.company_cin, buffer, cert.signature_base64 || "");
  if (ok && !cert.verified) {
    await query(`update certificates set verified=true, verified_at=now() where id=$1`, [id]);
  }
  res.json({ id, verified: ok });
});

router.get("/mine", auth, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Only students" });
  const result = await query(`select * from certificates where student_id=$1 order by created_at desc`, [req.user.id]);
  res.json({ certificates: result.rows });
});

export default router;


