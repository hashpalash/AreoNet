# 🚀 AreoNet Deployment Guide

This guide covers deploying AreoNet to production environments.

---

## 📦 Deployment Options

### Option 1: Docker Compose (Recommended for Self-Hosted)

**Best for:** VPS, AWS EC2, Digital Ocean, dedicated servers

#### Prerequisites
- Ubuntu 22.04 or similar Linux server
- Docker & Docker Compose installed
- At least 4GB RAM
- 10GB disk space

#### Steps

```bash
# Clone repository
git clone <your-repo-url>
cd dunenet

# Create .env file
cp .env.example .env
nano .env  # Edit as needed

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Backend: http://your-server-ip:8000
# Frontend: http://your-server-ip:3000
```

#### Nginx Reverse Proxy (Optional)

```nginx
# /etc/nginx/sites-available/dunenet
server {
    listen 80;
    server_name dunenet.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable with:
```bash
sudo ln -s /etc/nginx/sites-available/dunenet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Option 2: Vercel (Frontend) + Railway/Render (Backend)

**Best for:** Quick deployments, serverless scaling

#### 2A. Deploy Frontend to Vercel

```bash
cd frontend
npm install -g vercel
vercel login
vercel
```

Or use the Vercel GitHub integration (recommended):
1. Push code to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Set environment variable: `NEXT_PUBLIC_API_URL=<your-backend-url>`
4. Deploy

#### 2B. Deploy Backend to Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Set root directory to `backend/`
5. Railway auto-detects the Dockerfile
6. Set environment variables (if needed)
7. Deploy

**Alternative:** Use [Render.com](https://render.com) — similar process.

---

### Option 3: AWS (ECS/Fargate + S3)

**Best for:** Enterprise deployments, high availability

#### Backend on ECS

```bash
# Build and push to ECR
aws ecr create-repository --repository-name dunenet-backend

docker build -t dunenet-backend ./backend
docker tag dunenet-backend:latest <aws-account>.dkr.ecr.<region>.amazonaws.com/dunenet-backend:latest
docker push <aws-account>.dkr.ecr.<region>.amazonaws.com/dunenet-backend:latest

# Create ECS service with Fargate
# Use AWS Console or Terraform/CloudFormation
```

#### Frontend on S3 + CloudFront

```bash
cd frontend
npm run build
aws s3 sync out/ s3://dunenet-frontend-bucket
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

---

### Option 4: Kubernetes (GKE, EKS, AKS)

**Best for:** Large-scale, microservices architecture

#### Example Kubernetes Manifests

**backend-deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dunenet-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dunenet-backend
  template:
    metadata:
      labels:
        app: dunenet-backend
    spec:
      containers:
      - name: backend
        image: <your-registry>/dunenet-backend:latest
        ports:
        - containerPort: 8000
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
---
apiVersion: v1
kind: Service
metadata:
  name: dunenet-backend-svc
spec:
  selector:
    app: dunenet-backend
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

Apply:
```bash
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
```

---

## 🔐 Production Security Checklist

- [ ] Set `allow_origins` in CORS to specific domains (not `"*"`)
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS (Let's Encrypt with Certbot)
- [ ] Set up rate limiting (e.g., with nginx `limit_req_zone`)
- [ ] Add API authentication (JWT tokens)
- [ ] Enable firewall (UFW on Ubuntu)
- [ ] Regular security updates (`apt update && apt upgrade`)
- [ ] Monitor logs (e.g., with ELK stack or CloudWatch)
- [ ] Set up backups (if storing data)

---

## 📊 Monitoring & Logging

### Docker Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Health Checks
```bash
# Backend
curl http://localhost:8000/health

# Frontend (check if running)
curl http://localhost:3000
```

### Prometheus + Grafana (Optional)

Add to `docker-compose.yml`:
```yaml
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
```

---

## ⚡ Performance Optimization

### Backend
- Use **GPU inference** for faster processing (80ms vs 420ms)
- Enable **model quantization** (reduces memory by 4x)
- Implement **batching** for multiple requests
- Add **Redis caching** for frequent queries
- Use **load balancing** (nginx upstream)

### Frontend
- Enable **Next.js caching** (ISR/SSG)
- Use **CDN** for static assets (Cloudflare, CloudFront)
- Optimize images with `next/image`
- Implement **lazy loading** for Three.js scene
- Use **compression** (gzip/brotli)

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

**.github/workflows/deploy.yml**
```yaml
name: Deploy DuneNet

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and push Docker image
        run: |
          docker build -t dunenet-backend ./backend
          docker tag dunenet-backend:latest ${{ secrets.DOCKER_REGISTRY }}/dunenet-backend:latest
          docker push ${{ secrets.DOCKER_REGISTRY }}/dunenet-backend:latest
      
      - name: Deploy to production
        run: |
          ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_IP }} "cd /opt/dunenet && docker-compose pull && docker-compose up -d"

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
```

---

## 🧪 Testing in Production

```bash
# Test backend API
curl -X POST http://your-domain.com/api/segment \
  -F "file=@test_image.jpg"

# Load test with Apache Bench
ab -n 100 -c 10 http://your-domain.com/api/health

# Monitor response times
watch -n 1 'curl -w "@curl-format.txt" -o /dev/null -s http://your-domain.com/api/health'
```

---

## 🆘 Troubleshooting Production Issues

### Issue: High CPU usage
**Solution:** 
- Use GPU inference
- Reduce concurrent workers
- Implement request queuing

### Issue: Out of memory
**Solution:**
- Increase container memory limits
- Enable model quantization
- Use smaller input resolution (256×256)

### Issue: Slow inference
**Solution:**
- Check if using CPU (should be GPU in production)
- Profile with `cProfile` or `py-spy`
- Enable model caching

### Issue: CORS errors in production
**Solution:**
- Update `allow_origins` in backend `main.py`
- Set correct `NEXT_PUBLIC_API_URL` in frontend

---

## 📞 Support

For production deployment assistance, please open an issue on GitHub or contact the development team.

---

## 🎯 Next Steps After Deployment

1. ✅ Test all API endpoints
2. ✅ Verify frontend → backend connectivity
3. ✅ Run load tests
4. ✅ Set up monitoring
5. ✅ Configure backups
6. ✅ Document your infrastructure
7. ✅ Set up alerting (PagerDuty, Sentry)

**Your DuneNet system is now production-ready!** 🎉
