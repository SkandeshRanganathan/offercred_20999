create extension if not exists pgcrypto;

create table if not exists companies (
  id serial primary key,
  name text not null,
  cin text unique,
  status text,
  url text,
  address text
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('student','recruiter')),
  verified boolean not null default false,
  full_name text,
  company_cin text,
  created_at timestamptz not null default now()
);

create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references users(id) on delete cascade,
  company_cin text not null,
  course_name text not null,
  payload_json jsonb not null,
  signature_base64 text not null,
  verified boolean not null default false,
  verified_at timestamptz,
  stored_path text,
  created_at timestamptz not null default now()
);

create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references users(id) on delete cascade,
  recruiter_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  applied_at timestamptz not null default now(),
  notes text,
  unique(student_id, recruiter_id)
);


