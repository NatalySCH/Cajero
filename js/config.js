// ---------------------------------------------------------------
// Configuración general del cajero
// ---------------------------------------------------------------

export const VALORES = [10000, 20000, 50000, 100000];
export const MONTO_MAXIMO = 1000000;
export const DENOMINACION_MINIMA = VALORES[0];

export const STORAGE_KEY_RETIROS = "cajero_retiros";
export const STORAGE_KEY_INVENTARIO = "cajero_inventario";

// orden de presentación: 100k, 50k, 20k, 10k
export const ordenVisual = [3, 2, 1, 0];
export const nombres = ["10 mil", "20 mil", "50 mil", "100 mil"];

export const TITULOS = {
  nequi: "Nequi",
  mano: "Ahorro a la mano",
  cuenta: "Cuenta de ahorros",
};