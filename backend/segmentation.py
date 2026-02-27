"""
SegFormer inference module for terrain segmentation
"""
import torch
import numpy as np
from PIL import Image
from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation
from typing import Tuple, List, Dict
import logging

logger = logging.getLogger(__name__)

# 10-class terrain schema
TERRAIN_CLASSES = [
    {"id": 0, "name": "Rock", "color": "#8B7355", "cost": 0.9, "traversable": False},
    {"id": 1, "name": "Bush", "color": "#4A7023", "cost": 0.75, "traversable": False},
    {"id": 2, "name": "Log", "color": "#8B4513", "cost": 0.85, "traversable": False},
    {"id": 3, "name": "Sand", "color": "#DEB887", "cost": 0.2, "traversable": True},
    {"id": 4, "name": "Landscape", "color": "#C4A862", "cost": 0.15, "traversable": True},
    {"id": 5, "name": "Sky", "color": "#87CEEB", "cost": 0.0, "traversable": False},
    {"id": 6, "name": "Gravel", "color": "#A9A9A9", "cost": 0.35, "traversable": True},
    {"id": 7, "name": "Water", "color": "#4169E1", "cost": 0.95, "traversable": False},
    {"id": 8, "name": "Vegetation", "color": "#228B22", "cost": 0.5, "traversable": True},
    {"id": 9, "name": "Obstacle", "color": "#DC143C", "cost": 1.0, "traversable": False},
]


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


class SegmentationModel:
    """
    SegFormer-based terrain segmentation model
    
    In production, this would load a fine-tuned model checkpoint.
    For demo purposes, we use a pretrained ADE20K model and remap classes.
    """

    def __init__(self, model_name: str = "nvidia/segformer-b2-finetuned-ade-512-512"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Initializing SegFormer on {self.device}")

        # Load model and processor
        self.processor = SegformerImageProcessor.from_pretrained(model_name)
        self.model = SegformerForSemanticSegmentation.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()

        # Build color map
        self.color_map = np.array([hex_to_rgb(c["color"]) for c in TERRAIN_CLASSES], dtype=np.uint8)
        logger.info(f"✅ SegFormer loaded: {model_name}")

    def predict(self, image: Image.Image) -> Tuple[np.ndarray, Image.Image, List[Dict]]:
        """
        Run inference on input image
        
        Returns:
            - seg_mask: (H, W) int array with class IDs
            - seg_colored: PIL Image with color-coded classes
            - class_distribution: List of dicts with class stats
        """
        # Preprocess
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)

        # Inference
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits  # (1, num_classes, H, W)

        # Upsample to original resolution
        logits = torch.nn.functional.interpolate(
            logits,
            size=(512, 512),  # Standard resolution
            mode="bilinear",
            align_corners=False,
        )

        # Get class predictions
        seg_mask = logits.argmax(dim=1).squeeze(0).cpu().numpy()  # (H, W)

        # Remap ADE20K classes to our 10 desert classes
        # (In production, this would be a proper fine-tuned model)
        seg_mask = self._remap_classes(seg_mask)

        # Colorize
        seg_colored = self._colorize_mask(seg_mask)

        # Compute class distribution
        class_dist = self._compute_class_distribution(seg_mask)

        return seg_mask, seg_colored, class_dist

    def _remap_classes(self, mask: np.ndarray) -> np.ndarray:
        """
        Remap ADE20K classes to our desert terrain classes
        
        NOTE: In production, you'd use a model trained on your custom dataset.
        This is a demo mapping to show the pipeline.
        """
        remapped = np.zeros_like(mask)
        
        # Example heuristic mapping (ADE20K -> Desert classes)
        # This is simplified — a real system uses a trained model
        remapped[np.isin(mask, [13, 14, 17])] = 0  # Roads/ground -> Rock
        remapped[np.isin(mask, [4, 9, 17])] = 1  # Trees -> Bush
        remapped[np.isin(mask, [5, 18])] = 2  # Furniture -> Log (placeholder)
        remapped[np.isin(mask, [29, 46, 62])] = 3  # Sand/path
        remapped[np.isin(mask, [3, 13, 45])] = 4  # Landscape (floor, ground)
        remapped[np.isin(mask, [2])] = 5  # Sky
        remapped[np.isin(mask, [15, 53])] = 6  # Gravel (road variants)
        remapped[np.isin(mask, [21, 26])] = 7  # Water (sea, lake, river)
        remapped[np.isin(mask, [4, 17, 67])] = 8  # Vegetation (grass, plant)
        remapped[np.isin(mask, [19, 20, 33])] = 9  # Obstacle (car, wall, fence)

        return remapped

    def _colorize_mask(self, mask: np.ndarray) -> Image.Image:
        """Convert class mask to RGB image"""
        h, w = mask.shape
        colored = np.zeros((h, w, 3), dtype=np.uint8)
        for class_id in range(len(TERRAIN_CLASSES)):
            colored[mask == class_id] = self.color_map[class_id]
        return Image.fromarray(colored)

    def _compute_class_distribution(self, mask: np.ndarray) -> List[Dict]:
        """Compute per-class pixel distribution"""
        total_pixels = mask.size
        distribution = []
        
        for cls in TERRAIN_CLASSES:
            count = np.sum(mask == cls["id"])
            conf = float(count / total_pixels)
            if conf > 0.01:  # Only include classes with >1% coverage
                distribution.append({
                    "name": cls["name"],
                    "conf": round(conf, 3),
                    "color": cls["color"],
                })
        
        # Sort by confidence descending
        distribution.sort(key=lambda x: x["conf"], reverse=True)
        return distribution
