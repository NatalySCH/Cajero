// ---------------------------------------------------------------
// Estado compartido del aplicativo
// Las variables vivas se leen mediante import; para modificarlas
// se utilizan los setters exportados.
// ---------------------------------------------------------------

import { INVENTARIO_ATM } from "./retiro.js";

let tipoActual = null;
let montoSeleccionado = null; // number | 'otro' | null
let ultimoMonto = null;
let ultimoCantidadPorRetiro = null;

let inventarioActual = [...INVENTARIO_ATM];
let historialRetiros = [];

export function setTipoActual(v) {
  tipoActual = v;
}
export function setMontoSeleccionado(v) {
  montoSeleccionado = v;
}
export function setUltimoMonto(v) {
  ultimoMonto = v;
}
export function setUltimoCantidadPorRetiro(v) {
  ultimoCantidadPorRetiro = v;
}
export function setInventarioActual(v) {
  inventarioActual = v;
}
export function setHistorialRetiros(v) {
  historialRetiros = v;
}

export {
  tipoActual,
  montoSeleccionado,
  ultimoMonto,
  ultimoCantidadPorRetiro,
  inventarioActual,
  historialRetiros,
};