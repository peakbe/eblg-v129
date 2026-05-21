// ======================================================
// EBLG DASHBOARD — BACKEND PRO++
// server.mjs
// ======================================================

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import {
    getCachedMetar,
    setCachedMetar,
    getCachedTaf,
    setCachedTaf
} from "./metarCache.mjs";

import {
    getCachedAdsb,
    setCachedAdsb
} from "./adsbCache.mjs";

// ======================================================
// ADS-B — CONSTANTES EBLG
// ======================================================
const EBLG = { lat: 50.637, lon: 5.443 };

const RWY = {
    "04": { lat: 50.64594, lon: 5.44321, heading: 40 },
    "22": { lat: 50.63302, lon: 5.46163, heading: 220 }
};

// ======================================================
// ADS-B — OUTILS GÉOMÉTRIQUES PRO+++
// ======================================================
function distKm(lat1, lon1, lat2, lon2) { ... }

function bearingTo(lat1, lon1, lat2, lon2) { ... }

function angleDiff(a, b) { ... }

// ======================================================
// ADS-B — FILTRE GÉOGRAPHIQUE PRO+++
// ======================================================
function filterGeographic(acList, radiusKm = 80) { ... }

// ======================================================
// ADS-B — DÉTECTION APPROCHE RWY 04/22 PRO+++
// ======================================================
function detectApproach(ac) { ... }

// 1) Coordonnées EBLG
const EBLG = { lat: 50.637, lon: 5.443 };

// 2) Fonction distance Haversine
function distKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 3) Filtre géographique PRO+++
function filterGeographic(acList, radiusKm = 80) {
    return acList.filter(ac => {
        const d = distKm(EBLG.lat, EBLG.lon, ac.lat, ac.lon);
        return d <= radiusKm;
    });
}


