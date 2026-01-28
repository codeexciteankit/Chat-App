# 🚀 Deployment Guide

This guide will walk you through deploying your MERN Chat App to production.

We recommend:
- **Frontend**: [Vercel](https://vercel.com) (Best for React/Vite)
- **Backend**: [Render](https://render.com) (Great free tier for Node.js)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas/database) (You're likely already using this)

---

## 📋 Prerequisites

1. Push your code to a GitHub repository (it needs to be public or private, but accessible to Vercel/Render).
2. Have your MongoDB Atlas connection string ready.
3. Have your Cloudinary credentials ready.

---

## Part 1: Backend Deployment (Render)

1. **Sign up/Log in** to [Render.com](https://render.com).
2. Click **"New +"** and select **"Web Service"**.
3. Connect your GitHub repository.
4. **Configuration**:
   - **Name**: `chatapp-backend` (or similar)
   - **Root Directory**: `Backend` (Important! Your backend code is in this folder)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. **Environment Variables** (Scroll down to "Environment"):
   Add the following keys and values from your local `.env`:
   - `MONGODB_URI`: `your_mongodb_connection_string`
   - `JWT_SECRET`: `your_long_secure_secret`
   - `PORT`: `5001` (Render might override this, typically they use 10000, but app listens on process.env.PORT)
   - `NODE_ENV`: `production`
   - `CLOUDINARY_CLOUD_NAME`: `...`
   - `CLOUDINARY_API_KEY`: `...`
   - `CLOUDINARY_API_SECRET`: `...`
   - `FRONTEND_URL`: `https://your-frontend-app.vercel.app` (You will get this URL in Part 2)
6. Click **"Create Web Service"**.

*Note: The free tier of Render spins down after inactivity. The first request might take 50s+ to wake it up.*

---

## Part 2: Frontend Deployment (Vercel)

1. **Sign up/Log in** to [Vercel.com](https://vercel.com).
2. Click **"Add New..."** -> **"Project"**.
3. Import your GitHub repository.
4. **Project Configuration**:
   - **Framework Preset**: Vite
   - **Root Directory**: Click "Edit" and select `Frontend`.
5. **Environment Variables**:
   - `VITE_API_URL`: The URL of your Render backend (e.g., `https://chatapp-backend.onrender.com/api`).
     *Note: Make sure to include `/api` at the end if your backend routes are prefixed with it.*
   - `VITE_SOCKET_URL`: The URL of your Render backend base (e.g., `https://chatapp-backend.onrender.com`).
6. Click **"Deploy"**.

---

## Part 3: Final Configuration

1. **Update Backend CORS**:
   Once Vercel gives you the frontend domain (e.g., `https://chatapp-frontend.vercel.app`), go back to **Render Dashboard** -> **Environment** and update:
   - `FRONTEND_URL`: `https://chatapp-frontend.vercel.app`
   - **Redeploy** the backend (Render usually does this automatically on config change).

2. **MongoDB Network Access**:
   - Go to MongoDB Atlas Dashboard.
   - Go to **Network Access**.
   - Ensure `0.0.0.0/0` (Allow Access from Anywhere) is added.
     *Since Render IPs exist in a range, allowing any IP is the standard approach for Platform-as-a-Service, provided you use a strong password.*

---

## ✅ Verification

1. Open your Vercel URL.
2. Try to Sign Up/Login.
3. Check the console if there are errors.

### Troubleshooting
- **CORS Error**: Check `FRONTEND_URL` in backend env vars.
- **Connection Error**: Check `MONGODB_URI` in backend env vars.
- **Images not uploading**: Check Cloudinary credentials.
