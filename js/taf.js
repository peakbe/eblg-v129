// ======================================================
// TAF — VERSION PRO+
// Chargement sécurisé, logs propres.
// ======================================================

import { ENDPOINTS } from "./config.js";
import { fetchJSON } from "./helpers.js";


// ------------------------------------------------------
// Logging PRO+
// ------------------------------------------------------
const IS_DEV = location.hostname.includes("localhost") || location.hostname.includes("127.0.0.1");
const log = (...a) => IS_DEV && console.log("[TAF]", ...a);
const logErr = (...a) => console.error("[TAF ERROR]", ...a);


// ------------------------------------------------------
// Chargement sécurisé
// ------------------------------------------------------
export async function safeLoadTaf() {
    try {
        await loadTaf();
        log("TAF chargé");
    } catch (err) {
        logErr("Erreur TAF :", err);
    }
}


// ------------------------------------------------------
// Chargement brut
// ------------------------------------------------------
export async function loadTaf() {
    const data = await fetchJSON(ENDPOINTS.taf);
    updateTafUI(data);
}


// ------------------------------------------------------
// Mise à jour UI
// ------------------------------------------------------
export function updateTafUI(data) {
    const el = document.getElementById("taf");
    if (!el) return;

    if (data.fallback) {
        el.innerText = "TAF indisponible (fallback)";
        return;
    }

    el.innerText = data.raw || "TAF disponible";
}
