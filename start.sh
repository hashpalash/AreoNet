#!/bin/bash

echo "🏜️  Starting AreoNet — Autonomous UGV Perception Platform"
echo "=================================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ .env created"
fi

echo ""
echo "🚀 Building and starting services..."
echo ""

# Start docker-compose
docker-compose up --build

echo ""
echo "=================================================="
echo "DuneNet is now running!"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo "=================================================="