// 4) Endpoint ADS-B PRO+++
app.get("/api/adsb", async (req, res) => {
    const cached = getCachedAdsb();
    if (cached) return res.json(cached);

    try {
        const url = `https://airlabs.co/api/v9/flights?api_key=${process.env.AIRLABS_KEY}`;
        const r = await fetch(url);

        if (!r.ok) {
            console.error("[ADSB] AirLabs HTTP", r.status);
            if (cached) return res.json(cached);
            return res.status(502).json({ error: "Airlabs upstream error" });
        }

        const json = await r.json();
        const flights = json.response || [];

        let ac = flights
            .map(f => {
                if (!f.lat || !f.lng) return null;

                return {
                    icao: f.hex || null,
                    hex: f.hex || null,
                    call: f.flight_icao || f.flight_iata || "",
                    lat: f.lat,
                    lon: f.lng,
                    alt_baro: f.alt || null,
                    gs: f.speed || null,
                    track: f.dir || null,
                    type: f.aircraft_icao || null
                };
            })
            .filter(Boolean);

        // 🔥 FILTRE GÉOGRAPHIQUE PRO+++
        ac = filterGeographic(ac, 80);

        const payload = { ac };

        setCachedAdsb(payload);
        return res.json(payload);

    } catch (e) {
        console.error("[ADSB] AirLabs fetch failed", e);
        const cached = getCachedAdsb();
        if (cached) return res.json(cached);
        res.status(500).json({ error: "ADSB fetch failed" });
    }
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------
// MIDDLEWARES
// ------------------------------------------------------
app.use(cors());

const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// ======================================================
// METAR — EBLG
// ======================================================
app.get("/metar", async (req, res) => {
    const cached = getCachedMetar();
    if (cached) return res.json(cached);

    try {
        const url = "https://api.checkwx.com/metar/EBLG/decoded";
        const r = await fetch(url, {
            headers: { "X-API-Key": process.env.CHECKWX_KEY }
        });

        if (!r.ok) {
            console.error("[METAR] HTTP", r.status);
            if (cached) return res.json(cached);
            return res.json({ fallback: true, raw: "METAR indisponible" });
        }

        const json = await r.json();
        setCachedMetar(json);
        return res.json(json);

    } catch (err) {
        console.error("[METAR] Erreur", err);
        const cached = getCachedMetar();
        if (cached) return res.json(cached);
        return res.json({ fallback: true, raw: "METAR indisponible" });
    }
});

// ======================================================
// TAF — EBLG
// ======================================================
app.get("/taf", async (req, res) => {
    const cached = getCachedTaf();
    if (cached) return res.json(cached);

    try {
        const url = "https://api.checkwx.com/taf/EBLG/decoded";
        const r = await fetch(url, {
            headers: { "X-API-Key": process.env.CHECKWX_KEY }
        });

        if (!r.ok) {
            console.error("[TAF] HTTP", r.status);
            if (cached) return res.json(cached);
            return res.json({ fallback: true, raw: "TAF indisponible" });
        }

        const json = await r.json();
        setCachedTaf(json);
        return res.json(json);

    } catch (err) {
        console.error("[TAF] Erreur", err);
        const cached = getCachedTaf();
        if (cached) return res.json(cached);
        return res.json({ fallback: true, raw: "TAF indisponible" });
    }
});

// ======================================================
// FIDS — MODE AUTONOME PRO++
// (à remplacer plus tard par une vraie source si tu veux)
// ======================================================
app.get("/fids", (req, res) => {
    const now = new Date();
    const iso = now.toISOString();

    const payload = {
        arrivals: [
            {
                flight: "FX123",
                from: "CDG",
                eta: iso,
                status: "ON TIME"
            },
            {
                flight: "FX456",
                from: "LEJ",
                eta: iso,
                status: "LANDED"
            }
        ],
        departures: [
            {
                flight: "FX789",
                to: "CGN",
                etd: iso,
                status: "BOARDING"
            },
            {
                flight: "FX999",
                to: "CDG",
                etd: iso,
                status: "DELAYED"
            }
        ]
    };

    res.json(payload);
});

// ======================================================
// SONOMETERS — MODE AUTONOME PRO++
// ======================================================
app.get("/sonos", (req, res) => {
    const payload = {
        sensors: [
            { id: 1, name: "NORD",  lat: 50.646, lon: 5.445, db: 42 },
            { id: 2, name: "SUD",   lat: 50.635, lon: 5.460, db: 48 },
            { id: 3, name: "EST",   lat: 50.640, lon: 5.470, db: 51 },
            { id: 4, name: "OUEST", lat: 50.642, lon: 5.430, db: 39 }
        ]
    };

    res.json(payload);
});

// ======================================================
// ADS-B — AIRLABS PRO++ (cache + normalisation)
// ======================================================
let adsbCache = null;
let adsbCacheTime = 0;

app.get("/api/adsb", async (req, res) => {
    const cached = getCachedAdsb();
    if (cached) return res.json(cached);

    try {
        const url = `https://airlabs.co/api/v9/flights?api_key=${process.env.AIRLABS_KEY}`;
        const r = await fetch(url);

        if (!r.ok) {
            console.error("[ADSB] AirLabs HTTP", r.status);
            if (cached) return res.json(cached);
            return res.status(502).json({ error: "Airlabs upstream error" });
        }

        const json = await r.json();
        const flights = json.response || [];

        const ac = flights
            .map(f => {
                if (!f.lat || !f.lng) return null;

                return {
                    icao: f.hex || null,
                    hex: f.hex || null,
                    call: f.flight_icao || f.flight_iata || "",
                    lat: f.lat,
                    lon: f.lng,
                    alt_baro: f.alt || null,
                    gs: f.speed || null,
                    track: f.dir || null,
                    type: f.aircraft_icao || null
                };
            })
            .filter(Boolean);
return {
    icao: f.hex || null,
    hex: f.hex || null,
    call: f.flight_icao || f.flight_iata || "",
    lat: f.lat,
    lon: f.lng,
    alt_baro: f.alt || null,
    gs: f.speed || null,
    track: f.dir || null,
    type: f.aircraft_icao || null,
    approach: detectApproach({
        lat: f.lat,
        lon: f.lng,
        alt: f.alt,
        gs: f.speed,
        track: f.dir
    })
};

        const payload = { ac };

        setCachedAdsb(payload);
        return res.json(payload);

    } catch (e) {
        console.error("[ADSB] AirLabs fetch failed", e);
        const cached = getCachedAdsb();
        if (cached) return res.json(cached);
        res.status(500).json({ error: "ADSB fetch failed" });
    }
});

// ======================================================
// FALLBACK SPA — TOUJOURS EN DERNIER
// ======================================================
app.get("*", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
});

// ======================================================
// START
// ======================================================
app.listen(PORT, () => {
    console.log(`[SERVER] Listening on port ${PORT}`);
    console.log("CHECKWX_KEY =", process.env.CHECKWX_KEY);

});
