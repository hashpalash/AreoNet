"""
Fine-tune SegFormer on the synthetic DuneNet terrain dataset.

Usage:
    # 1. Generate dataset first
    python dataset.py --out ./terrain_dataset --n 2000

    # 2. Train
    python train.py \
        --data   ./terrain_dataset \
        --model  nvidia/segformer-b2-finetuned-ade-512-512 \
        --out    ./checkpoints/dunenet \
        --epochs 30 \
        --bs     8 \
        --lr     6e-5

Outputs:
    checkpoints/dunenet/          ← best checkpoint (saved by val mIoU)
    checkpoints/dunenet/metrics.json
"""
import argparse
import json
import logging
import os
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader, Dataset
from PIL import Image
from torch.optim import AdamW
from torch.optim.lr_scheduler import OneCycleLR
from tqdm import tqdm
from transformers import (
    SegformerForSemanticSegmentation,
    SegformerImageProcessor,
    get_cosine_schedule_with_warmup,
)

from dataset import TERRAIN_CLASSES

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

NUM_CLASSES = len(TERRAIN_CLASSES)
ID2LABEL    = {c["id"]: c["name"] for c in TERRAIN_CLASSES}
LABEL2ID    = {c["name"]: c["id"] for c in TERRAIN_CLASSES}


# ─── Dataset ──────────────────────────────────────────────────────────────────

class TerrainSegDataset(Dataset):
    """
    Returns (pixel_values, labels) tensors ready for SegformerForSemanticSegmentation.

    pixel_values : FloatTensor (3, H, W) – preprocessed by SegformerImageProcessor
    labels       : LongTensor  (H, W)   – class indices 0..NUM_CLASSES-1
    """

    def __init__(
        self,
        root: str,
        split: str,
        processor: SegformerImageProcessor,
        img_size: int = 512,
        augment: bool = True,
    ):
        self.img_dir = Path(root) / "images"      / split
        self.ann_dir = Path(root) / "annotations" / split
        self.files   = sorted(self.img_dir.glob("*.png"))
        self.processor = processor
        self.augment   = augment and split == "train"
        self.img_size  = img_size

        assert len(self.files) > 0, f"No images found in {self.img_dir}"
        logger.info(f"  [{split}] {len(self.files)} samples")

    def __len__(self) -> int:
        return len(self.files)

    def __getitem__(self, idx: int):
        img_path = self.files[idx]
        ann_path = self.ann_dir / img_path.name

        image  = Image.open(img_path).convert("RGB")
        labels = np.array(Image.open(ann_path).convert("L"), dtype=np.int64)

        # Random augmentation
        if self.augment:
            import random
            # Horizontal flip
            if random.random() > 0.5:
                image  = image.transpose(Image.FLIP_LEFT_RIGHT)
                labels = np.fliplr(labels)
            # Vertical flip
            if random.random() > 0.4:
                image  = image.transpose(Image.FLIP_TOP_BOTTOM)
                labels = np.flipud(labels)
            # Rotation
            k = random.randint(0, 3)
            if k:
                image  = image.rotate(k * 90)
                labels = np.rot90(labels, k)

        # Clamp labels to valid range (safety)
        labels = np.clip(np.ascontiguousarray(labels), 0, NUM_CLASSES - 1)

        # SegformerImageProcessor handles resize + normalise
        encoded = self.processor(
            images=image,
            segmentation_maps=Image.fromarray(labels.astype(np.uint8), "L"),
            return_tensors="pt",
        )
        pixel_values = encoded["pixel_values"].squeeze(0)   # (3, H, W)
        label_tensor = encoded["labels"].squeeze(0)         # (H, W)
        return pixel_values, label_tensor


# ─── Metrics ──────────────────────────────────────────────────────────────────

def compute_miou(preds: np.ndarray, labels: np.ndarray, num_classes: int) -> float:
    """Mean Intersection-over-Union, ignoring unlabelled pixels (255)."""
    ious = []
    for cls in range(num_classes):
        pred_c   = preds  == cls
        label_c  = labels == cls
        inter    = (pred_c & label_c).sum()
        union    = (pred_c | label_c).sum()
        if union == 0:
            continue
        ious.append(inter / union)
    return float(np.mean(ious)) if ious else 0.0


# ─── Training Loop ────────────────────────────────────────────────────────────

