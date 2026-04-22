# BLOGENTO â€” Full Stack Blogging Platform

A production-ready multi-user blogging system built with **React**, **Express.js**, and **MongoDB**.

---

## ðŸš€ Features

### Authentication & Users
- JWT-based register / login / logout
- Protected routes (frontend + backend)
- Profile pages with bio & avatar
- Password change in settings

### Blog Posts
- Create, edit, delete posts (owner only)
- Rich post fields: title, content, excerpt, cover image, category, tags
- Auto-generated slug, excerpt, and read time
- Draft / Published status toggle
- Views counter, likes system
- Full-text search + filter by category, tag, author
- Pagination (9 posts per page)

### Comments
- Nested replies (1 level deep)
- Edit & delete your own comments
- Admins can delete any comment

### Access Control
- Public: browse posts, view profiles, read post details
- Registered: create/edit/delete own posts, comment, like
- Admin: manage all posts and comments

---

## ðŸ“ Project Structure

```
blogapp/
â”œâ”€â”€ backend/                 # Express.js REST API
â”‚   â”œâ”€â”€ config/db.js         # MongoDB connection
â”‚   â”œâ”€â”€ middleware/auth.js   # JWT protect / optionalAuth
â”‚   â”œâ”€â”€ models/
â”‚   â”‚   â”œâ”€â”€ User.js          # User schema (bcrypt hashed pw)
â”‚   â”‚   â”œâ”€â”€ Post.js          # Post schema (slug, readTime, virtual commentCount)
â”‚   â”‚   â””â”€â”€ Comment.js       # Threaded comment schema
â”‚   â”œâ”€â”€ routes/
â”‚   â”‚   â”œâ”€â”€ auth.js          # /api/auth/* (register, login, profile)
â”‚   â”‚   â”œâ”€â”€ posts.js         # /api/posts/* (CRUD + like)
â”‚   â”‚   â”œâ”€â”€ comments.js      # /api/comments/* (CRUD + like + replies)
â”‚   â”‚   â””â”€â”€ users.js         # /api/users/* (public profiles)
â”‚   â”œâ”€â”€ server.js
â”‚   â”œâ”€â”€ Dockerfile
â”‚   â””â”€â”€ .env.example
â”‚
â”œâ”€â”€ frontend/                # React SPA
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ context/
â”‚   â”‚   â”‚   â””â”€â”€ AuthContext.js   # Global auth state
â”‚   â”‚   â”œâ”€â”€ utils/
â”‚   â”‚   â”‚   â””â”€â”€ api.js           # Axios instance + API methods
â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â””â”€â”€ Navbar.js
â”‚   â”‚   â”œâ”€â”€ pages/
â”‚   â”‚   â”‚   â”œâ”€â”€ Home.js          # Feed with search & filters
â”‚   â”‚   â”‚   â”œâ”€â”€ PostDetail.js    # Full post + comments
â”‚   â”‚   â”‚   â”œâ”€â”€ CreatePost.js    # Post editor
â”‚   â”‚   â”‚   â”œâ”€â”€ EditPost.js      # Edit existing post
â”‚   â”‚   â”‚   â”œâ”€â”€ Dashboard.js     # User's posts + stats
â”‚   â”‚   â”‚   â”œâ”€â”€ Profile.js       # Public author profile
â”‚   â”‚   â”‚   â”œâ”€â”€ Settings.js      # Profile & password settings
â”‚   â”‚   â”‚   â”œâ”€â”€ Login.js
â”‚   â”‚   â”‚   â””â”€â”€ Register.js
â”‚   â”‚   â”œâ”€â”€ App.js               # Routes + guards
â”‚   â”‚   â”œâ”€â”€ styles.css
â”‚   â”‚   â””â”€â”€ index.js
â”‚   â”œâ”€â”€ public/index.html
â”‚   â”œâ”€â”€ Dockerfile
â”‚   â””â”€â”€ nginx.conf
â”‚
â”œâ”€â”€ docker-compose.yml
â””â”€â”€ README.md
```

---

