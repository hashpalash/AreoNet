"""
Synthetic terrain dataset generator for SegFormer fine-tuning.

Generates top-down 2D renders of procedural terrain grids, each pixel
corresponds to one terrain cell with an RGB color + class label.

Run standalone:
    python dataset.py --out ./terrain_dataset --n 2000 --size 512
"""
import argparse
import os
import json
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageDraw

# ─── Terrain Class Schema (must match TERRAIN_CLASSES in segmentation.py) ─────
TERRAIN_CLASSES = [
    {"id": 0, "name": "Rock",       "rgb": (139, 115,  85), "cost": 0.9,  "traversable": False},
    {"id": 1, "name": "Bush",       "rgb": ( 74, 112,  35), "cost": 0.75, "traversable": False},
    {"id": 2, "name": "Log",        "rgb": (139,  69,  19), "cost": 0.85, "traversable": False},
    {"id": 3, "name": "Sand",       "rgb": (222, 184, 135), "cost": 0.2,  "traversable": True },
    {"id": 4, "name": "Landscape",  "rgb": (196, 168,  98), "cost": 0.15, "traversable": True },
    {"id": 5, "name": "Clear",      "rgb": (200, 210, 220), "cost": 0.1,  "traversable": True },
    {"id": 6, "name": "Gravel",     "rgb": (169, 169, 169), "cost": 0.35, "traversable": True },
    {"id": 7, "name": "Water",      "rgb": ( 30,  80, 200), "cost": 0.95, "traversable": False},
    {"id": 8, "name": "Vegetation", "rgb": ( 34, 139,  34), "cost": 0.5,  "traversable": True },
    {"id": 9, "name": "Obstacle",   "rgb": (220,  20,  60), "cost": 1.0,  "traversable": False},
]

NUM_CLASSES = len(TERRAIN_CLASSES)
ID2RGB   = {c["id"]: c["rgb"]  for c in TERRAIN_CLASSES}
ID2NAME  = {c["id"]: c["name"] for c in TERRAIN_CLASSES}

# ─── Noise Helpers ─────────────────────────────────────────────────────────────

def _pseudo_rand(grid_x: np.ndarray, grid_y: np.ndarray, seed: int) -> np.ndarray:
    """Deterministic pseudo-random field from 2D grid coords."""
    r = np.sin(grid_x * (127.1 + seed * 0.07) + grid_y * (311.7 + seed * 0.13)) * 43758.5453
    return r - np.floor(r)


def _sine_noise(nx: np.ndarray, nz: np.ndarray, freqs, seed: int) -> np.ndarray:
    """Sum of sine waves with phase offsets for terrain-like variation."""
    rng = np.random.default_rng(seed)
    acc = np.zeros_like(nx)
    for fx, fz, amp in freqs:
        px, pz = rng.uniform(0, 2 * np.pi, 2)
        acc += amp * np.sin(nx * np.pi * fx + px) * np.cos(nz * np.pi * fz + pz)
    return acc


# ─── Terrain Generators ────────────────────────────────────────────────────────

def gen_desert(size: int, seed: int) -> np.ndarray:
    """Mostly sand + rock clusters, scattered bush/log, few obstacles."""
    ix = np.arange(size); iz = np.arange(size)
    X, Z = np.meshgrid(ix / (size - 1), iz / (size - 1))  # each is (size, size)
    I, J = np.meshgrid(ix, iz)

    wave = _sine_noise(X, Z, [(3, 2.5, 0.4), (9, 7, 0.2), (16, 12, 0.08)], seed)
    r    = _pseudo_rand(I + seed, J + seed * 2, seed)

    labels = np.full((size, size), 3, dtype=np.uint8)  # Sand default
    labels[wave > 0.45] = 0               # Rock
    labels[(wave > 0.30) & (r > 0.78)] = 1  # Bush
    labels[(wave > 0.22) & (r > 0.90)] = 2  # Log
    labels[(wave < 0.0)]               = 4  # Landscape dips
    labels[r > 0.96]                   = 9  # Obstacle
    return labels


