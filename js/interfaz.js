// ---------------------------------------------------------------
// Renderizado e interfaz visual
// ---------------------------------------------------------------

import { VALORES, ordenVisual, nombres } from "./config.js";
import {
  inventarioActual,
  setTipoActual,
  setMontoSeleccionado,
  setUltimoMonto,
  setUltimoCantidadPorRetiro,
} from "./estado.js";
import { filtrarDigitos } from "./validaciones.js";
import { reabastecerCajero } from "./almacenamiento.js";
import { detenerTemporizadorClave } from "./claveTemporal.js";
import { verificarDisponibilidad } from "./eventos.js";

export function formatearMonto(n) {
  return n.toLocaleString("es-CO");
}

export function renderVector(str) {
  return "[" + str.split("").join(", ") + "]";
}

export function getPlantilla(tipo) {
  if (tipo === "nequi") {
    return `
    <div class="field-label">Número de celular (10 dígitos · inicia en 3)</div>
    <div class="field-input"><input id="inputPrincipal" type="text" inputmode="numeric" maxlength="10" placeholder="3001234567" autocomplete="off"></div>
    <div class="vector-preview" id="vectorPreview"></div>

    <div class="key-box">
      <div class="key-label">Clave temporal de retiro</div>
      <div class="key-value" id="claveTemporalValor">------</div>
      <div class="key-timer" id="claveTemporalTimer">Se renueva en 60s</div>
    </div>
  `;
  }
  if (tipo === "mano") {
    return `
    <div class="field-label">Número (11 dígitos · inicia en 0 o 1 · segundo dígito 3)</div>
    <div class="field-input"><input id="inputPrincipal" type="text" inputmode="numeric" maxlength="11" placeholder="03XXXXXXXXX" autocomplete="off"></div>
    <div class="vector-preview" id="vectorPreview"></div>

    <div class="field-label" style="margin-top:14px;">Clave (4 dígitos)</div>
    <div class="field-input"><input id="inputClave" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off"></div>
  `;
  }
  return `
  <div class="field-label">Número de cuenta (11 dígitos · inicia en 0 o 1 · segundo dígito 3)</div>
  <div class="field-input"><input id="inputPrincipal" type="text" inputmode="numeric" maxlength="11" placeholder="03XXXXXXXXX" autocomplete="off"></div>
  <div class="vector-preview" id="vectorPreview"></div>

  <div class="field-label" style="margin-top:14px;">Clave (4 dígitos)</div>
  <div class="field-input"><input id="inputClave" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off"></div>
`;
}

export function construirTablaMatriz(filas, cantidadTotal) {
  if (filas.length === 0) {
    return '<div class="empty-note">— no hay billetes para este monto —</div>';
  }
  const orden = [3, 2, 1, 0]; // columnas: 100k, 50k, 20k, 10k

  const filasHtml = filas
    .map((fila, idx) => {
      const celdas = orden.map((i) => `<td>${fila[i]}</td>`).join("");
      const total = orden.reduce(
        (acc, i) => acc + fila[i] * VALORES[i],
        0,
      );
      return `<tr><td>${idx + 1}</td>${celdas}<td class="td-total">$${formatearMonto(total)}</td></tr>`;
    })
    .join("");

  const totalGeneral = cantidadTotal.reduce(
    (acc, c, i) => acc + c * VALORES[i],
    0,
  );
  const totalCeldas = orden.map((i) => `<td>${cantidadTotal[i]}</td>`).join("");

  return `
  <table class="billetes-table">
    <thead><tr><th>#</th><th>$100K</th><th>$50K</th><th>$20K</th><th>$10K</th><th>Total</th></tr></thead>
    <tbody>${filasHtml}</tbody>
    <tfoot><tr><td>Total</td>${totalCeldas}<td class="td-total">$${formatearMonto(totalGeneral)}</td></tr></tfoot>
  </table>
`;
}

export function mostrarError(msg) {
  detenerTemporizadorClave();
  document.getElementById("stepForm").hidden = true;
  document.getElementById("stepResultado").hidden = false;
  document.getElementById("resultadoContenido").innerHTML = `
  <div class="prompt-line"><span class="caret error">!</span><span class="error">${msg}</span></div>
  <div class="prompt-line" style="margin-top:6px;"><span class="caret error">!</span><span class="error">El proceso debe iniciarse nuevamente.</span></div>
`;
  document.getElementById("nuevoRetiroBtn").textContent = "Reiniciar proceso";
}

