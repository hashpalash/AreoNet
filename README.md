# AreoNet

**Autonomous UGV Perception Platform for Off-Road Navigation**

AreoNet is a production-ready semantic segmentation system designed for autonomous unmanned ground vehicles (UGVs) operating in desert and off-road environments. The platform combines state-of-the-art deep learning with real-time 3D simulation to enable robust terrain traversability analysis and path planning.

## Overview

AreoNet addresses the critical challenge of terrain perception for autonomous navigation in unstructured outdoor environments. The system provides pixel-level semantic segmentation to classify terrain types and generate traversability cost maps for path planning algorithms.

### Key Capabilities

- **Real-time Semantic Segmentation**: Pixel-accurate classification of desert terrain elements
- **Traversability Analysis**: Automated generation of navigation cost maps
- **3D Digital Twin Simulation**: Interactive visualization of rover navigation with live inference
- **Production API**: RESTful endpoints for integration with autonomous systems
- **Visual Workflow System**: Interactive pipeline for algorithm development and debugging

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- Docker (optional, for backend)

### Installation

1. **Clone the repository**
   `ash
   git clone <your-repo-url>
   cd AreoNet
   ``n
2. **Frontend Setup**
   `ash
   cd AreoNet
   npm install
   npm run dev
   ``n
3. **Backend Setup**
   `ash
   cd backend
   pip install -r requirements.txt
   python main.py
   ``n
## Deployment

### Frontend (Vercel)
The frontend is configured for easy deployment on Vercel.
1. Push your code to GitHub.
2. Import the project in Vercel.
3. Set the Root Directory to `AreoNet`.
4. Add necessary environment variables.
5. Deploy!

### Backend (Railway/Render)
The backend includes a `Dockerfile` for easy deployment on platforms like Railway or Render.

## License
MIT License