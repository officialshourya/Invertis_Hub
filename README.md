# Invertis Hub

A full-stack academic resource portal starter for Invertis University. Branding uses the logo supplied by the project owner.

## Included in this version

- Responsive landing page and branded login/register screens
- Student registration (student role only) and login
- Secure JWT authentication; passwords are hashed with bcrypt
- Admin dashboard with student/material counts
- Admin-only material upload, edit metadata, and delete
- Public resource library with search, type and semester filters
- Resource categories: Notes, PYQ, Assignment, Practical, Question Bank, Syllabus, Other
- PDF/document/image upload (15 MB limit)
- User list visible to admins
- Mobile-friendly navigation

## Not yet implemented

Quiz Arena/live multiplayer, AI study assistant, discussion forum, notification delivery, quiz authoring/attempts, assignment submission workflow, cloud file storage, password reset email and production audit logs are future modules. The UI lists some planned areas, but they are not represented as completed backend functionality in this starter.

## Requirements

- Node.js 20+
- MongoDB local instance or MongoDB Atlas connection string

## Run locally

1. Open a terminal in this project folder.
2. Install root utility:

   ```bash
   npm install
   ```

3. Install server and client dependencies:

   ```bash
   npm run install:all
   ```

4. Create `server/.env` from `server/.env.example`. Set your MongoDB URI and a long random `JWT_SECRET`. Change `ADMIN_EMAIL` and `ADMIN_PASSWORD` to private values.
5. Create the first admin account:

   ```bash
   npm run seed:admin
   ```

6. (Optional) Create `client/.env` from `client/.env.example`. The default API URL is `http://localhost:5000`.
7. Start both apps:

   ```bash
   npm run dev
   ```

8. Open `http://localhost:5173`.
9. Log in using the admin email and password from `server/.env`.

Students can create accounts using the registration link. Public registration can only create student accounts; it cannot create admins.

## Important security and deployment notes

- Never commit `.env` files or share the admin password.
- Change the initial admin password before deployment. Use a long, unique `JWT_SECRET`.
- For production, use HTTPS, a restricted CORS origin, a managed MongoDB database, and private object storage such as Cloudinary or Supabase Storage. The included local `server/uploads` folder is suitable for local development only; many cloud hosts use ephemeral filesystems.
- Configure a persistent storage provider before relying on uploaded documents in production.
- The API currently permits a 15 MB file limit and a MIME-type allowlist. For production, add server-side file signature inspection, malware scanning, upload quotas and backups.
- Use only university-approved content and materials you are permitted to distribute. This project is not connected to the university ERP.
- This is a starter implementation. Test authentication, upload and access control before real student use.

## Main API routes

- `POST /api/auth/register` — create student account
- `POST /api/auth/login` — sign in
- `GET /api/auth/me` — current authenticated user
- `GET /api/materials` — public material listing with `search`, `type`, `semester` query filters
- `GET /api/admin/stats` — admin statistics
- `GET /api/admin/users` — admin user listing
- `POST /api/admin/materials` — admin upload (multipart form field `file`)
- `PUT /api/admin/materials/:id` — admin edit material metadata
- `DELETE /api/admin/materials/:id` — admin delete material and local file

## Project structure

```text
invertis-hub/
├── client/
│   ├── public/invertis-hub-logo.jpg
│   └── src/{App.jsx,main.jsx,style.css}
├── server/
│   ├── src/{index.js,models.js,middleware.js,seedAdmin.js}
│   └── uploads/
├── package.json
└── README.md
```
