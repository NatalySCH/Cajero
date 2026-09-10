// ---------------------------------------------------------------
// Persistencia del estado del cajero (localStorage)
// Claves: "cajero_retiros" y "cajero_inventario"
// ---------------------------------------------------------------

import {
  VALORES,
  STORAGE_KEY_RETIROS,
  STORAGE_KEY_INVENTARIO,
} from "./config.js";
import { INVENTARIO_ATM } from "./retiro.js";
import {
  inventarioActual,
  historialRetiros,
  setInventarioActual,
  setHistorialRetiros,
} from "./estado.js";

export function cargarEstado() {
  const invRaw = localStorage.getItem(STORAGE_KEY_INVENTARIO);
  try {
    const inv = invRaw ? JSON.parse(invRaw) : null;
    if (
      Array.isArray(inv) &&
      inv.length === VALORES.length &&
      inv.every((n) => Number.isFinite(n) && n >= 0)
    ) {
      setInventarioActual(inv.map(Number));
    } else {
      setInventarioActual([...INVENTARIO_ATM]);
    }
  } catch {
    setInventarioActual([...INVENTARIO_ATM]);
  }

  const histRaw = localStorage.getItem(STORAGE_KEY_RETIROS);
  try {
    const hist = histRaw ? JSON.parse(histRaw) : [];
    setHistorialRetiros(Array.isArray(hist) ? hist : []);
  } catch {
    setHistorialRetiros([]);
  }
}

export function guardarEstado() {
  localStorage.setItem(
    STORAGE_KEY_INVENTARIO,
    JSON.stringify(inventarioActual),
  );
  localStorage.setItem(
    STORAGE_KEY_RETIROS,
    JSON.stringify(historialRetiros),
  );
}

export function reabastecerCajero() {
  setInventarioActual([...INVENTARIO_ATM]);
  guardarEstado();
}