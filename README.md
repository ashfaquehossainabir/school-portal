# EduPortal — School Management System

Full-stack school portal for admins, teachers, students, and parents. Built with React (Vite), Express, and MongoDB.

## Features

- **Role-based accounts:** admin, teacher, student, parent — each with their own dashboard
- **Admin:** create/manage all user accounts, create classes, publish exams/routines/notes/notices, take attendance for any class, link parent accounts to their children
- **Teacher:** take attendance for assigned classes, publish exam schedules, edit class routine, post notes and notices
- **Student:** view attendance report (with monthly % and daily log), exam schedule, class routine, notes, notices
- **Parent:** same views as student, with a child-selector if they have multiple children linked
- **Admin account management:** edit any user's info, reset their password directly, activate/deactivate accounts, assign teachers to specific subjects per class/section, and link/unlink parents with their children — all from the Users page
- **Attendance sync:** teachers mark attendance once — it's the same database record students/parents read, so it appears on their dashboard immediately, no separate sync step needed
- **Dark/light mode:** toggle in the top bar, saved to the browser and defaults to system preference
- **Fully responsive:** collapsible sidebar on mobile, responsive grids and tables

## Project Structure

```
school-portal/
├── backend/          Express + MongoDB API
│   ├── models/        User, ClassRoom, ExamSchedule, Routine, Note, Notice, Attendance
│   ├── routes/         auth, users, classes, exams, routines, notes, notices, attendance
│   ├── middleware/    JWT auth + role-based access control
│   ├── server.js
│   └── seed.js         creates the first admin account
└── frontend/          React (Vite)
    ├── src/pages/admin | teacher | student | parent
    ├── src/components  shared views (Attendance, Exams, Routine, Notes, Notices) + managers
    └── src/context      Auth + Theme (dark/light)
```

## Local Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=any_long_random_string
CLIENT_URL=http://localhost:5173
```

Create your first admin account:
```bash
node seed.js
```
This prints login credentials: `admin@school.com` / `admin123`. Change the password after first login.

Start the server:
```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

Start the dev server:
```bash
npm run dev
```

Visit `http://localhost:5173`, log in with the admin account, and start creating classes, teachers, students, and parents from the admin dashboard.

## Setting Up Your First School

1. **Classes** → create each class + section (e.g. "Class 8" / "A").
2. **Users** → create teacher accounts (assign subject), student accounts (assign class + section + Student ID), and parent accounts.
3. **Assign Teacher to Subject** and **Connect Parents with Students** sections on the Users page handle the rest of the linking.
4. Teachers log in and can immediately take attendance, publish exams, edit the routine, and post notes/notices for their classes.

## Deployment (free tier — same pattern as your other projects)

1. Push this repo to GitHub.
2. **MongoDB Atlas:** create a free cluster, get the connection string, use it as `MONGO_URI`.
3. **Backend → Render:** new Web Service, root directory `backend`, build command `npm install`, start command `npm start`. Add the same environment variables from `.env`, with `CLIENT_URL` set to your deployed frontend URL.
4. **Frontend → Vercel:** new project, root directory `frontend`, framework preset "Vite". Add `VITE_API_URL` pointing to your Render backend URL + `/api`.
5. After both are live, run `node seed.js` once against your production `MONGO_URI` (locally, pointing at Atlas) to create the first admin account.

## Notes on scope

This covers the full core feature set end-to-end and is ready to run. A few things worth adding as you iterate (matching how you've built out your other projects):
- File uploads for notes (currently uses external links, since Render's free tier has an ephemeral filesystem — Cloudinary/S3 would fix this, same as flagged on Fieldnote Market)
- Email notifications for new notices (you already have the nodemailer + node-cron pattern from TaskFlow, which would drop in here easily)
