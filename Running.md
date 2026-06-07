# MedoraLink Execution & Deployment Guide (Windows & Production)

MedoraLink is a full-stack web application consisting of a **Next.js frontend** and a **Flask backend** connected via JSON REST APIs. This guide provides comprehensive, step-by-step instructions for running the application locally on Windows and deploying it securely to production platforms like **Render**, **Vercel**, **SendGrid**, and **Resend**.

---

## 🛠️ Architecture & Core Components

1.  **Frontend (`/frontend`)**: 
    *   Built with Next.js 14 (App Router), React 18, Tailwind CSS, and TypeScript.
    *   API requests are dispatched via `frontend/lib/api.ts` (configured via `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:5050` in development).
    *   Default port: `3000`.
2.  **Backend (`/backend`)**:
    *   Built with Python, Flask, and Flask-CORS.
    *   Uses a simulated JSON database (`backend/data.json`) which auto-seeds and requires no database installations.
    *   Powered by Google Gemini AI (optional, uses key in `.env`).
    *   Default port: `5050`.

---

## 🔐 Seed User Credentials
The JSON database is pre-seeded with multiple test accounts for logging in:

| Email | Password | Role | Purpose |
| :--- | :--- | :--- | :--- |
| **`a`** | `a` | `patient` | Quickest patient login |
| **`sifat@gmail.com`** | `s` | `patient` | Patient user account |
| **`nafi@united.health`** | `111` | `doctor` | Doctor user account (for approvals) |
| **`user@example.com`** | `password123` | `patient` | Registered patient user account |

---

## 💻 Local Execution Guide

Follow these sequential steps in your PowerShell or Command Prompt terminal.

### Step 1: Set Up Python Virtual Environment
> [!WARNING]
> The pre-existing `.venv` folder in `backend/` was created on **macOS** and contains Unix-specific symlinks and configurations. Trying to activate it on Windows will fail. Delete it and create a fresh Windows virtual environment.

```powershell
# 1. Navigate into the backend directory
cd backend

# 2. Delete the macOS virtual environment folder safely
Remove-Item -Recurse -Force .venv

# 3. Create a fresh Windows virtual environment
python -m venv .venv

# 4. Activate the virtual environment
# In PowerShell:
.\.venv\Scripts\Activate.ps1
# OR in Command Prompt (cmd):
# .\.venv\Scripts\activate.bat
```

### Step 2: Install Backend Dependencies & Start Server
```powershell
# 1. Upgrade pip to the latest version
python -m pip install --upgrade pip

# 2. Install dependencies (Flask, CORS, Dotenv, Gemini SDK, and Gunicorn)
pip install -r requirements.txt

# 3. Run the Flask backend
python app.py
```
*The backend server will spin up on **`http://localhost:5050`**.*

### Step 3: Install Frontend Dependencies & Start Next.js
Open a **new separate terminal window**, navigate to the project's root folder, and run:
```powershell
# 1. Navigate to the frontend directory
cd frontend

# 2. Install the frontend npm packages
npm install

# 3. Start the Next.js development server
npm run dev
```
*The frontend will start on **`http://localhost:3000`**.*

---

## ☁️ Production Deployment Guide

To deploy the application online so your friends can access it, complete the following steps:

### 1. Backend Deployment (Render)
1.  Log into [Render.com](https://render.com/) and create a new **Web Service**.
2.  Connect your GitHub repository.
3.  Set the **Root Directory** to: `backend`. *(CRITICAL: Otherwise, Render will fail to find `requirements.txt`)*
4.  Configure the settings:
    *   **Language:** `Python`
    *   **Build Command:** `pip install -r requirements.txt`
    *   **Start Command:** `gunicorn app:app`
5.  Go to the **Environment** tab and add the environment variables:
    *   `GEMINI_API_KEY` = `your_google_gemini_api_key`
    *   `FRONTEND_URL` = `https://your-vercel-domain.vercel.app` *(Update this after Step 2!)*
    *   *Add email service configurations (see Email Service Setup below).*

### 2. Frontend Deployment (Vercel)
1.  Log into [Vercel.com](https://vercel.com/) and import your GitHub repository.
2.  Edit the Project settings and set the **Root Directory** to: `frontend`.
3.  Expand **Environment Variables** and add:
    *   `NEXT_PUBLIC_API_URL` = `https://your-render-domain.onrender.com` *(Your Render backend URL)*
4.  Click **Deploy**. Once built, copy your live frontend domain URL.
5.  **Important:** Go back to Render's Environment tab and update `FRONTEND_URL` with your Vercel domain.

---

## 📧 Email Service Setup (Choose Resend or SendGrid)

To enable real password reset emails, choose **one** of the two HTTP-based email delivery options. Do not use direct SMTP (ports 587/465), as Render blocks them.

### Option A: SendGrid Setup (Recommended, No Custom Domain Required)
Best if you want to send emails to your friends' Gmail inboxes for free, without owning a domain:
1.  Sign up on [SendGrid.com](https://sendgrid.com/).
2.  Go to **Settings** -> **Sender Authentication** -> **Verify a Single Sender** and verify your personal Gmail.
3.  Verify the sender link inside the email sent to your inbox.
4.  Go to **Settings** -> **API Keys**, create a new key, and copy it.
5.  Add these environment variables to **Render**:
    *   `SENDGRID_API_KEY` = `SG.your_api_key`
    *   `SENDGRID_SENDER` = `your-verified-gmail-address@gmail.com`

### Option B: Resend Setup (Requires Custom Domain)
Best if you own a custom domain (e.g. `yourname.com`):
1.  Sign up on [Resend.com](https://resend.com/).
2.  Go to **Domains** -> **Add Domain** -> Verify DNS records in GoDaddy/Namecheap.
3.  Go to **API Keys**, create a new key, and copy it.
4.  Add these environment variables to **Render**:
    *   `RESEND_API_KEY` = `re_your_api_key`
    *   `RESEND_SENDER` = `noreply@yourdomain.com`

---

## 📝 Troubleshooting Summary

*   **Q: Why does the password reset screen show "Failed to fetch"?**
    *   **A1:** Outgoing SMTP ports (587, 465) are blocked on Render’s Free tier. I have added a 5-second connection timeout to prevent socket hangs, but you **must** use SendGrid or Resend HTTP APIs (Option A or B above) to send emails online.
    *   **A2:** You updated your environment variables in Vercel, but did not rebuild your app. Go to the Vercel **Deployments** tab, click `...` on your deployment, and click **Redeploy**.
*   **Q: Why does it show "No account found" after I redeployed?**
    *   **A:** Render's free tier uses an ephemeral (temporary) file system. Redeploying or server spin-downs reset the local database (`data.json`) back to the seed state. Go to `https://medora-link.vercel.app/signup` and sign up again before testing.
*   **Q: I get "Script execution is disabled" in PowerShell on Windows?**
    *   **A:** Windows blocks scripts by default. Run PowerShell as Administrator and run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process`, or run Command Prompt (`cmd`) and activate using `.\.venv\Scripts\activate.bat`.
