How OfferCred Works

OfferCred is a trust and verification platform that ensures students’ internships, courses, and job offers are authentic and verifiable, while giving recruiters access to a credible talent pool.

For Students

Upload Certificates

Students can upload internship or course completion certificates.

Along with the upload, they provide their email, password, and a digital signature.

Certificate Verification

The system checks if the issuing company is legitimate using verified company data (JSON or database records).

Certificates are validated using RSA digital signatures and matched against the recruiter’s registered public key.

If valid, the certificate is added to the student’s profile.

If invalid, the certificate is rejected, but feedback is still collected.

Feedback and Reviews

Students provide feedback about their internship or job program.

Feedback contributes to a review database that helps future students evaluate opportunities before applying.

Applications to Recruiters

Students can view a list of verified recruiters.

Applications to internships or jobs can be submitted directly through the dashboard.

For Recruiters

Recruiter Verification

Recruiters register by providing their company name, CIN/registration number, website, and credentials.

The system cross-checks these details against stored company data.

Only legitimate recruiters are allowed on the platform.

Access to Verified Talent

Recruiters have a dashboard displaying student applications.

Each student profile shows verified certificates and relevant details.

Applications are clearly categorized by status (Pending, Accepted, Rejected).

Manage Applications

Recruiters can accept, reject, or mark applications as pending.

Actions taken are reflected on the student’s dashboard.

Core Features

Student certificate verification using RSA signatures and a trusted company list

Recruiter verification using CIN/company data

Feedback and analytics for courses and internships

Application management for recruiters

Secure login system with bcrypt password hashing and JWT authentication

Tech Stack

Frontend: HTML, CSS, JavaScript

Backend: Node.js, Express.js

Database: PostgreSQL

Security: bcrypt.js (password hashing), JWT (authentication), RSA (certificate verification)

Additional Tools: Multer (file upload), Joi (validation), Nodemon (development server), Morgan (logging)
