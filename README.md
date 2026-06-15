# Hotel Management SaaS

Enterprise hotel management platform built with Next.js 16, PostgreSQL (Neon), and deployed on Vercel.

## Tech Stack
- **Frontend**: Next.js 16, React, CSS Modules
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Neon Cloud)
- **Auth**: JWT + bcrypt
- **Deployment**: Vercel

## Quick Start
```bash
npm install
npm run prisma:validate
npm run prisma:generate
# Apply reviewed migrations before starting the app.
npm run dev
```

## Environment Variables
Copy `.env.example` to `.env.local`. Prisma commands in this project load
`.env.local` locally and use deployment environment variables in production.
