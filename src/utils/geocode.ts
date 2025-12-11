/**
 * Geocoding utility using Nominatim (OpenStreetMap)
 * Free service, no API key required
 * Rate limit: 1 request per second
 */

interface GeocodeResult {
  lat: number;
  lng: number;
}

/**
 * Geocodes an address using Nominatim (OpenStreetMap)
 *
 * @param address - Street address
 * @param city - City name
 * @param state - State abbreviation
 * @param zipCode - ZIP code
 * @returns Coordinates or null if geocoding fails
 */
export async function geocodeAddress(
  address?: string,
  city?: string,
  state?: string,
  zipCode?: string
): Promise<GeocodeResult | null> {
  try {
    // Build query string from address components
    const parts = [address, city, state, zipCode].filter(Boolean);
    const query = parts.join(', ');

    if (!query.trim()) {
      console.warn('[Geocode] Empty address, skipping geocoding');
      return null;
    }

    // Nominatim API endpoint
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'us'); // Restrict to US for accuracy

    console.log(`[Geocode] Fetching coordinates for: ${query}`);

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'HIVConnectCNJ/1.0 (hivconnectcnj.org)', // Required by Nominatim
      },
    });

    if (!response.ok) {
      console.error(`[Geocode] HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const results = await response.json() as Array<{ lat: string; lon: string }>;

    if (!results || results.length === 0) {
      console.warn(`[Geocode] No results found for: ${query}`);
      return null;
    }

    const { lat, lon } = results[0];
    const coordinates = {
      lat: parseFloat(lat),
      lng: parseFloat(lon),
    };

    console.log(`[Geocode] Success: ${coordinates.lat}, ${coordinates.lng}`);
    return coordinates;
  } catch (error) {
    console.error('[Geocode] Error:', error);
    return null;
  }
}

/**
 * Sleep utility for rate limiting
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