def gen_rocky(size: int, seed: int) -> np.ndarray:
    """Dense rock with a gravel/sand corridor down the middle."""
    ix = np.arange(size); iz = np.arange(size)
    X, Z = np.meshgrid(ix / (size - 1), iz / (size - 1))
    I, J = np.meshgrid(ix, iz)

    wave = _sine_noise(X, Z, [(5, 4, 0.55), (10, 8, 0.25), (20, 15, 0.1)], seed)
    r    = _pseudo_rand(I * 2 + seed, J * 3 + seed, seed)
    dist = np.abs(X - 0.5)  # distance from vertical centre

    labels = np.full((size, size), 0, dtype=np.uint8)   # Rock default
    labels[wave > 0.38] = 9        # Obstacle
    labels[wave < -0.2] = 8        # Vegetation in valleys
    labels[dist < 0.12] = 6        # Gravel corridor
    labels[(dist < 0.07) & (r < 0.55)] = 3  # Sand within corridor
    labels[(dist < 0.12) & (r > 0.86)] = 2  # Logs blocking corridor
    labels[(dist > 0.35) & (r > 0.88)] = 1  # Bush far from corridor
    return labels


def gen_mixed(size: int, seed: int) -> np.ndarray:
    """All 10 classes – zoned terrain with water, forest, rocks, path."""
    ix = np.arange(size); iz = np.arange(size)
    X, Z = np.meshgrid(ix / (size - 1), iz / (size - 1))
    I, J = np.meshgrid(ix, iz)

    wave = _sine_noise(X, Z, [(4, 3, 0.35), (10, 8, 0.15), (18, 14, 0.06)], seed)
    r    = _pseudo_rand(I + seed * 3, J + seed, seed)

    labels = np.full((size, size), 4, dtype=np.uint8)  # Landscape default

    # Water zone – bottom-right circle
    dist_water = np.hypot(X - 0.82, Z - 0.82)
    labels[dist_water < 0.18] = 7         # Water
    labels[(dist_water >= 0.18) & (dist_water < 0.27)] = 6  # Gravel shore

    # Rock zone – top-right quadrant
    labels[(X > 0.65) & (Z < 0.35) & (wave > 0.20)] = 0
    labels[(X > 0.65) & (Z < 0.35) & (wave > 0.35)] = 9

    # Vegetation / bush zone – top-left quadrant
    labels[(X < 0.35) & (Z < 0.35)] = 8
    labels[(X < 0.35) & (Z < 0.35) & (r > 0.70)] = 1

    # Logs scattered diagonally
    log_diag = np.abs((X - Z)) < 0.04
    labels[log_diag & (r > 0.80)] = 2

    # Clear patches centre
    labels[(np.abs(X - 0.5) < 0.1) & (np.abs(Z - 0.5) < 0.1) & (r > 0.65)] = 5

    # Obstacles along edges
    labels[r > 0.97] = 9

    # Gravel paths
    gravel_path = (np.abs(X - 0.5) < 0.06) | (np.abs(Z - 0.5) < 0.06)
    labels[gravel_path & (labels == 4)] = 6

    # Sand strips
    labels[(wave > 0.15) & (labels == 4) & (r > 0.6)] = 3

    return labels


def gen_random(size: int, seed: int) -> np.ndarray:
    """Randomly pick one of the three terrain styles."""
    style = seed % 3
    if style == 0: return gen_desert(size, seed)
    if style == 1: return gen_rocky(size, seed)
    return gen_mixed(size, seed)


# ─── Augmentation ─────────────────────────────────────────────────────────────

