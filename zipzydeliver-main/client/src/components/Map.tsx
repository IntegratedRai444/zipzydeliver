import { useEffect, useRef } from 'react';

type Props = {
  lat: number;
  lng: number;
  height?: string;
  apiKey: string; // static tiles provider key (OpenStreetMap-like provider, here kept generic)
};

// Lightweight map using Leaflet via CDN to avoid heavy setup; no Google Maps dependency
// This keeps it cross-platform and key-agnostic. If you want Google Maps SDK later, we can swap.
export default function Map({ lat, lng, height = '260px', apiKey }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    // load Leaflet from CDN once
    const Lurl = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    const CssUrl = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

    const ensure = async () => {
      if (!document.querySelector('link[data-leaflet]')) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = CssUrl;
        css.setAttribute('data-leaflet', '1');
        document.head.appendChild(css);
      }
      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const s = document.createElement('script');
          s.src = Lurl;
          s.onload = () => resolve();
          document.body.appendChild(s);
        });
      }
      const L = (window as any).L;
      if (!L) return;
      const map = L.map(mapRef.current!).setView([lat, lng], 15);
      L.tileLayer(`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup('Delivery Partner');
      return () => map.remove();
    };

    let cleanup: any;
    ensure().then((c) => (cleanup = c));
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [lat, lng, apiKey]);

  return <div ref={mapRef} style={{ width: '100%', height }} />;
}


