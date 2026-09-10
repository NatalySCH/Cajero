// ---------------------------------------------------------------
// Filtros de entrada (solo dígitos, sin letras ni especiales)
// ---------------------------------------------------------------

import { MONTO_MAXIMO } from "./config.js";
import { validarFormulario } from "./eventos.js";

export function filtrarDigitos(value, maxLen) {
  return value.replace(/\D/g, "").slice(0, maxLen);
}

// Nequi: único dígito inicial permitido es 3
export function filtrarNequi(value) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    const c = digits[i];
    if (i === 0 && c !== "3") break;
    out += c;
  }
  return out;
}

// Ahorro a la mano: 11 dígitos, primer dígito 1 o 0 y segundo dígito 3
export function filtrarMano(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    const c = digits[i];
    if (i === 0 && c !== "0" && c !== "1") break;
    if (i === 1 && c !== "3") break;
    out += c;
  }
  return out;
}

// Cuenta de ahorros: 11 dígitos, primer dígito ≠ 0
export function filtrarCuenta(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    const c = digits[i];
    if (i === 0 && c === "0") break;
    out += c;
  }
  return out;
}

export function obtenerRegexPrincipal(tipo) {
  if (tipo === "nequi") return /^3\d{9}$/;
  if (tipo === "mano") return /^[01]3\d{9}$/; // mano: primero 1 o 0, segundo 3
  return /^[1-9]\d{10}$/; // cuenta: 11 dígitos, primero ≠ 0
}

// ---------------------------------------------------------------
// Formato de pesos colombianos en vivo para "otro valor",
// con bloqueo de cualquier monto mayor a $1.000.000
// ---------------------------------------------------------------

export function formatearInputMonto(e) {
  const input = e.target;
  const raw = input.value.replace(/\D/g, "");

  if (raw === "") {
    input.dataset.raw = "";
    input.value = "";
    validarFormulario();
    return;
  }

  let num = parseInt(raw, 10);
  if (num > MONTO_MAXIMO) {
    num = input.dataset.raw ? Number(input.dataset.raw) : MONTO_MAXIMO;
  }

  input.dataset.raw = String(num);
  input.value = num.toLocaleString("es-CO");
  validarFormulario();
}