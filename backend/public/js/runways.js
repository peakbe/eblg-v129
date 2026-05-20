// ======================================================
// RUNWAYS.JS — Cockpit IFR PRO+++
// - Données pistes EBLG
// - Corridors IFR (approche + départ)
// - Calcul vent (headwind / crosswind)
// - Fournit seuils + corridors pour map.js & sonometers.js
// ======================================================

// ======================================================
// DONNÉES PISTES
// ======================================================
const RUNWAYS = {
    "04": {
        heading: 40,
        threshold: [50.64590, 5.44380],
        end:       [50.66220, 5.47600]
    },
    "22": {
        heading: 220,
        threshold: [50.66220, 5.47600],
        end:       [50.64590, 5.44380]
    }
};

// ======================================================
// EXPORT — SEUILS POUR SONO & DISTANCES
// ======================================================
export function getRunwayThresholds() {
    return {
        "04": {
            lat: RUNWAYS["04"].threshold[0],
            lon: RUNWAYS["04"].threshold[1]
        },
        "22": {
            lat: RUNWAYS["22"].threshold[0],
            lon: RUNWAYS["22"].threshold[1]
        }
    };
}

// ======================================================
// CALCUL COMPOSANTES VENT — PRO+++
// ======================================================
export function computeWindComponents(windDir, windSpeed, runwayHeading) {
    if (windDir == null || windSpeed == null) {
        return { headwind: 0, crosswind: 0 };
    }

    const angle = ((windDir - runwayHeading + 360) % 360);
    const rad = angle * Math.PI / 180;

    const headwind = Math.round(windSpeed * Math.cos(rad));
    const crosswind = Math.round(windSpeed * Math.sin(rad));

    return { headwind, crosswind };
}

// ======================================================
// CORRIDORS IFR — PRO+++
// map.js attend un tableau : [{ runway:"04", coords:[...] }, ...]
// ======================================================
export function getRunwayCorridors() {
    const corridors = [];

    Object.keys(RUNWAYS).forEach(rwy => {
        const r = RUNWAYS[rwy];
        const th = r.threshold;
        const hdg = r.heading;

        const rad = hdg * Math.PI / 180;
        const dx = Math.cos(rad);
        const dy = Math.sin(rad);

        const APP_LEN = 0.045; // ~5 km
        const DEP_LEN = 0.045;
        const HALF_WIDTH = 0.008; // ~900 m

        const appStart = [
            th[0] - dx * APP_LEN,
            th[1] - dy * APP_LEN
        ];

        const depEnd = [
            th[0] + dx * DEP_LEN,
            th[1] + dy * DEP_LEN
        ];

        const ox = -dy * HALF_WIDTH;
        const oy = dx * HALF_WIDTH;

        const approach = [
            [appStart[0] - ox, appStart[1] - oy],
            [th[0] - ox, th[1] - oy],
            [th[0] + ox, th[1] + oy],
            [appStart[0] + ox, appStart[1] + oy]
        ];

        const departure = [
            [th[0] - ox, th[1] - oy],
            [depEnd[0] - ox, depEnd[1] - oy],
            [depEnd[0] + ox, depEnd[1] + oy],
            [th[0] + ox, th[1] + oy]
        ];

        corridors.push({
            runway: rwy,
            coords: [...approach, ...departure]
        });
    });

    return corridors;
}
