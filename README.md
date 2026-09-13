# Civic Voice

A full-stack civic survey voting app built with React + Vite + Supabase.

## Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Hosting**: Vercel

---

## Setup

### 1. Supabase project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, paste and run the entire contents of `supabase/schema.sql`
3. In Authentication → Providers, enable **Email** (magic link is on by default)
4. Copy your **Project URL** and **anon public key** from Project Settings → API

### 2. Local development
```bash
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm install
npm run dev
```

### 3. Make yourself an admin
After signing in for the first time, run this in the Supabase SQL Editor:
```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'your@email.com');
```
Then refresh the app — you'll see the Admin link in the navbar.

### 4. Deploy to Vercel
```bash
# Push to GitHub (pinchez28-cyber)
git init
git add .
git commit -m "init civic voice"
git remote add origin https://github.com/pinchez28-cyber/civic-voice.git
git push -u origin main
```
Then in Vercel:
1. Import the repo
2. Add environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Deploy — done

---

## Features

### Citizens
- Browse open surveys filtered by category
- Sign in via magic link (no password)
- Vote once per survey (enforced at DB level)
- See live results with percentage bars after voting

### Survey submission
- Any signed-in user can submit a survey
- Surveys go into **pending** status until an admin approves

### Admin panel (`/admin`)
- View all surveys (pending / open / closed)
- Approve, close, reopen, or delete surveys

---

## Project structure
```
src/
  components/
    Navbar.jsx       — top nav with auth state
    AuthModal.jsx    — magic link sign-in modal
    SurveyCard.jsx   — voting card with result bars
  pages/
    Home.jsx         — survey list + category filter
    Submit.jsx       — survey submission form
    Admin.jsx        — admin moderation panel
  hooks/
    useAuth.jsx      — session + profile context
  lib/
    supabase.js      — Supabase client
supabase/
  schema.sql         — tables, RLS, vote function, seed data
```
