// Auto-suggest sales tax rate based on browser geolocation
// Uses free API — falls back gracefully if unavailable

interface TaxRateResult {
  rate: number; // e.g. 8.875 for 8.875%
  jurisdiction: string; // e.g. "New York, NY"
}

export async function suggestTaxRate(): Promise<TaxRateResult | null> {
  try {
    // Get user's approximate location
    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation not available"));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false,
        });
      }
    );

    const { latitude, longitude } = position.coords;

    // Reverse geocode to get state/city (free OpenStreetMap API)
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`,
      { headers: { "User-Agent": "Partake-App" } }
    );
    const geoData = await geoRes.json();

    const state = geoData.address?.state;
    const city = geoData.address?.city || geoData.address?.town || geoData.address?.village;

    if (!state) return null;

    // Look up state tax rate from our simplified table
    const rate = STATE_TAX_RATES[state];
    if (rate === undefined) return null;

    return {
      rate,
      jurisdiction: city ? `${city}, ${state}` : state,
    };
  } catch {
    // Geolocation denied or failed — no big deal
    return null;
  }
}

// Simplified state + average local tax rates (combined state + avg local)
// Source: Tax Foundation 2025 averages
// Users can always override — this is just a suggestion
const STATE_TAX_RATES: Record<string, number> = {
  "Alabama": 9.24,
  "Alaska": 1.76,
  "Arizona": 8.40,
  "Arkansas": 9.44,
  "California": 8.68,
  "Colorado": 7.77,
  "Connecticut": 6.35,
  "Delaware": 0,
  "Florida": 7.02,
  "Georgia": 7.37,
  "Hawaii": 4.44,
  "Idaho": 6.02,
  "Illinois": 8.82,
  "Indiana": 7.00,
  "Iowa": 6.94,
  "Kansas": 8.71,
  "Kentucky": 6.00,
  "Louisiana": 9.55,
  "Maine": 5.50,
  "Maryland": 6.00,
  "Massachusetts": 6.25,
  "Michigan": 6.00,
  "Minnesota": 7.49,
  "Mississippi": 7.07,
  "Missouri": 8.30,
  "Montana": 0,
  "Nebraska": 6.94,
  "Nevada": 8.23,
  "New Hampshire": 0,
  "New Jersey": 6.63,
  "New Mexico": 7.72,
  "New York": 8.52,
  "North Carolina": 6.98,
  "North Dakota": 6.96,
  "Ohio": 7.24,
  "Oklahoma": 8.98,
  "Oregon": 0,
  "Pennsylvania": 6.34,
  "Rhode Island": 7.00,
  "South Carolina": 7.43,
  "South Dakota": 6.40,
  "Tennessee": 9.55,
  "Texas": 8.20,
  "Utah": 7.19,
  "Vermont": 6.24,
  "Virginia": 5.75,
  "Washington": 9.29,
  "West Virginia": 6.55,
  "Wisconsin": 5.43,
  "Wyoming": 5.36,
  "District of Columbia": 6.00,
};
