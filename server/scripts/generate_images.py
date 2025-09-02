"""
Utility: Generate suggested image URLs for all products without writing to the DB.

How it works
- Fetches all products from the running backend: GET http://localhost:5000/api/products
- For each product name, queries DuckDuckGo Images to get the first result
- Writes results to generated_images.csv and generated_images.json in this folder

Run (from repo root, server running):
  py server/scripts/generate_images.py

Notes
- This does not modify the database. Review the generated CSV/JSON first.
- If DuckDuckGo blocks or rate limits, the script falls back to a deterministic
  placeholder from Picsum (seeded by product name).
"""

from __future__ import annotations

import csv
import json
import time
import sys
from typing import Dict, List, Any

import requests

BACKEND_URL = "http://localhost:5000"
PRODUCTS_API = f"{BACKEND_URL}/api/products"


def fetch_products() -> List[Dict[str, Any]]:
    try:
        res = requests.get(PRODUCTS_API, timeout=20)
        res.raise_for_status()
        data = res.json()
        products = data.get("products") or []
        if not isinstance(products, list):
            raise RuntimeError("Unexpected products payload")
        return products
    except Exception as e:
        print(f"Failed to fetch products from {PRODUCTS_API}: {e}")
        return []


def duckduckgo_image(product_name: str) -> str | None:
    """Return the first image URL from DuckDuckGo Images for a query.

    This uses the unofficial endpoint similar to the snippet the user shared.
    It may break if DDG changes their markup or anti-bot measures.
    """
    try:
        # Step 1: obtain the token
        init = requests.post(
            "https://duckduckgo.com/",
            data={"q": product_name},
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        init.raise_for_status()
        text = init.text
        marker = "vqd='"
        if marker not in text:
            # Try alt marker that sometimes appears
            marker = 'vqd="'
        token = text.split(marker, 1)[1].split("'" if marker.endswith("'") else '"', 1)[0]

        # Step 2: image API call
        res = requests.get(
            "https://duckduckgo.com/i.js",
            params={"q": product_name, "vqd": token, "o": "json"},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=20,
        )
        res.raise_for_status()
        data = res.json()
        results = data.get("results") or []
        if results:
            return results[0].get("image")
    except Exception as e:
        print(f"[warn] DDG fetch failed for '{product_name}': {e}")
    return None


def picsum_fallback(product_name: str) -> str:
    return f"https://picsum.photos/seed/{requests.utils.quote(product_name.lower())}/800/600"


def generate_for_products(products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for i, p in enumerate(products, start=1):
        name = (p.get("name") or "").strip()
        pid = p.get("id") or p.get("_id") or ""
        if not name:
            continue
        print(f"[{i}/{len(products)}] {name} …", end=" ")
        url = duckduckgo_image(name)
        if not url:
            url = picsum_fallback(name)
            print("fallback")
        else:
            print("ok")
        out.append({"id": pid, "name": name, "imageUrl": url})

        # Small delay to be polite and avoid rate limits
        time.sleep(0.6)
    return out


def write_outputs(rows: List[Dict[str, Any]], base: str = "generated_images") -> None:
    csv_path = f"{base}.csv"
    json_path = f"{base}.json"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["id", "name", "imageUrl"])
        w.writeheader()
        for r in rows:
            w.writerow(r)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {len(rows)} records to:\n  - {csv_path}\n  - {json_path}")


def main() -> int:
    products = fetch_products()
    if not products:
        print("No products to process. Make sure the backend is running on http://localhost:5000")
        return 1
    results = generate_for_products(products)
    write_outputs(results)
    print("\nReview the CSV/JSON. When ready, I can apply these to the database.")
    return 0


if __name__ == "__main__":
    sys.exit(main())


