const cache = {
    metar: { ts: 0, data: null },
    taf: { ts: 0, data: null },
    fids: { ts: 0, data: null }
};

function getCache(key, ttl = 60000) {
    const now = Date.now();
    if (cache[key].data && (now - cache[key].ts < ttl)) {
        console.log("[CACHE HIT]", key);
        return cache[key].data;
    }
    return null;
}

function setCache(key, data) {
    cache[key].ts = Date.now();
    cache[key].data = data;
}

import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// CORS PRO+
// =========================
app.use(cors({
    origin: "*",
    methods: ["GET"],
    allowedHeaders: ["Content-Type"]
}));

// =========================
// FETCH PRO+
// =========================
async function safeFetch(url) {
    try {
        console.log("[FETCH] →", url);

        const res = await fetch(url);
        console.log("[FETCH] STATUS:", res.status);

        const text = await res.text();

        if (!res.ok) {
            console.error("[FETCH ERROR]", text);
            return { fallback: true, status: res.status, body: text };
        }

        try {
            return JSON.parse(text);
        } catch (err) {
            console.error("[FETCH PARSE ERROR]", err);
            return { fallback: true, error: "Invalid JSON", raw: text };
        }

    } catch (err) {
        console.error("[FETCH EXCEPTION]", err);
        return { fallback: true, error: err.message };
    }
}

// =========================
// METAR
// =========================
app.get("/metar", async (req, res) => {
    const data = await safeFetch(
        `https://api.checkwx.com/metar/EBLG/decoded?x-api-key=${process.env.CHECKWX_KEY}`
    );

    if (data.fallback) {
        return res.json({
            fallback: true,
            data: [{
                raw_text: "METAR unavailable",
                wind: { degrees: 0, speed_kts: 0 }
            }],
            timestamp: new Date().toISOString()
        });
    }

    res.json(data);
});

// =========================
// TAF (corrigé)
// =========================
app.get("/taf", async (req, res) => {
    const data = await safeFetch(
        `https://api.checkwx.com/taf/EBLG/decoded?x-api-key=${process.env.CHECKWX_KEY}`
    );

    if (data.fallback) {
        return res.json({
            fallback: true,
            data: [{
                raw_text: "TAF unavailable"
            }],
            timestamp: new Date().toISOString()
        });
    }

    res.json(data);
});

// =========================
// FIDS — AviationStack PRO+
// =========================
app.get("/fids", async (req, res) => {
    const cached = getCache("fids");
    if (cached) return res.json(cached);

    const url = `http://api.aviationstack.com/v1/flights?dep_iata=LGG&limit=10&access_key=${process.env.AVIATIONSTACK_KEY}`;
    const data = await safeFetch(url);

    // Si l’API ne répond pas ou renvoie une erreur
    if (data.fallback || !data.data) {
        const fallback = [{
            flight: "N/A",
            destination: "N/A",
            time: "N/A",
            status: "Unavailable",
            fallback: true,
            timestamp: new Date().toISOString()
        }];
        setCache("fids", fallback);
        return res.json(fallback);
    }

    // Transformation des données AviationStack → format dashboard
    const flights = data.data.map(f => ({
        flight: f.flight?.iata || f.flight?.number || "N/A",
        destination: f.arrival?.iata || "N/A",
        time: f.departure?.scheduled || "N/A",
        status: f.flight_status || "N/A",
        fallback: false
    }));

    setCache("fids", flights);
    res.json(flights);
});


// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
    console.log("[PROXY] Running on port", PORT);
});
