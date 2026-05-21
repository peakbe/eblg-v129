// ======================================================
// FIDS.JS — Cockpit IFR EBLG PRO+++
// - Chargement sécurisé FIDS
// - Tri automatique par heure
// - Couleurs ATC
// - ETA / ETD
// - Séparation Arrivals / Departures
// ======================================================

import { ENDPOINTS } from "./config.js";
import { fetchJSON, updateStatusPanel } from "./helpers.js";

// ------------------------------------------------------
// API PUBLIC — appelée par app.js
// ------------------------------------------------------
export async function safeLoadFids() {
    try {
        const data = await fetchJSON(ENDPOINTS.fids);

        if (!data || !Array.isArray(data.flights)) {
            console.error("[FIDS] Données invalides", data);
            updateStatusPanel("FIDS", { error: true });
            return;
        }

        renderFids(data.flights);
        updateStatusPanel("FIDS", { ok: true });

    } catch (err) {
        console.error("[FIDS] Erreur safeLoadFids", err);
        updateStatusPanel("FIDS", { error: true });
    }
}

// ------------------------------------------------------
// RENDU PRINCIPAL
// ------------------------------------------------------
function renderFids(list) {
    const arrEl = document.getElementById("fids-arrivals");
    const depEl = document.getElementById("fids-departures");

    if (!arrEl || !depEl) return;

    const arrivals = list.filter(f => f.type === "arrival");
    const departures = list.filter(f => f.type === "departure");

    sortByTime(arrivals);
    sortByTime(departures);

    arrEl.innerHTML = renderSection("Arrivées", arrivals);
    depEl.innerHTML = renderSection("Départs", departures);
}

// ------------------------------------------------------
// TRI PAR HEURE (ETA / ETD)
// ------------------------------------------------------
function sortByTime(list) {
    list.sort((a, b) => {
        const ta = getTimeValue(a);
        const tb = getTimeValue(b);
        return ta - tb;
    });
}

function getTimeValue(f) {
    // Priorité : ETA/ETD → STD/Scheduled
    const t = f.eta || f.etd || f.scheduled || "";
    return parseTimeToMinutes(t);
}

function parseTimeToMinutes(t) {
    if (!t || typeof t !== "string") return 999999;
    const m = t.match(/(\d{2}):(\d{2})/);
    if (!m) return 999999;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// ------------------------------------------------------
// RENDU SECTION
// ------------------------------------------------------
function renderSection(title, flights) {
    if (!flights.length) {
        return `
            <div class="fids-section">
                <div class="fids-title">${title}</div>
                <div class="fids-empty">Aucun vol</div>
            </div>
        `;
    }

    return `
        <div class="fids-section">
            <div class="fids-title">${title}</div>
            ${flights.map(renderFlight).join("")}
        </div>
    `;
}

// ------------------------------------------------------
// RENDU VOL
// ------------------------------------------------------
function renderFlight(f) {
    const statusClass = getStatusClass(f.status);
    const time = f.eta || f.etd || f.scheduled || "--:--";

    return `
        <div class="fids-row ${statusClass}">
            <div class="fids-col time">${time}</div>
            <div class="fids-col flight">${f.flight || ""}</div>
            <div class="fids-col city">${f.city || ""}</div>
            <div class="fids-col status">${f.status || ""}</div>
        </div>
    `;
}

// ------------------------------------------------------
// COULEURS ATC
// ------------------------------------------------------
function getStatusClass(s) {
    if (!s) return "st-unknown";

    s = s.toUpperCase();

    if (s.includes("CANCEL")) return "st-cancel";
    if (s.includes("DELAY")) return "st-delay";
    if (s.includes("BOARD")) return "st-boarding";
    if (s.includes("FINAL")) return "st-final";
    if (s.includes("ON TIME") || s.includes("ONTIME")) return "st-ontime";

    return "st-unknown";
}
