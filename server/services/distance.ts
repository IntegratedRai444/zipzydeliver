/**
 * Distance calculation utilities for partner matching
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate haversine distance between two coordinates in kilometers
 */
export function haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Find partners within a specified radius (in km)
 */
export function findPartnersInRadius(
  center: Coordinates,
  partners: Array<{ id: string; currentLocation: Coordinates | null; isStudent: boolean }>,
  radiusKm: number
): Array<{ id: string; distance: number; isStudent: boolean }> {
  return partners
    .filter(partner => partner.currentLocation !== null)
    .map(partner => ({
      id: partner.id,
      distance: haversineDistance(center, partner.currentLocation!),
      isStudent: partner.isStudent
    }))
    .filter(partner => partner.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Expand search radius with fallback logic
 */
export function expandSearchRadius(
  center: Coordinates,
  partners: Array<{ id: string; currentLocation: Coordinates | null; isStudent: boolean }>,
  initialRadiusKm: number = 5,
  maxRadiusKm: number = 20
): Array<{ id: string; distance: number; isStudent: boolean; searchRadius: number }> {
  let currentRadius = initialRadiusKm;
  const results: Array<{ id: string; distance: number; isStudent: boolean; searchRadius: number }> = [];
  
  while (currentRadius <= maxRadiusKm && results.length < 10) {
    const inRadius = findPartnersInRadius(center, partners, currentRadius);
    
    for (const partner of inRadius) {
      if (!results.find(r => r.id === partner.id)) {
        results.push({ ...partner, searchRadius: currentRadius });
      }
    }
    
    currentRadius += 2; // Expand by 2km each iteration
  }
  
  return results;
}
