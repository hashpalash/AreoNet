# 🚀 Vercel Deployment Guide for AreoNet

## Architecture Overview

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Vercel    │─────▶│   Railway    │─────▶│  MongoDB    │
│  (Frontend) │      │  (Backend)   │      │   Atlas     │
└─────────────┘      └──────────────┘      └─────────────┘
```

---

## Part 1: Deploy Backend to Railway (Docker)

### Why Railway?
- ✅ Native Docker support
- ✅ Automatic HTTPS
- ✅ Free tier available ($5 credit/month)
- ✅ Perfect for ML models with PyTorch

### Steps:

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy Backend**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Deploy from backend directory
   cd backend
   railway init
   railway up
   ```

3. **Or Use GitHub Integration** (Recommended)
   - Push your code to GitHub
   - In Railway dashboard: "New Project" → "Deploy from GitHub"
   - Select repository
   - Set **Root Directory**: `backend`
   - Railway auto-detects `Dockerfile`
   
4. **Configure Environment Variables** (in Railway dashboard)
   ```
   PORT=8000
   NUM_CLASSES=10
   IMG_SIZE=512
   MODEL_NAME=nvidia/mit-b4
   ```

5. **Upload Model Weights**
   - In Railway dashboard, go to "Settings" → "Volumes"
   - Create volume: `/app/models`
   - Upload `latest_model_ft.pth` (245MB)
   - Or use GitHub Large Files (LFS) to track the model in your repo

6. **Get Backend URL**
   - Railway provides: `https://your-app-name.railway.app`
   - Copy this URL for Vercel configuration

---

## Part 2: Deploy Frontend to Vercel

### Method A: Vercel CLI (Quick)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from project root
cd C:\Users\Palash\Downloads\wofc
vercel
```

When prompted:
- Set up and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **N**
- Project name? **dunenet**
- In which directory is your code? **./DuneNet**
- Auto-detected settings? **Y**

### Method B: GitHub Integration (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/dunenet.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your GitHub repository
   - Configure:
     - **Framework Preset**: Next.js
     - **Root Directory**: `DuneNet`
     - **Build Command**: `npm run build`
     - **Output Directory**: `.next`

3. **Add Environment Variables**
   
   In Vercel dashboard → Project → Settings → Environment Variables:
   
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app
   NEXTAUTH_URL=https://your-vercel-app.vercel.app
   NEXTAUTH_SECRET=<generate-random-32-char-string>
   MONGODB_URI=mongodb+srv://palash9e_db_user:dB13Nr6JUWXIRSgy@cluster0.z59oimp.mongodb.net/dunenet?retryWrites=true&w=majority&appName=Cluster0
   ```

   **Generate NEXTAUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app will be live at: `https://dunenet.vercel.app`

---

## Part 3: Update CORS Settings

After deployment, update backend CORS to allow Vercel domain:

**In `backend/main.py`:**

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://dunenet.vercel.app",  # Add your Vercel URL
        "https://*.vercel.app"  # Allow preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Redeploy backend after this change.

---

## Alternative: Deploy Backend to Render

If you prefer Render over Railway:

1. Go to [render.com](https://render.com)
2. "New" → "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Name**: dunenet-backend
   - **Environment**: Docker
   - **Region**: Oregon (or nearest)
   - **Branch**: main
   - **Root Directory**: `backend`
   - **Instance Type**: Free (or Starter $7/month for better performance)

5. Add environment variables (same as Railway)
6. Deploy

Render URL: `https://dunenet-backend.onrender.com`

---

## Alternative: Deploy Backend to Fly.io

For global edge deployment:

```bash
# Install Fly CLI
# Windows PowerShell:
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Login
fly auth login

# Deploy
cd backend
fly launch
```

---

## Testing Production Deployment

1. **Test Backend**
   ```bash
   curl https://your-railway-backend.railway.app/
   curl https://your-railway-backend.railway.app/model/info
   ```

2. **Test Frontend**
   - Visit: `https://your-vercel-app.vercel.app`
   - Test login, simulation, dashboard

3. **Test End-to-End**
   - Upload a Mars terrain image in simulation
   - Verify segmentation works
   - Check if results are displayed

---

## Cost Estimates

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Vercel** | 100GB bandwidth | $20/month (Pro) |
| **Railway** | $5 credit/month | $20/month usage-based |
| **MongoDB Atlas** | 512MB free | $9/month (M10) |
| **Total** | ~Free for testing | $29-49/month production |

---

## Troubleshooting

### Backend Issues

**Model not loading:**
- Ensure `latest_model_ft.pth` is in `backend/models/`
- Check Railway logs: `railway logs`
- Verify environment variables are set

**Out of memory:**
- Upgrade Railway instance
- Or reduce model size in code

### Frontend Issues

**CORS errors:**
- Update `allow_origins` in backend
- Redeploy backend

**Authentication not working:**
- Verify `MONGODB_URI` is set in Vercel
- Check `NEXTAUTH_URL` matches your Vercel domain
- Ensure `NEXTAUTH_SECRET` is set

**API calls failing:**
- Verify `NEXT_PUBLIC_API_URL` points to Railway backend
- Check Railway backend is running: visit URL in browser

---

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Deploy frontend to Vercel
3. ✅ Update environment variables
4. ✅ Test production deployment
5. 🎉 Share your live app!

Your production URLs:
- Frontend: `https://dunenet.vercel.app`
- Backend: `https://your-app.railway.app`
- Database: `cluster0.z59oimp.mongodb.net`
