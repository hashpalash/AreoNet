"""
Traversability cost map generation from segmentation masks
"""
import numpy as np
from PIL import Image
import cv2
from typing import Tuple, List, Dict


def generate_cost_map(
    seg_mask: np.ndarray,
    terrain_classes: List[Dict],
    blur_kernel: int = 5,
) -> Tuple[Image.Image, np.ndarray]:
    """
    Convert segmentation mask to traversability cost map
    
    Args:
        seg_mask: (H, W) array with class IDs
        terrain_classes: List of class definitions with 'cost' field
        blur_kernel: Gaussian blur kernel size for smoothing transitions
        
    Returns:
        - cost_map_img: PIL Image visualization (heatmap)
        - cost_grid: (H, W) float array normalized 0-1
    """
    h, w = seg_mask.shape
    cost_grid = np.zeros((h, w), dtype=np.float32)

    # Map each class to its traversal cost
    for cls in terrain_classes:
        class_id = cls["id"]
        cost = cls["cost"]
        cost_grid[seg_mask == class_id] = cost

    # Apply Gaussian blur to smooth cost transitions
    # This creates gradients around obstacles
    cost_grid = cv2.GaussianBlur(cost_grid, (blur_kernel, blur_kernel), 0)

    # Normalize to [0, 1]
    cost_grid = np.clip(cost_grid, 0, 1)

    # Create heatmap visualization
    cost_map_img = create_cost_heatmap(cost_grid)

    return cost_map_img, cost_grid


def create_cost_heatmap(cost_grid: np.ndarray) -> Image.Image:
    """
    Convert cost grid to color heatmap
    Green (low cost) -> Yellow -> Red (high cost)
    """
    # Normalize to 0-255
    cost_normalized = (cost_grid * 255).astype(np.uint8)

    # Apply colormap (COLORMAP_JET: blue=low, red=high)
    # For intuitive visualization: green=safe, red=danger
    heatmap = cv2.applyColorMap(cost_normalized, cv2.COLORMAP_JET)

    # BGR -> RGB
    heatmap_rgb = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)

    # Invert colormap (optional): make low cost = green
    # This step inverts so green=safe, red=high cost
    heatmap_rgb = 255 - heatmap_rgb

    # Apply custom colormap for better terrain visualization
    heatmap_custom = apply_terrain_colormap(cost_grid)

    return Image.fromarray(heatmap_custom)


def apply_terrain_colormap(cost_grid: np.ndarray) -> np.ndarray:
    """
    Custom terrain-aware colormap
    0.0 - 0.3: Green (safe)
    0.3 - 0.6: Yellow (caution)
    0.6 - 1.0: Red (danger)
    """
    h, w = cost_grid.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)

    # Safe zone (green)
    safe = cost_grid < 0.3
    rgb[safe, 1] = (255 * (1 - cost_grid[safe] / 0.3)).astype(np.uint8)  # Full green
    rgb[safe, 0] = (100 * (cost_grid[safe] / 0.3)).astype(np.uint8)  # Slight red

    # Caution zone (yellow)
    caution = (cost_grid >= 0.3) & (cost_grid < 0.6)
    t = (cost_grid[caution] - 0.3) / 0.3
    rgb[caution, 0] = (255).astype(np.uint8)  # Red channel
    rgb[caution, 1] = (255 * (1 - t)).astype(np.uint8)  # Green fades

    # Danger zone (red)
    danger = cost_grid >= 0.6
    rgb[danger, 0] = 255
    rgb[danger, 1] = 0
    rgb[danger, 2] = 0

    return rgb


def export_cost_grid_ros(cost_grid: np.ndarray, resolution: float = 0.05) -> Dict:
    """
    Export cost map in ROS-compatible format
    
    Args:
        cost_grid: (H, W) normalized cost array
        resolution: meters per pixel
        
    Returns:
        Dictionary compatible with ROS nav_msgs/OccupancyGrid
    """
    h, w = cost_grid.shape
    
    # Convert to int8 occupancy (0-100 scale)
    occupancy = (cost_grid * 100).astype(np.int8).flatten().tolist()
    
    return {
        "header": {
            "frame_id": "map",
        },
        "info": {
            "resolution": resolution,
            "width": w,
            "height": h,
            "origin": {
                "position": {"x": 0.0, "y": 0.0, "z": 0.0},
                "orientation": {"x": 0.0, "y": 0.0, "z": 0.0, "w": 1.0},
            },
        },
        "data": occupancy,
    }
