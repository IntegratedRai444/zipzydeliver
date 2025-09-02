"""
Generate product images using Gemini directly from the backend product list.

Flow
- Fetch products from GET http://localhost:5000/api/products
- For each product name, generate an image with Gemini Images (Imagen) using GEMINI_API_KEY
- Write products_with_images.csv (id,name,imageUrl), imageUrl as data URL or placeholder on failure

Usage
  pip install google-generativeai python-dotenv requests
  # Windows PowerShell
  $env:GEMINI_API_KEY="<YOUR_KEY>"; python server\scripts\gemini_generate_from_backend.py

  # macOS/Linux
  export GEMINI_API_KEY="<YOUR_KEY>" && python3 server/scripts/gemini_generate_from_backend.py
"""

from __future__ import annotations

import base64
import csv
import os
import sys
from typing import Any, Dict, List

import requests

PLACEHOLDER_URL = "https://via.placeholder.com/150"
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5000")
PRODUCTS_API = f"{BACKEND_URL}/api/products"


def load_api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    try:
        from dotenv import load_dotenv  # type: ignore
        load_dotenv()
        key = os.environ.get("GEMINI_API_KEY")
        if key:
            return key
    except Exception:
        pass
    raise RuntimeError("GEMINI_API_KEY is not set in environment.")


def fetch_products() -> List[Dict[str, Any]]:
    res = requests.get(PRODUCTS_API, timeout=20)
    res.raise_for_status()
    data = res.json()
    products = data.get("products") or []
    if not isinstance(products, list):
        raise RuntimeError("Unexpected products payload shape")
    return products


def setup_gemini(api_key: str):
    import google.generativeai as genai  # type: ignore

    genai.configure(api_key=api_key)
    return genai.GenerativeModel("imagen-3.0")


def prompt_for(name: str) -> str:
    return (
        f"High quality studio product photo of {name}, plain neutral background, soft shadows, centered, photorealistic, 1:1."
    )


def generate_image_data_url(model, prompt: str, size: str = "512x512") -> str:
    response = model.generate_image(prompt=prompt, size=size)
    if not response or not getattr(response, "images", None):
        raise RuntimeError("Empty image response")
    img = response.images[0]
    data_bytes = getattr(img, "data", None)
    if isinstance(data_bytes, bytes):
        b64 = base64.b64encode(data_bytes).decode("ascii")
    elif isinstance(data_bytes, str):
        b64 = data_bytes
    else:
        raise RuntimeError("Unexpected image payload type")
    return f"data:image/png;base64,{b64}"


def main() -> int:
    try:
        api_key = load_api_key()
    except Exception as e:
        print(e)
        return 1

    # Try to init model; if fails, we fallback to placeholder for all
    model = None
    try:
        model = setup_gemini(api_key)
    except Exception as e:
        print(f"[warn] Gemini init failed: {e}")

    try:
        products = fetch_products()
    except Exception as e:
        print(f"Failed to fetch products: {e}")
        return 1

    out_rows: List[Dict[str, str]] = []
    total = len(products)
    for idx, p in enumerate(products, start=1):
        pid = str(p.get("id") or p.get("_id") or "")
        name = (p.get("name") or "").strip()
        print(f"[{idx}/{total}] {name} …", end=" ")
        image_url = PLACEHOLDER_URL

        if name and model:
            try:
                image_url = generate_image_data_url(model, prompt_for(name), size="512x512")
                print("ok")
            except Exception as e:
                image_url = PLACEHOLDER_URL
                print(f"fail -> placeholder ({e})")
        else:
            print("placeholder")

        out_rows.append({"id": pid, "name": name, "imageUrl": image_url})

    out_path = "products_with_images.csv"
    try:
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["id", "name", "imageUrl"])
            w.writeheader()
            for r in out_rows:
                w.writerow(r)
    except Exception as e:
        print(f"Failed to write {out_path}: {e}")
        return 1

    print(f"\nDone. Wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())


