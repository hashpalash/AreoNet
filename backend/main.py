from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import io
import base64
import os
from PIL import Image
import numpy as np
from typing import Dict, List, Any, Literal
import logging

from segmentation import SegmentationModel, TERRAIN_CLASSES
from costmap import generate_cost_map
from dataset import gen_desert, gen_rocky, gen_mixed

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="AreoNet API",
    description="Autonomous UGV terrain segmentation and traversability analysis",
    version="1.0.0",
)

# CORS middleware - configure allowed origins for production
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://*.vercel.app",
    "https://vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if not os.getenv("ALLOWED_ORIGINS") else ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance
model: SegmentationModel = None


@app.on_event("startup")
async def startup_event():
    """Load SegFormer model on startup"""
    global model
    logger.info("Loading SegFormer model...")
    model = SegmentationModel()
    logger.info("✅ Model loaded successfully")


@app.get("/")
async def root():
    return {
        "name": "AreoNet API",
        "version": "1.0.0",
        "status": "operational",
        "model": "segformer-b2-finetuned-ade-512-512",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "model": "segformer-b2-desert",
        "device": model.device if model else "unknown",
        "version": "1.0.0",
    }


@app.get("/classes")
async def get_classes():
    """Return terrain class schema"""
    return {"classes": TERRAIN_CLASSES}


@app.post("/segment")
async def segment_image(file: UploadFile = File(...)):
    """
    Segment uploaded image and return:
    - Segmentation mask (colorized)
    - Traversability cost map
    - Class distribution
    - Inference metadata
    """
    try:
        # Validate file
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Read and preprocess image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        logger.info(f"Received image: {image.size}")

        # Run inference
        import time
        start = time.time()
        seg_mask, seg_colored, class_dist = model.predict(image)
        inference_ms = int((time.time() - start) * 1000)
        logger.info(f"Inference completed in {inference_ms}ms")

        # Generate cost map
        cost_map_img, cost_grid = generate_cost_map(seg_mask, TERRAIN_CLASSES)

        # Convert to base64
        seg_buffer = io.BytesIO()
        seg_colored.save(seg_buffer, format="PNG")
        seg_base64 = base64.b64encode(seg_buffer.getvalue()).decode()

        cost_buffer = io.BytesIO()
        cost_map_img.save(cost_buffer, format="PNG")
        cost_base64 = base64.b64encode(cost_buffer.getvalue()).decode()

        return JSONResponse({
            "seg_image": f"data:image/png;base64,{seg_base64}",
            "cost_image": f"data:image/png;base64,{cost_base64}",
            "class_distribution": class_dist,
            "miou_estimate": 65.2,  # Best epoch validation mIoU
            "inference_ms": inference_ms,
            "shape": list(seg_mask.shape),
            "model": "segformer-b2",
        })

    except Exception as e:
        logger.error(f"Error during inference: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/costmap")
async def generate_costmap_only(file: UploadFile = File(...)):
    """
    Return only the cost grid as 2D array
    """
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        # Run inference
        seg_mask, _, _ = model.predict(image)

        # Generate cost map
        _, cost_grid = generate_cost_map(seg_mask, TERRAIN_CLASSES)

        return JSONResponse({
            "cost_grid": cost_grid.tolist(),
            "shape": list(cost_grid.shape),
            "resolution_m": 0.05,  # 5cm per pixel (adjustable)
        })

    except Exception as e:
        logger.error(f"Error during costmap generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/terrain")
async def get_terrain(
    preset: str = Query("mixed", description="desert | rocky | mixed"),
    grid: int   = Query(48,      description="Grid size (default 48)"),
    seed: int   = Query(42,      description="Random seed"),
):
    """
    Return a pre-built terrain grid as JSON.

    Each cell contains:
      classId, cost, traversable, height, color (hex)
    """
    generators = {
        "desert": gen_desert,
        "rocky":  gen_rocky,
        "mixed":  gen_mixed,
    }
    gen_fn = generators.get(preset, gen_mixed)

    labels: np.ndarray = gen_fn(grid, seed)   # (grid, grid) int

    # Build height map using class base heights + noise
    rng = np.random.default_rng(seed)
    H_BASE  = [0.55, 0.35, 0.22, 0.08, 0.18, 0.02, 0.12, -0.25, 0.28, 0.80]
    H_VAR   = [0.50, 0.20, 0.12, 0.08, 0.15, 0.04, 0.06,  0.05, 0.12, 0.40]
    noise   = rng.random((grid, grid))

    height_map = np.vectorize(lambda cid: H_BASE[cid])(labels) + \
                 np.vectorize(lambda cid: H_VAR[cid])(labels) * noise

    # Build class lookup
    cls_map = {c["id"]: c for c in TERRAIN_CLASSES}

    cells = []
    for j in range(grid):
        row = []
        for i in range(grid):
            cid = int(labels[j, i])
            tc  = cls_map.get(cid, cls_map[3])
            row.append({
                "classId":    cid,
                "className":  tc["name"],
                "cost":       tc["cost"],
                "traversable": tc["traversable"],
                "height":     round(float(height_map[j, i]), 3),
                "color":      tc["color"],
            })
        cells.append(row)

    return JSONResponse({
        "preset":     preset,
        "grid":       grid,
        "seed":       seed,
        "worldSize":  20,
        "numClasses": len(TERRAIN_CLASSES),
        "classes":    TERRAIN_CLASSES,
        "cells":      cells,   # [j][i]
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
