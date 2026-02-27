# ⚡ AreoNet Quick Start

Get AreoNet running in **under 5 minutes** on Windows.

---

## 🎯 Fastest Method: Docker (Recommended)

### Prerequisites
- Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
- Start Docker Desktop

### Run DuneNet

1. **Open PowerShell in project folder:**
   ```powershell
   cd c:\Users\Palash\Downloads\wofc
   ```

2. **Start the project:**
   ```powershell
   .\start.ps1
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

That's it! 🎉

---

## 🔧 Alternative: Manual Setup (No Docker)

### Backend

```powershell
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start server
uvicorn main:app --reload --port 8000
```

**Backend running at:** http://localhost:8000

---

### Frontend (Open New Terminal)

```powershell
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

**Frontend running at:** http://localhost:3000

---

## 🧪 Test the System

### 1. Check Backend Health
Open: http://localhost:8000/health

Expected response:
```json
{
  "status": "ok",
  "model": "segformer-b2-desert",
  "device": "cpu",
  "version": "1.0.0"
}
```

### 2. View API Documentation
Open: http://localhost:8000/docs

### 3. Test Frontend
Open: http://localhost:3000

- Scroll to **Live Inference Demo** section
- Upload a desert/terrain image
- Click **Run Inference**
- View segmentation mask + cost map

---

## 🎨 What You'll See

### ✅ Homepage Features
- **Hero Section** with animated particle field
- **Stats Bar** (65% mIoU, 10 classes, 512² resolution)
- **3D Rover Digital Twin** (Three.js powered)
- **10 Terrain Classes** with traversal costs
- **Live Segmentation Demo** (upload + inference)
- **System Architecture** pipeline
- **API Reference** with interactive docs
- **Footer** with credits

---

## 📝 Quick Commands

```powershell
# Stop Docker services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# Rebuild after code changes
docker-compose up --build
```

---

## 🐛 Common Issues

### "Docker is not running"
**Fix:** Start Docker Desktop and wait for it to fully load

### "Port 8000 already in use"
**Fix:** 
```powershell
# Find process using port
netstat -ano | findstr :8000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### "npm install fails"
**Fix:** Delete `node_modules` and `package-lock.json`, then retry:
```powershell
rm -r node_modules, package-lock.json
npm install
```

### "Model download is slow"
**Fix:** First run downloads SegFormer weights (~350MB) from HuggingFace. This is normal. Subsequent runs are fast.

---

## 🚀 Next Steps

1. ✅ **Upload test images** to the demo
2. ✅ **Explore the 3D rover** (click & drag to rotate)
3. ✅ **Try the API** at http://localhost:8000/docs
4. ✅ **Read full docs** in [README.md](README.md)
5. ✅ **Deploy to production** using [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🆘 Need Help?

- **API Docs:** http://localhost:8000/docs
- **GitHub Issues:** [Create an issue]
- **Full README:** [README.md](README.md)
- **Deployment Guide:** [DEPLOYMENT.md](DEPLOYMENT.md)

---

**Enjoy using DuneNet!** 🏜️🤖
