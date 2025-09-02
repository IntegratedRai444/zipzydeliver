"""
Generate image URLs for products using Google's Gemini Images (Imagen) API.

What this script does
- Reads an input CSV with columns: id,name,imageUrl
- For each product name, asks Gemini to generate an image (PNG) and returns a data URL
- Writes a new CSV with the imageUrl column filled (or a placeholder on failure)

Usage (from repo root):
  - Ensure you have Python 3.9+ and install dependencies:
      pip install google-generativeai python-dotenv
  - Set your API key in environment:
      On Windows PowerShell:  $env:GEMINI_API_KEY = "<YOUR_KEY>"
      On macOS/Linux:         export GEMINI_API_KEY="<YOUR_KEY>"
  - Run:
      python server/scripts/gemini_generate_images.py --in products.csv --out products_with_images.csv

Notes
- This script returns data URLs (data:image/png;base64,...) as "imageUrl" values so you can store them
  immediately. If you prefer actual hosted URLs, you can modify the script to upload the bytes to your
  storage (e.g. S3/GCS/Imgur) and place that URL instead.
- If the API call fails, a placeholder URL is inserted: https://via.placeholder.com/150
- The script is written defensively with clear logging and error handling.
"""

from __future__ import annotations

import argparse
import base64
import csv
import os
import sys
from typing import Dict, List

PLACEHOLDER_URL = "https://via.placeholder.com/150"


def load_api_key() -> str:
    # Try environment first
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    # Try dotenv if present (optional convenience)
    try:
        from dotenv import load_dotenv  # type: ignore
        load_dotenv()
        key = os.environ.get("GEMINI_API_KEY")
        if key:
            return key
    except Exception:
        pass
    raise RuntimeError(
        "GEMINI_API_KEY is not set. Export it in your environment before running this script."
    )


def read_products_csv(path: str) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        required = {"id", "name", "imageUrl"}
        if not required.issubset(set(reader.fieldnames or [])):
            raise ValueError(
                f"Input CSV must contain columns: id,name,imageUrl. Found: {reader.fieldnames}"
            )
        for row in reader:
            rows.append({"id": row.get("id", ""), "name": row.get("name", ""), "imageUrl": row.get("imageUrl", "")})
    return rows


def write_products_csv(path: str, rows: List[Dict[str, str]]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "name", "imageUrl"])
        writer.writeheader()
        for r in rows:
            writer.writerow(r)


def setup_gemini(api_key: str):
    import google.generativeai as genai  # type: ignore

    genai.configure(api_key=api_key)
    # Imagen-series model available via Gemini Images
    # If your account does not have access to image generation, this call will fail
    # and we will fall back to placeholder URLs.
    model = genai.GenerativeModel("imagen-3.0")
    return model


def prompt_for(name: str) -> str:
    # You can tune the art direction here.
    return (
        f"High quality product photo of {name}, studio lighting, plain neutral background, "
        f"centered composition, soft shadows, 1:1 aspect, photorealistic."
    )


def generate_image_data_url(model, prompt: str, size: str = "512x512") -> str:
    """Return a data URL string for a generated PNG image.

    If generation fails, raises an exception for the caller to handle.
    """
    # google-generativeai image generation API (Imagen) typically:
    #   model.generate_image(prompt=..., size="512x512") -> response.images[0].data (bytes)
    try:
        response = model.generate_image(prompt=prompt, size=size)
        if not response or not getattr(response, "images", None):
            raise RuntimeError("Empty image response from Gemini")
        img = response.images[0]
        # Some SDK versions return raw bytes as .data, others may return base64 already
        data_bytes = getattr(img, "data", None)
        if isinstance(data_bytes, bytes):
            b64 = base64.b64encode(data_bytes).decode("ascii")
        elif isinstance(data_bytes, str):
            # likely already base64
            b64 = data_bytes
        else:
            raise RuntimeError("Unexpected image payload shape")
        return f"data:image/png;base64,{b64}"
    except Exception as e:
        raise RuntimeError(f"Gemini image generation failed: {e}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate product images with Gemini and fill CSV.")
    parser.add_argument("--in", dest="in_csv", required=True, help="Input CSV path (id,name,imageUrl)")
    parser.add_argument("--out", dest="out_csv", required=True, help="Output CSV path")
    parser.add_argument("--size", default="512x512", help="Image size, e.g., 512x512, 768x768")
    args = parser.parse_args()

    try:
        api_key = load_api_key()
    except Exception as e:
        print(e)
        return 1

    try:
        rows = read_products_csv(args.in_csv)
    except Exception as e:
        print(f"Failed to read input CSV: {e}")
        return 1

    # Try to initialize Gemini. If it fails, we will skip generation and use placeholder.
    model = None
    try:
        model = setup_gemini(api_key)
    except Exception as e:
        print(f"[warn] Could not initialize Gemini image model: {e}")
        print("[warn] Will use placeholder URLs for all rows.")

    out_rows: List[Dict[str, str]] = []
    for i, r in enumerate(rows, start=1):
        name = (r.get("name") or "").strip()
        pid = r.get("id") or ""
        print(f"[{i}/{len(rows)}] {name} …", end=" ")

        if not name:
            r["imageUrl"] = PLACEHOLDER_URL
            out_rows.append(r)
            print("skip")
            continue

        # Skip rows that already have an imageUrl
        if r.get("imageUrl"):
            out_rows.append(r)
            print("existing")
            continue

        if model is None:
            r["imageUrl"] = PLACEHOLDER_URL
            out_rows.append(r)
            print("placeholder")
            continue

        try:
            data_url = generate_image_data_url(model, prompt_for(name), size=args.size)
            r["imageUrl"] = data_url
            out_rows.append(r)
            print("ok")
        except Exception as e:
            r["imageUrl"] = PLACEHOLDER_URL
            out_rows.append(r)
            print(f"fail ({e}) -> placeholder")

    try:
        write_products_csv(args.out_csv, out_rows)
    except Exception as e:
        print(f"Failed to write output CSV: {e}")
        return 1

    print(f"\nDone. Wrote: {args.out_csv}")
    return 0


if __name__ == "__main__":
    sys.exit(main())