def augment_image(img: Image.Image, label: np.ndarray, rng: np.random.Generator):
    """Random flips, rotation and slight color jitter (preserves label alignment)."""
    # Horizontal flip
    if rng.random() > 0.5:
        img   = img.transpose(Image.FLIP_LEFT_RIGHT)
        label = np.fliplr(label)
    # Vertical flip
    if rng.random() > 0.5:
        img   = img.transpose(Image.FLIP_TOP_BOTTOM)
        label = np.flipud(label)
    # 90° rotation (k ∈ {0,1,2,3})
    k = int(rng.integers(0, 4))
    if k > 0:
        img   = img.rotate(k * 90)
        label = np.rot90(label, k)
    # Slight color jitter (image only, not label)
    factor = rng.uniform(0.85, 1.15)
    arr = np.clip(np.array(img).astype(np.float32) * factor, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    return img, np.ascontiguousarray(label)


# ─── Image Renderer ────────────────────────────────────────────────────────────

def render_terrain(
    labels: np.ndarray, size: int, rng: np.random.Generator, noise_std: float = 8.0
) -> Image.Image:
    """
    Convert label map → RGB image.
    Adds per-class color jitter + texture noise for realism.
    """
    H, W = labels.shape
    rgb = np.zeros((H, W, 3), dtype=np.uint8)
    for cid, tc in enumerate(TERRAIN_CLASSES):
        mask = labels == cid
        if not mask.any():
            continue
        base = np.array(tc["rgb"], dtype=np.float32)
        # Per-pixel color jitter
        jitter = rng.normal(0, noise_std, (mask.sum(), 3))
        pix = np.clip(base + jitter, 0, 255).astype(np.uint8)
        rgb[mask] = pix

    img = Image.fromarray(rgb, "RGB")
    # Slight Gaussian blur to smooth hard edges
    img = img.filter(ImageFilter.GaussianBlur(radius=0.8))
    if size != H:
        img = img.resize((size, size), Image.BILINEAR)
    return img


# ─── Dataset Generation ────────────────────────────────────────────────────────

def generate_dataset(
    out_dir: str,
    n: int = 1000,
    grid: int = 64,
    img_size: int = 512,
    val_split: float = 0.15,
    seed: int = 42,
    augment: bool = True,
):
    """
    Generate `n` (image, label) pairs and save to disk.

    Directory structure:
        out_dir/
            images/train/*.png
            images/val/*.png
            annotations/train/*.png   (single-channel label images)
            annotations/val/*.png
            class_info.json
    """
    rng = np.random.default_rng(seed)
    out = Path(out_dir)
    n_val = max(1, int(n * val_split))
    splits = {"train": n - n_val, "val": n_val}

    for split, count in splits.items():
        (out / "images"      / split).mkdir(parents=True, exist_ok=True)
        (out / "annotations" / split).mkdir(parents=True, exist_ok=True)

    idx = 0
    for split, count in splits.items():
        for k in range(count):
            s = int(rng.integers(0, 2**31))
            labels = gen_random(grid, s)
            img    = render_terrain(labels, img_size, rng)
            # Resize labels to match image size (nearest)
            if img_size != grid:
                lbl_pil = Image.fromarray(labels, "L").resize(
                    (img_size, img_size), Image.NEAREST
                )
                labels = np.array(lbl_pil)

            if augment and split == "train":
                img, labels = augment_image(img, labels, rng)

            stem = f"{idx:06d}"
            img.save(out / "images" / split / f"{stem}.png")
            Image.fromarray(labels, "L").save(
                out / "annotations" / split / f"{stem}.png"
            )
            idx += 1

            if (k + 1) % 100 == 0:
                print(f"  [{split}] {k + 1}/{count}")

    # Save class info
    with open(out / "class_info.json", "w") as f:
        json.dump(TERRAIN_CLASSES, f, indent=2)

    print(f"\n✅ Dataset saved to {out_dir}")
    print(f"   {splits['train']} train, {splits['val']} val images ({img_size}×{img_size})")
    return str(out)


# ─── HuggingFace Dataset Wrapper ──────────────────────────────────────────────

def load_hf_dataset(root: str):
    """
    Load generated dataset as a HuggingFace DatasetDict.
    Requires: datasets, Pillow
    """
    from datasets import Dataset, DatasetDict, Features, Value, Image as HFImage

    def _gen(split: str):
        img_dir = Path(root) / "images" / split
        ann_dir = Path(root) / "annotations" / split
        for p in sorted(img_dir.glob("*.png")):
            yield {
                "image":      str(p),
                "annotation": str(ann_dir / p.name),
            }

    return DatasetDict({
        split: Dataset.from_generator(lambda s=split: _gen(s))
        for split in ("train", "val")
    })


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Generate synthetic terrain dataset")
    ap.add_argument("--out",  default="./terrain_dataset", help="Output directory")
    ap.add_argument("--n",    type=int, default=1000,      help="Total samples")
    ap.add_argument("--grid", type=int, default=64,        help="Terrain grid size")
    ap.add_argument("--size", type=int, default=512,       help="Output image size")
    ap.add_argument("--seed", type=int, default=42,        help="Random seed")
    ap.add_argument("--no-aug", action="store_true",       help="Disable augmentation")
    args = ap.parse_args()

    generate_dataset(
        out_dir=args.out,
        n=args.n,
        grid=args.grid,
        img_size=args.size,
        seed=args.seed,
        augment=not args.no_aug,
    )
