// ---------------------------------------------------------------
// Interacción y eventos
// ---------------------------------------------------------------

import {
  VALORES,
  MONTO_MAXIMO,
  DENOMINACION_MINIMA,
  TITULOS,
  ordenVisual,
  nombres,
} from "./config.js";
import {
  tipoActual,
  montoSeleccionado,
  ultimoMonto,
  ultimoCantidadPorRetiro,
  inventarioActual,
  historialRetiros,
  setTipoActual,
  setMontoSeleccionado,
  setInventarioActual,
} from "./estado.js";
import { calcularRetiroConMatriz, INVENTARIO_ATM } from "./retiro.js";
import { guardarEstado, reabastecerCajero } from "./almacenamiento.js";
import {
  filtrarDigitos,
  filtrarNequi,
  filtrarMano,
  filtrarCuenta,
  obtenerRegexPrincipal,
  formatearInputMonto,
} from "./validaciones.js";
import {
  iniciarTemporizadorClave,
  detenerTemporizadorClave,
} from "./claveTemporal.js";
import {
  getPlantilla,
  formatearMonto,
  renderVector,
  mostrarError,
  mostrarErrorConReabastecer,
  mostrarExito,
  resetTodo,
} from "./interfaz.js";

// ---------------------------------------------------------------
// Navegación entre pasos
// ---------------------------------------------------------------

export function seleccionarTipo(tipo) {
  setTipoActual(tipo);
  setMontoSeleccionado(null);

  document.getElementById("formTitle").textContent = TITULOS[tipo];
  document.getElementById("camposIdentidad").innerHTML = getPlantilla(tipo);

  document
    .querySelectorAll(".chip")
    .forEach((c) => c.classList.remove("active"));
  document.getElementById("otroValorRow").hidden = true;
  const otroInput = document.getElementById("otroValorInput");
  otroInput.value = "";
  otroInput.dataset.raw = "";
  otroInput.disabled = true;

  document.getElementById("stepTipo").hidden = true;
  document.getElementById("stepForm").hidden = false;
  document.getElementById("stepResultado").hidden = true;

  attachCampoListeners(tipo);

  if (tipo === "nequi") iniciarTemporizadorClave();
  else detenerTemporizadorClave();

  validarFormulario();
}

export function attachCampoListeners(tipo) {
  const principal = document.getElementById("inputPrincipal");
  principal.addEventListener("input", () => {
    principal.value =
      tipo === "nequi"
        ? filtrarNequi(principal.value)
        : tipo === "mano"
          ? filtrarMano(principal.value)
          : filtrarCuenta(principal.value);

    const vp = document.getElementById("vectorPreview");
    if (!principal.value) {
      vp.textContent = "";
    } else if (tipo === "nequi") {
      vp.textContent = `Vector: ${renderVector("0" + principal.value)}`;
    } else {
      vp.textContent = `Vector: ${renderVector(principal.value)}`;
    }
    validarFormulario();
  });

  if (tipo !== "nequi") {
    const clave = document.getElementById("inputClave");
    clave.addEventListener("input", () => {
      clave.value = filtrarDigitos(clave.value, 4);
      validarFormulario();
    });
  }
}

export function validarFormulario() {
  if (!tipoActual) return;
  const principal = document.getElementById("inputPrincipal");
  let ok = obtenerRegexPrincipal(tipoActual).test(principal.value);

  if (tipoActual !== "nequi") {
    const clave = document.getElementById("inputClave");
    ok = ok && /^\d{4}$/.test(clave.value);
  }

  if (montoSeleccionado === null) {
    ok = false;
  } else if (montoSeleccionado === "otro") {
    const raw =
      document.getElementById("otroValorInput").dataset.raw || "";
    ok = ok && raw !== "" && Number(raw) > 0;
  }

  document.getElementById("retirarBtn").disabled = !ok;
}

export function onRetirar() {
  const principal = document.getElementById("inputPrincipal").value;
  const monto =
    montoSeleccionado === "otro"
      ? Number(document.getElementById("otroValorInput").dataset.raw || 0)
      : montoSeleccionado;

  if (!Number.isFinite(monto) || monto <= 0) {
    mostrarError("Ingrese un monto válido.");
    return;
  }
  if (monto > MONTO_MAXIMO) {
    mostrarError(
      `El monto excede el máximo permitido de $${formatearMonto(MONTO_MAXIMO)}.`,
    );
    return;
  }
  if (monto % DENOMINACION_MINIMA !== 0) {
    mostrarError(
      `No es posible entregar $${formatearMonto(monto)} con las denominaciones disponibles ($10.000, $20.000, $50.000, $100.000).`,
    );
    return;
  }

  const { cantidad, filas } = calcularRetiroConMatriz(monto);

  if (cantidad.some((c, i) => c > inventarioActual[i])) {
    mostrarErrorConReabastecer(
      `El cajero no cuenta con billetes suficientes para entregar $${formatearMonto(monto)} en este momento.`,
    );
    return;
  }

  setInventarioActual(inventarioActual.map((c, i) => c - cantidad[i]));
  historialRetiros.push({
    fecha: new Date().toISOString(),
    tipo: tipoActual,
    principal,
    monto,
    cantidad,
  });
  guardarEstado();

  mostrarExito(tipoActual, principal, monto, cantidad, filas);
}

