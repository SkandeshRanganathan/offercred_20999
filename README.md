OfferCred: Trust & Verification Platform for Student Opportunities
Overview

OfferCred is a secure and intelligent trust platform designed to verify the authenticity of internships, courses, and job offers while connecting students with credible, verified recruiters. By integrating cryptographic validation, company verification, and structured feedback systems, OfferCred eliminates fraudulent opportunities and builds a reliable ecosystem for both students and organizations.

How OfferCred Works

OfferCred operates through two primary user roles: Students and Recruiters, supported by a secure backend verification system.

For Students
Upload & Secure Certification
Students can upload internship or course completion certificates.
Each upload is accompanied by:
Email and password (secure authentication)
Digital signature for integrity verification
Intelligent Certificate Verification
The system validates certificates through:
Company authenticity checks using a trusted database (JSON/PostgreSQL records)
RSA digital signature verification using recruiter public keys
Outcomes:
Valid certificates → added to student profile
Invalid certificates → rejected with feedback collection
Feedback & Review System
Students submit reviews about internships, courses, or job experiences.
Reviews are aggregated into a centralized feedback system to:
Help future students make informed decisions
Identify trustworthy and low-quality opportunities
Apply to Verified Recruiters
Students can browse a curated list of verified recruiters only
Apply directly through the platform dashboard
Track application status in real-time
For Recruiters
Recruiter Verification
Recruiters must provide:
Company name
CIN / Registration number
Official website and credentials
The system verifies authenticity against trusted company datasets
Only verified recruiters gain access to the platform
Access to Verified Talent Pool
Recruiters can view student applications through a dedicated dashboard
Each student profile includes:
Verified certificates
Relevant academic and experience details
Application Management
Recruiters can:
Accept applications
Reject applications
Mark applications as pending
Status updates are instantly reflected on the student dashboard
Core Features
Certificate Authenticity Verification
RSA-based digital signature validation
Trusted company database cross-checking
Recruiter Legitimacy Validation
CIN-based verification
Fraud prevention through structured checks
Feedback & Analytics Engine
Transparent review system for internships and courses
Data-driven insights for decision-making
Application Management System
End-to-end workflow for student applications
Real-time status tracking
Secure Authentication System
Password hashing using bcrypt
JWT-based session management
System Architecture Highlights
End-to-End Verification Pipeline
Upload → Validate → Verify → Store → Display
Security-First Design
Cryptographic validation using RSA
Secure authentication and authorization layers
Scalable Backend
Modular Node.js + Express architecture
PostgreSQL for structured, reliable data storage
Tech Stack

Frontend

HTML
CSS
JavaScript

Backend

Node.js
Express.js

Database

PostgreSQL

Security

bcrypt.js (Password Hashing)
JSON Web Tokens (JWT Authentication)
RSA Cryptography (Certificate Verification)

Additional Tools

Multer (File Upload Handling)
Joi (Input Validation)
Nodemon (Development Server)
Morgan (HTTP Request Logging)
