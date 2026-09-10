// ---------------------------------------------------------------
// Clave temporal (Nequi) — visible 60s, luego se regenera
// ---------------------------------------------------------------

let claveTemporal = "";
let claveCountdown = 60;
let claveIntervalId = null;

export function generarClaveTemporal() {
  claveTemporal = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
  claveCountdown = 60;
  actualizarClaveUI();
}

export function actualizarClaveUI() {
  const valorEl = document.getElementById("claveTemporalValor");
  const timerEl = document.getElementById("claveTemporalTimer");
  if (!valorEl) return;
  valorEl.textContent = claveTemporal;
  timerEl.textContent = `Se renueva en ${claveCountdown}s`;
}

export function iniciarTemporizadorClave() {
  detenerTemporizadorClave();
  generarClaveTemporal();
  claveIntervalId = setInterval(() => {
    claveCountdown--;
    if (claveCountdown <= 0) generarClaveTemporal();
    else actualizarClaveUI();
  }, 1000);
}

export function detenerTemporizadorClave() {
  if (claveIntervalId) {
    clearInterval(claveIntervalId);
    claveIntervalId = null;
  }
}