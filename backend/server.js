import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// SERVE STATIC FRONTEND
// =========================
app.use(express.static("."));          // sert index.html + assets + css + js
app.use(express.static("assets"));     // sécurité
app.use(express.static("css"));
app.use(express.static("js"));

// =========================
// CORS PRO+
// =========================
app.use(cors({
    origin: "*",
    methods: ["GET"],
    allowedHeaders: ["Content-Type"]
}));

// =========================
// CACHE PRO+ (60 sec)
// =========================
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
// FIDS DYNAMIC GENERATOR
// =========================
function generateDynamicFids() {
    const now = new Date();
    const baseHour = now.getHours();
    const pad = n => String(n).padStart(2, "0");

    const flights = [
        { flight: "QY123", destination: "LEJ" },
        { flight: "X7182", destination: "TLV" },
        { flight: "QR8962", destination: "DOH" },
        { flight: "ET3721", destination: "ADD" },
        { flight: "TK6543", destination: "IST" },
        { flight: "3V450", destination: "CGN" },
        { flight: "RU927", destination: "SVO" },
        { flight: "K4972", destination: "CVG" }
    ];

    const statuses = ["Departed", "Boarding", "Loading", "Scheduled", "Delayed"];

    return flights.map((f, i) => {
        const hour = (baseHour + i) % 24;
        const minute = (10 + i * 7) % 60;

        return {
            flight: f.flight,
            destination: f.destination,
            time: `${pad(hour)}:${pad(minute)}`,
            status: statuses[i % statuses.length],
            fallback: true,
            timestamp: now.toISOString()
        };
    });
}

// =========================
// METAR
// =========================
app.get("/metar", async (req, res) => {
    const cached = getCache("metar");
    if (cached) {
        cached.fallback = false;
        return res.json(cached);
    }

    const data = await safeFetch(
        `https://api.checkwx.com/metar/EBLG/decoded?x-api-key=${process.env.CHECKWX_KEY}`
    );

    if (data.fallback) {
        const fb = {
            fallback: true,
            data: [{
                raw_text: "METAR unavailable",
                wind: { degrees: 0, speed_kts: 0 }
            }],
            timestamp: new Date().toISOString()
        };
        setCache("metar", fb);
        return res.json(fb);
    }

    data.fallback = false;
    setCache("metar", data);
    res.json(data);
});

// =========================
// TAF
// =========================
app.get("/taf", async (req, res) => {
    const cached = getCache("taf");
    if (cached) {
        cached.fallback = false;
        return res.json(cached);
    }

    const data = await safeFetch(
        `https://api.checkwx.com/taf/EBLG/decoded?x-api-key=${process.env.CHECKWX_KEY}`
    );

    if (data.fallback) {
        const fb = {
            fallback: true,
            data: [{
                raw_text: "TAF unavailable"
            }],
            timestamp: new Date().toISOString()
        };
        setCache("taf", fb);
        return res.json(fb);
    }

    data.fallback = false;
    setCache("taf", data);
    res.json(data);
});

// =========================
// FIDS (AviationStack + Dynamic Fallback)
// =========================
app.get("/fids", async (req, res) => {
    const cached = getCache("fids");
    if (cached) return res.json(cached);

    const url = `http://api.aviationstack.com/v1/flights?dep_iata=LGG&access_key=${process.env.AVIATIONSTACK_KEY}`;
    const data = await safeFetch(url);

    if (data.fallback || !data.data) {
        const fb = generateDynamicFids();
        setCache("fids", fb);
        return res.json(fb);
    }

    if (data.data.length === 0) {
        const fb = generateDynamicFids();
        setCache("fids", fb);
        return res.json(fb);
    }

    const flights = data.data.slice(0, 10).map(f => ({
        flight: f.flight?.iata || "N/A",
        destination: f.arrival?.iata || "N/A",
        time: f.departure?.scheduled || "N/A",
        status: f.flight_status || "N/A",
        fallback: false
    }));

    setCache("fids", flights);
    res.json(flights);
});

// =========================
// SONOMETERS
// =========================
import { SONOMETERS } from "./sonometers-data.js";

app.get("/sonos", (req, res) => {
    res.json(SONOMETERS);
});



// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
    console.log("[PROXY] Running on port", PORT);
});
