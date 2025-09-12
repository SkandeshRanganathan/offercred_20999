import express from "express";
import jwt from "jsonwebtoken";
import { query } from "../db.js";

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

// Get all recruiters (for students to see and apply)
router.get("/recruiters", auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: "Only students can view recruiters" });
    }

    const result = await query(
      `SELECT id, email, full_name, company_cin, created_at 
       FROM users 
       WHERE role = 'recruiter' AND verified = true
       ORDER BY created_at DESC`
    );
    
    res.json({ recruiters: result.rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch recruiters: " + e.message });
  }
});

// Apply to a recruiter
router.post("/apply", auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: "Only students can apply to jobs" });
    }

    const { recruiterId, notes } = req.body;
    
    if (!recruiterId) {
      return res.status(400).json({ error: "Recruiter ID is required" });
    }

    // Check if recruiter exists and is verified
    const recruiterResult = await query(
      `SELECT id, email, full_name FROM users 
       WHERE id = $1 AND role = 'recruiter' AND verified = true`,
      [recruiterId]
    );

    if (recruiterResult.rows.length === 0) {
      return res.status(404).json({ error: "Recruiter not found or not verified" });
    }

    // Check if already applied
    const existingApplication = await query(
      `SELECT id FROM job_applications 
       WHERE student_id = $1 AND recruiter_id = $2`,
      [req.user.id, recruiterId]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({ error: "You have already applied to this recruiter" });
    }

    // Create application
    const result = await query(
      `INSERT INTO job_applications (student_id, recruiter_id, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, recruiterId, notes || null]
    );

    res.json({ 
      application: result.rows[0], 
      message: `Successfully applied to ${recruiterResult.rows[0].full_name || recruiterResult.rows[0].email}`,
      recruiter: recruiterResult.rows[0]
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to apply: " + e.message });
  }
});

// Get student's applications (for student dashboard)
router.get("/my-applications", auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: "Only students can view their applications" });
    }

    const result = await query(
      `SELECT ja.*, u.email as recruiter_email, u.full_name as recruiter_name, u.company_cin
       FROM job_applications ja
       JOIN users u ON ja.recruiter_id = u.id
       WHERE ja.student_id = $1
       ORDER BY ja.applied_at DESC`,
      [req.user.id]
    );

    res.json({ applications: result.rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch applications: " + e.message });
  }
});

// Get applications for a recruiter (for recruiter dashboard)
router.get("/recruiter-applications", auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ error: "Only recruiters can view applications" });
    }

    const result = await query(
      `SELECT ja.*, 
              u.email as student_email, 
              u.full_name as student_name,
              c.course_name,
              c.verified as certificate_verified,
              c.verified_at as certificate_verified_at,
              comp.name as company_name
       FROM job_applications ja
       JOIN users u ON ja.student_id = u.id
       LEFT JOIN certificates c ON u.id = c.student_id AND c.verified = true
       LEFT JOIN companies comp ON c.company_cin = comp.cin
       WHERE ja.recruiter_id = $1
       ORDER BY ja.applied_at DESC`,
      [req.user.id]
    );

    res.json({ applications: result.rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch applications: " + e.message });
  }
});

// Update application status (for recruiters)
router.patch("/:applicationId/status", auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ error: "Only recruiters can update application status" });
    }

    const { status } = req.body;
    const { applicationId } = req.params;

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be pending, accepted, or rejected" });
    }

    const result = await query(
      `UPDATE job_applications 
       SET status = $1 
       WHERE id = $2 AND recruiter_id = $3
       RETURNING *`,
      [status, applicationId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.json({ application: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: "Failed to update application: " + e.message });
  }
});

export default router;