export function mostrarErrorConReabastecer(msg) {
  detenerTemporizadorClave();
  document.getElementById("stepForm").hidden = true;
  document.getElementById("stepResultado").hidden = false;
  document.getElementById("resultadoContenido").innerHTML = `
  <div class="prompt-line"><span class="caret error">!</span><span class="error">${msg}</span></div>
  <div class="reabastecer-actions">
    <button id="reabastecerBtn">Reabastecer</button>
  </div>
  <div class="prompt-line" style="margin-top:6px;"><span class="caret error">!</span><span class="error">El proceso debe iniciarse nuevamente.</span></div>
`;
  document.getElementById("nuevoRetiroBtn").textContent = "Reiniciar proceso";
  document
    .getElementById("reabastecerBtn")
    .addEventListener("click", () => {
      reabastecerCajero();
      document.getElementById("resultadoContenido").innerHTML = `
      <div class="prompt-line"><span class="caret">&gt;</span><span>El cajero fue reabastecido a su inventario máximo.</span></div>
      <div class="prompt-line" style="margin-top:6px;"><span class="caret">&gt;</span><span>Inicie un nuevo retiro para continuar.</span></div>
    `;
      document.getElementById("nuevoRetiroBtn").textContent = "Nuevo retiro";
    });
}

export function mostrarExito(tipo, principal, monto, cantidad, filas) {
  detenerTemporizadorClave();
  setUltimoMonto(monto);
  setUltimoCantidadPorRetiro(cantidad);

  let reporteHtml;
  if (tipo === "nequi") {
    const vectorReporte = "0" + principal;
    reporteHtml = `
    <div class="report-box">
      <div class="report-label">Reporte de retiro</div>
      <div class="report-line">Número: <b>${principal}</b></div>
      <div class="report-line">Vector generado (11 dígitos): <b>${vectorReporte}</b></div>
      <div class="report-line mono">${renderVector(vectorReporte)}</div>
    </div>
  `;
  } else {
    const etiqueta =
      tipo === "mano" ? "Número (Ahorro a la Mano)" : "Cuenta de ahorros";
    reporteHtml = `
    <div class="report-box">
      <div class="report-label">Reporte de retiro</div>
      <div class="report-line">${etiqueta}: <b>${principal}</b></div>
    </div>
  `;
  }

  const rows = ordenVisual
    .map(
      (i) => `
  <div class="breakdown-row"><span>${nombres[i]}</span><span class="dots"></span><span>${cantidad[i]}</span></div>
`,
    )
    .join("");

  const inventarioTotal = inventarioActual.reduce(
    (acc, c, i) => acc + c * VALORES[i],
    0,
  );
  const inventarioRows = ordenVisual
    .map((i) => `${nombres[i]}: ${inventarioActual[i]}`)
    .join("  ·  ");

  document.getElementById("stepForm").hidden = true;
  document.getElementById("stepResultado").hidden = false;
  document.getElementById("resultadoContenido").innerHTML = `
  ${reporteHtml}
  <div class="breakdown">
    <div class="prompt-line"><span class="caret">&gt;</span><span>Desglose de billetes para $${formatearMonto(monto)}:</span></div>
    ${rows}
    <div class="total-row"><span>Total entregado</span><span>$${formatearMonto(monto)}</span></div>
  </div>

  <div class="section-label">Matriz de desglose (acarreo)</div>
  ${construirTablaMatriz(filas, cantidad)}

  <div class="section-label">Verificar disponibilidad para varios retiros</div>
  <div class="verificacion-box">
    <div class="field-label">¿Cuántos retiros de $${formatearMonto(monto)} desea verificar?</div>
    <div class="field-input"><input id="numRetirosInput" type="text" inputmode="numeric" placeholder="Ej: 50" autocomplete="off"></div>
    <div class="limit-note">El cajero cuenta con un inventario máximo de $100.000.000 en billetes.</div>
    <div class="limit-note">Inventario actual: $${formatearMonto(inventarioTotal)} &nbsp;(${inventarioRows})</div>
    <div class="actions"><button id="verificarBtn">Verificar disponibilidad</button></div>
    <div id="verificacionResultado"></div>
  </div>
`;
  document.getElementById("nuevoRetiroBtn").textContent = "Nuevo retiro";

  const numRetirosInput = document.getElementById("numRetirosInput");
  numRetirosInput.addEventListener("input", () => {
    numRetirosInput.value = filtrarDigitos(numRetirosInput.value, 6);
  });
  document
    .getElementById("verificarBtn")
    .addEventListener("click", () => verificarDisponibilidad(false));
}

export function resetTodo() {
  detenerTemporizadorClave();
  setTipoActual(null);
  setMontoSeleccionado(null);
  setUltimoMonto(null);
  setUltimoCantidadPorRetiro(null);
  document.getElementById("stepResultado").hidden = true;
  document.getElementById("stepForm").hidden = true;
  document.getElementById("stepTipo").hidden = false;
}