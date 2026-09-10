// ---------------------------------------------------------------
// Metodología de acarreo (misma lógica de siempre: 2 for + 1 while,
// instrumentada para además devolver la matriz de filas del proceso)
// ---------------------------------------------------------------

import { VALORES, DENOMINACION_MINIMA } from "./config.js";

export function calcularRetiroConMatriz(monto) {
  const unidades = [1, 2, 3, 4];
  const cantidad = [0, 0, 0, 0];
  const filas = [];

  if (monto <= 0 || monto % DENOMINACION_MINIMA !== 0)
    return { cantidad, filas };

  let restante = monto;
  const full = 600000; // 1x10.000 + 2x20.000 + 3x50.000 + 4x100.000
  const ciclos = Math.floor(restante / full);

  if (ciclos > 0) {
    for (let i = 0; i < unidades.length; i++)
      cantidad[i] += ciclos * unidades[i];
    restante -= ciclos * full;
    for (let c = 0; c < ciclos; c++) filas.push([...unidades]);
  }

  while (restante > 0) {
    const antes = restante;

    for (let skip = 0; skip < VALORES.length && restante > 0; skip++) {
      const fila = [0, 0, 0, 0];
      let huboBillete = false;

      for (
        let j = skip;
        j < VALORES.length && restante >= VALORES[j];
        j++
      ) {
        cantidad[j]++;
        fila[j] = 1;
        huboBillete = true;
        restante -= VALORES[j];
      }
      if (huboBillete) filas.push(fila);
    }

    if (restante === antes) break;
  }

  return { cantidad, filas };
}

// Inventario del cajero: $100.000.000, calculado con la MISMA lógica de acarreo
export const INVENTARIO_ATM = calcularRetiroConMatriz(100000000).cantidad;