## âš™ï¸ Setup & Run

### Option A â€“ Manual (Development)

**Prerequisites:** Node.js â‰¥ 16, MongoDB running locally

**1. Backend**
```bash
cd backend
cp .env.example .env       # Edit JWT_SECRET and MONGODB_URI
npm install
npm run dev                # Runs on http://localhost:5000
```

**2. Frontend**
```bash
cd frontend
npm install
npm start                  # Runs on http://localhost:3000
```

---

### Option B â€“ Docker Compose (Production)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- MongoDB: localhost:27017

---

## Deploy on Vercel

### Option A (Recommended): Single Vercel Project (Frontend + /api)

1. In Vercel, import the repo and keep **Root Directory** as the repository root (`.`).
2. Add backend env vars (Project → Settings → Environment Variables):
   - `MONGO_URI`
   - `JWT_SECRET`
   - `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET` (required for image uploads on Vercel)
3. Deploy.

### Option B: Two Vercel Projects (Frontend + Backend)

Backend:
- Root Directory: `blogapp/backend/`
- Env vars: `MONGO_URI`, `JWT_SECRET`, `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET`

Frontend:
- Root Directory: `blogapp/frontend/`
- Env var: `REACT_APP_API_BASE=https://<backend>.vercel.app/api`
- Deploy

## ðŸ”Œ API Reference

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/auth/register | Public | Create account |
| POST | /api/auth/login | Public | Login, receive JWT |
| GET | /api/auth/me | Private | Get current user |
| PUT | /api/auth/profile | Private | Update profile |
| PUT | /api/auth/change-password | Private | Change password |
| DELETE | /api/auth/me | Private | Delete account |

### Posts
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /api/posts | Public | List posts (search, filter, paginate) |
| GET | /api/posts/my-posts | Private | Current user's posts |
| GET | /api/posts/:id | Public | Get single post (by ID or slug) |
| POST | /api/posts | Private | Create post |
| PUT | /api/posts/:id | Owner | Update post |
| DELETE | /api/posts/:id | Owner/Admin | Delete post |
| POST | /api/posts/:id/like | Private | Toggle like |

### Comments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /api/comments/post/:postId | Public | Get post comments |
| POST | /api/comments | Private | Add comment or reply |
| PUT | /api/comments/:id | Owner | Edit comment |
| DELETE | /api/comments/:id | Owner/Admin | Delete comment |

### Users
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /api/users/:username | Public | Get public profile + posts |

---

## ðŸ” Authentication Flow

1. User registers â†’ password hashed with bcrypt (12 rounds)
2. Login â†’ server verifies password â†’ returns JWT
3. Frontend stores JWT in `localStorage`
4. Every API request includes `Authorization: Bearer <token>`
5. Backend `protect` middleware verifies token, attaches `req.user`

---

## ðŸ§ª Sample API Usage (curl)

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secret123"}'

# Create a post (use token from register/login response)
curl -X POST http://localhost:5000/api/posts \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"My First Post","content":"This is my first blog post content here.","category":"Technology"}'
```

---

## ðŸŒ± Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5000 | Server port |
| MONGODB_URI | mongodb://localhost:27017/blogapp | MongoDB connection string |
| JWT_SECRET | â€” | **Change this!** Secret for signing JWTs |
| JWT_EXPIRE | 7d | Token expiry duration |
| NODE_ENV | development | Environment mode |
| CLIENT_URL | http://localhost:3000 | CORS origin |

---

## ðŸŽ“ Learning Outcomes

Trainees working through this project will learn:

- **REST API design** with Express.js â€” route organization, middleware, error handling
- **MongoDB schemas** with Mongoose â€” relationships, virtuals, pre-save hooks
- **Authentication** â€” bcrypt hashing, JWT generation & verification, protected routes
- **React patterns** â€” Context API, custom hooks, protected routes, async data fetching
- **Multi-user CRUD** â€” ownership checks, role-based access control
- **Full-stack integration** â€” Axios, CORS, proxying, token management

---

## ðŸ“„ License
MIT â€” Free for educational use.


