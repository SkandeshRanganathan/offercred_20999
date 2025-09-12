import express from "express";
import Joi from "joi";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { isCompanyVerified, getCompany } from "../companyVerifier.js";

const router = express.Router();

function signToken(user) {
  const payload = { id: user.id, role: user.role, email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

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

router.post("/register/student", async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    fullName: Joi.string().required(),
    verificationToken: Joi.string().optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { email, password, fullName, verificationToken } = value;
  const verified = verificationToken === process.env.STUDENT_VERIFICATION_TOKEN;
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const result = await query(
      `insert into users(email, password_hash, role, verified, full_name)
       values ($1,$2,'student',$3,$4)
       returning id, email, role, verified, full_name`,
      [email, passwordHash, verified, fullName]
    );
    const user = result.rows[0];
    const token = signToken(user);
    res.json({ user, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/register/recruiter", async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    fullName: Joi.string().required(),
    company: Joi.string().required(), // CIN or Name
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { email, password, fullName, company } = value;
  const check = isCompanyVerified(company);
  if (!check.ok) return res.status(400).json({ error: "Company not verified" });

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const result = await query(
      `insert into users(email, password_hash, role, verified, full_name, company_cin)
       values ($1,$2,'recruiter',true,$3,$4)
       returning id, email, role, verified, full_name, company_cin`,
      [email, passwordHash, fullName, check.company.cin || check.company.name]
    );
    const user = result.rows[0];
    const token = signToken(user);
    res.json({ user, token, company: getCompany(company) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/login", async (req, res) => {
  const schema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const { email, password } = value;

  const result = await query(`select * from users where email=$1`, [email]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = signToken(user);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      verified: user.verified,
      full_name: user.full_name,
      company_cin: user.company_cin,
    },
    token,
  });
});

// List student users (auth required). Recruiters can view; students can only view themselves.
router.get("/students", auth, async (req, res) => {
  if (req.user.role === "student") {
    const r = await query(`select id, email, role, verified, full_name from users where id=$1`, [req.user.id]);
    return res.json({ students: r.rows });
  }
  // Recruiters (or other roles) can view all students
  const result = await query(`select id, email, role, verified, full_name from users where role='student' order by created_at desc`);
  res.json({ students: result.rows });
});

export default router;