def train(
    data_root: str,
    model_name: str,
    out_dir: str,
    epochs: int,
    batch_size: int,
    lr: float,
    img_size: int,
    warmup_ratio: float,
    fp16: bool,
    num_workers: int,
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Training on {device}  |  model: {model_name}")

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    # ── Model & Processor ──────────────────────────────────────────────────────
    processor = SegformerImageProcessor.from_pretrained(model_name, reduce_labels=False)

    model = SegformerForSemanticSegmentation.from_pretrained(
        model_name,
        num_labels=NUM_CLASSES,
        id2label=ID2LABEL,
        label2id=LABEL2ID,
        ignore_mismatched_sizes=True,       # replace classification head
    )
    model.to(device)

    # ── Data ───────────────────────────────────────────────────────────────────
    train_ds = TerrainSegDataset(data_root, "train", processor, img_size, augment=True)
    val_ds   = TerrainSegDataset(data_root, "val",   processor, img_size, augment=False)

    train_loader = DataLoader(
        train_ds, batch_size=batch_size, shuffle=True,
        num_workers=num_workers, pin_memory=True, drop_last=True,
    )
    val_loader = DataLoader(
        val_ds, batch_size=max(1, batch_size // 2), shuffle=False,
        num_workers=num_workers, pin_memory=True,
    )

    # ── Optimiser & Scheduler ──────────────────────────────────────────────────
    optimizer = AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    total_steps = len(train_loader) * epochs
    warmup_steps = int(total_steps * warmup_ratio)

    scheduler = get_cosine_schedule_with_warmup(
        optimizer, num_warmup_steps=warmup_steps, num_training_steps=total_steps
    )

    scaler = torch.cuda.amp.GradScaler(enabled=fp16 and device.type == "cuda")

    # ── Training ───────────────────────────────────────────────────────────────
    best_miou = 0.0
    all_metrics = []

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0

        pbar = tqdm(train_loader, desc=f"Epoch {epoch}/{epochs} [train]", leave=False)
        for pixel_values, labels in pbar:
            pixel_values = pixel_values.to(device)
            labels       = labels.to(device)

            optimizer.zero_grad()

            with torch.cuda.amp.autocast(enabled=fp16 and device.type == "cuda"):
                outputs = model(pixel_values=pixel_values, labels=labels)
                loss    = outputs.loss

            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            scaler.step(optimizer)
            scaler.update()
            scheduler.step()

            total_loss += loss.item()
            pbar.set_postfix(loss=f"{loss.item():.4f}")

        avg_loss = total_loss / len(train_loader)

        # ── Validation ─────────────────────────────────────────────────────────
        model.eval()
        all_preds, all_labels = [], []

        with torch.no_grad():
            for pixel_values, labels in tqdm(val_loader, desc=f"Epoch {epoch}/{epochs} [val]", leave=False):
                pixel_values = pixel_values.to(device)
                outputs = model(pixel_values=pixel_values)
                logits  = outputs.logits  # (B, C, H, W)

                # Upsample to label resolution
                upsampled = torch.nn.functional.interpolate(
                    logits, size=labels.shape[-2:], mode="bilinear", align_corners=False
                )
                preds_np  = upsampled.argmax(dim=1).cpu().numpy()
                labels_np = labels.numpy()
                all_preds.append(preds_np)
                all_labels.append(labels_np)

        preds_flat  = np.concatenate([p.flatten() for p in all_preds])
        labels_flat = np.concatenate([l.flatten() for l in all_labels])
        miou        = compute_miou(preds_flat, labels_flat, NUM_CLASSES)

        logger.info(f"Epoch {epoch}/{epochs}  loss={avg_loss:.4f}  val_mIoU={miou*100:.2f}%")
        all_metrics.append({"epoch": epoch, "loss": avg_loss, "val_miou": miou})

        # Save best
        if miou > best_miou:
            best_miou = miou
            model.save_pretrained(out / "best")
            processor.save_pretrained(out / "best")
            logger.info(f"  ✅ New best mIoU={best_miou*100:.2f}% — saved to {out/'best'}")

    # Save final + metrics
    model.save_pretrained(out / "final")
    processor.save_pretrained(out / "final")

    with open(out / "metrics.json", "w") as f:
        json.dump({"best_val_miou": best_miou, "epochs": all_metrics}, f, indent=2)

    logger.info(f"\n🎉 Training complete.  Best val mIoU: {best_miou*100:.2f}%")
    logger.info(f"   Checkpoint: {out/'best'}")
    return str(out / "best")


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Fine-tune SegFormer on DuneNet terrain data")
    ap.add_argument("--data",    default="./terrain_dataset",
                    help="Dataset root (generated by dataset.py)")
    ap.add_argument("--model",   default="nvidia/segformer-b2-finetuned-ade-512-512",
                    help="HuggingFace model name or local path")
    ap.add_argument("--out",     default="./checkpoints/dunenet",
                    help="Output directory for checkpoints")
    ap.add_argument("--epochs",  type=int,   default=30)
    ap.add_argument("--bs",      type=int,   default=8,     help="Batch size")
    ap.add_argument("--lr",      type=float, default=6e-5,  help="Peak learning rate")
    ap.add_argument("--size",    type=int,   default=512,   help="Image size")
    ap.add_argument("--warmup",  type=float, default=0.06,  help="Warmup ratio")
    ap.add_argument("--fp16",    action="store_true",        help="Mixed precision")
    ap.add_argument("--workers", type=int,   default=4,     help="DataLoader workers")
    args = ap.parse_args()

    train(
        data_root   = args.data,
        model_name  = args.model,
        out_dir     = args.out,
        epochs      = args.epochs,
        batch_size  = args.bs,
        lr          = args.lr,
        img_size    = args.size,
        warmup_ratio= args.warmup,
        fp16        = args.fp16,
        num_workers = args.workers,
    )
