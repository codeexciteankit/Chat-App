# 🚀 Easy Deployment Guide (One URL Mode)

This guide deploys your app as a **Single Service** (Monolith).
Both Frontend and Backend will run on the SAME URL (e.g., `https://my-chat-app.onrender.com`).

**Prerequisite:** Push your code to GitHub.

---

## Step 1: Deploy to Render (The Only Step!)

1.  **Log in** to [Render.com](https://render.com).
2.  Click **"New +"** → **"Web Service"**.
3.  Connect your GitHub repository.
4.  **Fill in the settings**:
    *   **Name**: `my-chat-app`
    *   **Root Directory**: `.` (Leave empty or set to dot)
    *   **Environment**: `Node`
    *   **Build Command**: `npm run build`
        *(This will install everything and build your React app automatically)*
    *   **Start Command**: `npm start`
        *(This runs your Backend, which now knows how to serve the Frontend)*

5.  **Add Environment Variables**:
    Scroll down to "Environment Variables" and add these:

    | Key | Value |
    |-----|-------|
    | `NODE_ENV` | `production` |
    | `MONGODB_URI` | *Your MongoDB Connection String* |
    | `JWT_SECRET` | *Your Secret Key* |
    | `CLOUDINARY_CLOUD_NAME` | *Your Cloud Name* |
    | `CLOUDINARY_API_KEY` | *Your API Key* |
    | `CLOUDINARY_API_SECRET` | *Your API Secret* |

6.  Click **"Create Web Service"**.

---

## ✅ You're Done!

Once the build finishes (it might take 2-3 minutes), Render will give you a URL like:
`https://my-chat-app.onrender.com`

- **Open that URL**: You will see your React Frontend!
- **Login/Signup**: It works automatically because the credentials go to `/api/...` on the same domain.
- **Refresh Page**: It works because we configured the Backend to handle specific files!

---

## 🔧 Troubleshooting

- **Build Failed?**: Check the logs. Did `npm install` fail?
- **White Screen?**: Check browser console.
- **404 on Refresh?**: We added code to fix this, so it should work.

Enjoy your deployed app! 🚀
