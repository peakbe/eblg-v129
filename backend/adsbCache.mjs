// ======================================================
// ADS-B CACHE PRO+++
// - Cache 10 secondes
// - Fallback si AirLabs tombe
// - Protection anti-burst
// ======================================================

let adsbCache = null;
let adsbCacheTime = 0;

export function getCachedAdsb() {
    const now = Date.now();
    if (adsbCache && now - adsbCacheTime < 10_000) {
        return adsbCache;
    }
    return null;
}

export function setCachedAdsb(data) {
    adsbCache = data;
    adsbCacheTime = Date.now();
}

