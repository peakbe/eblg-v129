// =========================
// MAP MODULE PRO+
// =========================

import { initSonometers } from "./sonometers.js";

let map = null;

export function initMap() {
    try {
        const container = document.getElementById("map");
        if (!container) {
            throw new Error("Map container #map introuvable dans le DOM.");
        }

        // Empêche double initialisation
        if (map !== null) {
            console.warn("[MAP] initMap() ignoré : carte déjà initialisée.");
            return map;
        }

        // Initialisation Leaflet
        map = L.map("map", {
            zoomControl: true,
            preferCanvas: true
        }).setView([50.637, 5.443], 13);

        // Fond de carte
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap"
        }).addTo(map);

        // Layers piste active
        window.runwayLayer = L.layerGroup().addTo(map);
        window.corridorLayer = L.layerGroup().addTo(map);

        // Modules
        

        console.log("[MAP] Carte initialisée avec succès.");
        return map;

    } catch (err) {
        console.error("[MAP ERROR] Erreur initMap :", err);
        return null;
    }
}

export function getMap() {
    return map;
}