export function verificarDisponibilidad(rebastecido) {
  const raw = document.getElementById("numRetirosInput").value.trim();
  const resultadoEl = document.getElementById("verificacionResultado");
  const n = parseInt(raw, 10);

  if (raw === "" || Number.isNaN(n) || n <= 0) {
    resultadoEl.innerHTML = `
  <div class="prompt-line" style="margin-top:10px;"><span class="caret error">!</span><span class="error">Ingrese un número entero positivo de retiros.</span></div>
`;
    return;
  }

  const necesario = ultimoCantidadPorRetiro.map((c) => c * n);
  const totalNecesario = necesario.reduce(
    (acc, c, i) => acc + c * VALORES[i],
    0,
  );
  const faltante = necesario.map((need, i) =>
    Math.max(0, need - inventarioActual[i]),
  );
  const posible = faltante.every((f) => f === 0);
  const cabeEnMaximo = necesario.every(
    (need, i) => need <= INVENTARIO_ATM[i],
  );

  const filasNecesario = ordenVisual
    .map(
      (i) => `
<div class="breakdown-row"><span>${nombres[i]}</span><span class="dots"></span><span class="inv-need">${necesario[i]}</span><span class="inv-atm">(cajero: ${inventarioActual[i]})</span></div>
`,
    )
    .join("");

  let html = "";

  if (rebastecido) {
    html += `
<div class="prompt-line" style="margin-top:10px;"><span class="caret">&gt;</span><span>Cajero reabastecido a su inventario máximo.</span></div>
`;
  }

  if (posible) {
    html += `
<div class="prompt-line" style="margin-top:10px;"><span class="caret">&gt;</span>
  <span>Sí es posible realizar ${n} retiro${n !== 1 ? "s" : ""} de $${formatearMonto(ultimoMonto)} (total $${formatearMonto(totalNecesario)}).</span>
</div>
<div class="breakdown">
  <div class="prompt-line"><span class="caret">&gt;</span><span>Billetes necesarios y disponibles en cajero:</span></div>
  <div class="inv-legend"><span>Denominación</span><span class="legend-spacer"></span><span class="inv-need">Necesarios</span><span class="inv-atm">Cajero tiene</span></div>
  ${filasNecesario}
</div>
`;
  } else {
    const filasFaltante = ordenVisual
      .map(
        (i) => `
<div class="breakdown-row"><span>${nombres[i]}</span><span class="dots"></span><span>${faltante[i]}</span></div>
`,
      )
      .join("");

    html += `
<div class="prompt-line" style="margin-top:10px;"><span class="caret error">!</span>
  <span class="error">No es posible realizar ${n} retiro${n !== 1 ? "s" : ""} de $${formatearMonto(ultimoMonto)}: el cajero no cuenta con billetes suficientes.</span>
</div>
<div class="breakdown">
  <div class="prompt-line"><span class="caret">&gt;</span><span>Billetes necesarios (total $${formatearMonto(totalNecesario)}):</span></div>
  <div class="inv-legend"><span>Denominación</span><span class="legend-spacer"></span><span class="inv-need">Necesarios</span><span class="inv-atm">Cajero tiene</span></div>
  ${filasNecesario}
</div>
<div class="breakdown">
  <div class="prompt-line"><span class="caret error">!</span><span class="error">Billetes faltantes:</span></div>
  ${filasFaltante}
</div>
`;

    if (cabeEnMaximo) {
      html += `
<div class="reabastecer-actions">
  <button id="reabastecerBtn">Reabastecer</button>
</div>
`;
    } else {
      html += `
<div class="prompt-line" style="margin-top:10px;"><span class="caret error">!</span><span class="error">Este monto total supera la capacidad máxima del cajero ($100.000.000), por lo que no es posible ni reabasteciendo.</span></div>
`;
    }
  }

  resultadoEl.innerHTML = html;

  const reabBtn = document.getElementById("reabastecerBtn");
  if (reabBtn) {
    reabBtn.addEventListener("click", () => {
      reabastecerCajero();
      verificarDisponibilidad(true);
    });
  }
}

// ---------------------------------------------------------------
// Listeners globales
// ---------------------------------------------------------------

document.querySelector(".tipo-grid").addEventListener("click", (e) => {
  const card = e.target.closest(".tipo-card");
  if (card) seleccionarTipo(card.dataset.tipo);
});

document.getElementById("chipsMonto").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;

  document
    .querySelectorAll(".chip")
    .forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");

  const val = btn.dataset.monto;
  const otroInput = document.getElementById("otroValorInput");
  if (val === "otro") {
    setMontoSeleccionado("otro");
    document.getElementById("otroValorRow").hidden = false;
    otroInput.disabled = false;
    otroInput.focus();
  } else {
    setMontoSeleccionado(Number(val));
    document.getElementById("otroValorRow").hidden = true;
    otroInput.value = "";
    otroInput.dataset.raw = "";
    otroInput.disabled = true;
  }
  validarFormulario();
});

document
  .getElementById("otroValorInput")
  .addEventListener("input", formatearInputMonto);

document.getElementById("backBtn").addEventListener("click", resetTodo);
document
  .getElementById("retirarBtn")
  .addEventListener("click", onRetirar);
document
  .getElementById("nuevoRetiroBtn")
  .addEventListener("click", resetTodo);