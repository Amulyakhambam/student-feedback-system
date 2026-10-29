# Student Feedback System

A beginner-friendly course feedback application built with HTML, CSS, browser JavaScript, Node.js, Express, and Supabase PostgreSQL. Students submit a course rating and written comments. An administrator signs in to search submissions and mark them reviewed.

## Problem and objectives

Students need a straightforward way to report what is helping them learn and what could improve. This MVP collects structured feedback and gives the academic team a private inbox. It demonstrates browser forms, REST APIs, server-side validation, sessions, SQL constraints, and persistent database storage.

## Users and features

- **Students:** submit name, college email, course code, instructor, a 1–5 rating, and constructive comments.
- **Administrator:** sign in with credentials configured on the server, search/filter feedback, and mark new submissions reviewed.
- Responsive interface, field validation, helpful states, request rate limits, session cookies, and server-side input validation.

Feedback is not anonymous in this MVP because it stores the submitted name and email. Explain who can review it before collecting real feedback. There is one configured administrator account, no student accounts, notifications, or analytics/export workflow.

## Technology and architecture

- Frontend: HTML5, CSS3, vanilla JavaScript.
- Backend: Node.js and Express.
- Database: Supabase PostgreSQL.
- `frontend/` is served by Express. Browser requests go to same-origin `/api/...` endpoints. The backend uses Supabase's server-only service-role key; it is never placed in frontend files. The database has row-level security enabled and no public policies. The administrator session is an HTTP-only, same-site cookie.

## Folder structure

```text
student-feedback-system/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

## Prerequisites

Install [Visual Studio Code](https://code.visualstudio.com/), [Node.js LTS (includes npm)](https://nodejs.org/), and [Git](https://git-scm.com/downloads). Create a Supabase project at [supabase.com](https://supabase.com/).

Verify installation in a new VS Code terminal:

```powershell
node --version
npm --version
git --version
```

## Setup

1. Open this project folder in VS Code. Open **Terminal → New Terminal**. From the project root:

   ```powershell
   cd backend
   npm install
   ```

   npm downloads Express, the Supabase client, session middleware, security headers, rate limiting, and dotenv. It creates `package-lock.json` for reproducible installs.

2. In Supabase, create a project. In **Project Settings → API**, copy the project URL and the `service_role` key. Keep the service-role key private; it bypasses row-level security.

3. In Supabase **SQL Editor**, paste and run the full contents of `database/schema.sql`. In **Table Editor**, confirm that a `feedback` table exists.

4. Copy the example environment file from `backend/`:

   ```powershell
   Copy-Item .env.example .env
   ```

   Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to your Supabase values. Set `ADMIN_USERNAME` and a strong `ADMIN_PASSWORD`. Set `SESSION_SECRET` to a long random value. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. `PORT=3000` is suitable locally. Never commit `.env` or share its contents.

5. Start the server from `backend/`:

   ```powershell
   npm start
   ```

   The terminal should show `Student Feedback System running at http://localhost:3000`. Open that address in a browser. Keep the terminal open while using the app; press Ctrl+C to stop it. For auto-restart during development, run `npm run dev` instead.

6. Submit feedback, select **Administrator**, and sign in with the values in `.env`. Confirm the entry appears. Try search, status filtering, and **Mark reviewed**.

## API reference

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Server health check |
| POST | `/api/feedback` | Public, rate limited | Validate and store feedback |
| GET | `/api/admin/me` | Session status | Check whether this browser has an admin session |
| POST | `/api/admin/login` | Public, rate limited | Sign in with configured admin credentials |
| POST | `/api/admin/logout` | Administrator | End session |
| GET | `/api/admin/feedback` | Administrator | List latest 500 entries |
| PATCH | `/api/admin/feedback/:id` | Administrator | Change status to `new` or `reviewed` |

## Database design

`public.feedback` stores a UUID, student name/email, course code, instructor, rating, comments, status, and creation time. Check constraints enforce field lengths, rating range, and status values. An index sorts by creation time. RLS is enabled with no browser-access policies; requests use the backend service-role key.

## Manual verification checklist

- Visit `/api/health`: expect `{"status":"ok"}`.
- Submit valid feedback: expect success and a new row in Supabase.
- Leave a required field blank or enter too-short comments: browser validation blocks submission; malformed API requests receive HTTP 400.
- Submit more than ten times quickly: rate limiting should return HTTP 429.
- Open admin with wrong credentials: expect an error. Sign in correctly: the inbox loads.
- Search by course or name; choose New/Reviewed status; mark an entry reviewed and confirm its badge changes.
- Sign out and request `/api/admin/feedback`: expect HTTP 401.
- Resize to a narrow viewport: form and inbox should fit the screen.
- Stop the server or use invalid Supabase credentials: API operations should show an error while the health route remains available.

No automated test suite is included. A live Supabase connection and browser workflow must be verified after configuring your own credentials.

## Troubleshooting

- **Missing environment variables:** ensure `.env` is in `backend/`, copy variable names from `.env.example`, and restart the server after changes.
- **Cannot connect / invalid API key:** check Supabase URL and service-role key; avoid extra whitespace.
- **Relation `feedback` not found:** run `database/schema.sql` in the intended Supabase project.
- **Port already in use:** change `PORT` in `.env` (for example to `3001`) and open the matching localhost URL.
- **Login does not persist:** use the same localhost address and port; clear cookies if needed. Secure cookies are enabled when `NODE_ENV=production`, so local HTTP should use the default development mode.
- **Frontend cannot reach API:** start the server and open the app through localhost, not by opening `index.html` directly.
- **Package install fails:** verify internet connectivity and use a supported Node.js LTS release, then retry `npm install`.

## Security and limitations

`.env` is ignored by Git. Never put the Supabase service-role key or admin password in frontend code, screenshots, or a public repository. The included session store is Express's in-memory development store and resets when the process restarts; it is not suitable for a multi-instance production deployment. Configure a persistent session store, HTTPS, secret rotation, institutional access controls, backup/retention policy, and privacy notice before real institutional use. Admin credentials are environment-configured rather than managed in a user table. No CSRF token is included; same-site cookies mitigate cross-site requests for this same-origin MVP, but review security before deployment.

## GitHub upload

From the project root, create an empty GitHub repository, then run:

```powershell
git init
git status
git add .
git status
git commit -m "Build student feedback system"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace the final URL with your repository URL. Before committing, check that `.env`, `node_modules/`, and private data are not staged; `.env.example` should be included. `.gitignore` cannot remove a secret already committed. If a credential was exposed, rotate it immediately and remove it from repository history.
