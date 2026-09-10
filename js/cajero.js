// ---------------------------------------------------------------
      // Metodología de acarreo (misma lógica de siempre: 2 for + 1 while,
      // instrumentada para además devolver la matriz de filas del proceso)
      // ---------------------------------------------------------------

      const VALORES = [10000, 20000, 50000, 100000];
      const MONTO_MAXIMO = 1000000;
      const DENOMINACION_MINIMA = VALORES[0];

      function calcularRetiroConMatriz(monto) {
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
      const INVENTARIO_ATM = calcularRetiroConMatriz(100000000).cantidad;

      // orden de presentación: 100k, 50k, 20k, 10k
      const ordenVisual = [3, 2, 1, 0];
      const nombres = ["10 mil", "20 mil", "50 mil", "100 mil"];

      function formatearMonto(n) {
        return n.toLocaleString("es-CO");
      }
      function renderVector(str) {
        return "[" + str.split("").join(", ") + "]";
      }

      function construirTablaMatriz(filas, cantidadTotal) {
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
        const totalCeldas = orden
          .map((i) => `<td>${cantidadTotal[i]}</td>`)
          .join("");

        return `
      <table class="billetes-table">
        <thead><tr><th>#</th><th>$100K</th><th>$50K</th><th>$20K</th><th>$10K</th><th>Total</th></tr></thead>
        <tbody>${filasHtml}</tbody>
        <tfoot><tr><td>Total</td>${totalCeldas}<td class="td-total">$${formatearMonto(totalGeneral)}</td></tr></tfoot>
      </table>
    `;
      }

      // ---------------------------------------------------------------
      // Estado y plantillas por tipo de retiro
      // ---------------------------------------------------------------

      let tipoActual = null;
      let montoSeleccionado = null; // number | 'otro' | null
      let claveTemporal = "";
      let claveCountdown = 60;
      let claveIntervalId = null;
      let ultimoMonto = null;
      let ultimoCantidadPorRetiro = null;

      const TITULOS = {
        nequi: "Nequi",
        mano: "Ahorro a la mano",
        cuenta: "Cuenta de ahorros",
      };

      function getPlantilla(tipo) {
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

      // ---------------------------------------------------------------
      // Filtros de entrada (solo dígitos, sin letras ni especiales)
      // ---------------------------------------------------------------

      function filtrarDigitos(value, maxLen) {
        return value.replace(/\D/g, "").slice(0, maxLen);
      }

      // Nequi: único dígito inicial permitido es 3
      function filtrarNequi(value) {
        const digits = value.replace(/\D/g, "").slice(0, 10);
        let out = "";
        for (let i = 0; i < digits.length; i++) {
          const c = digits[i];
          if (i === 0 && c !== "3") break;
          out += c;
        }
        return out;
      }

      // Ahorro a la mano y Cuenta de ahorros: primer dígito 0/1, segundo dígito 3
      function filtrarMano(value) {
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

      function obtenerRegexPrincipal(tipo) {
        if (tipo === "nequi") return /^3\d{9}$/;
        return /^[01]3\d{9}$/; // mano y cuenta comparten la misma validación
      }

      // ---------------------------------------------------------------
      // Formato de pesos colombianos en vivo para "otro valor",
      // con bloqueo de cualquier monto mayor a $1.000.000
      // ---------------------------------------------------------------

      function formatearInputMonto(e) {
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

      // ---------------------------------------------------------------
      // Clave temporal (Nequi) — visible 60s, luego se regenera
      // ---------------------------------------------------------------

      function generarClaveTemporal() {
        claveTemporal = String(Math.floor(Math.random() * 1000000)).padStart(
          6,
          "0",
        );
        claveCountdown = 60;
        actualizarClaveUI();
      }

      function actualizarClaveUI() {
        const valorEl = document.getElementById("claveTemporalValor");
        const timerEl = document.getElementById("claveTemporalTimer");
        if (!valorEl) return;
        valorEl.textContent = claveTemporal;
        timerEl.textContent = `Se renueva en ${claveCountdown}s`;
      }

      function iniciarTemporizadorClave() {
        detenerTemporizadorClave();
        generarClaveTemporal();
        claveIntervalId = setInterval(() => {
          claveCountdown--;
          if (claveCountdown <= 0) generarClaveTemporal();
          else actualizarClaveUI();
        }, 1000);
      }

      function detenerTemporizadorClave() {
        if (claveIntervalId) {
          clearInterval(claveIntervalId);
          claveIntervalId = null;
        }
      }

      // ---------------------------------------------------------------
      // Navegación entre pasos
      // ---------------------------------------------------------------

      function seleccionarTipo(tipo) {
        tipoActual = tipo;
        montoSeleccionado = null;

        document.getElementById("formTitle").textContent = TITULOS[tipo];
        document.getElementById("camposIdentidad").innerHTML =
          getPlantilla(tipo);

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

      function attachCampoListeners(tipo) {
        const principal = document.getElementById("inputPrincipal");
        principal.addEventListener("input", () => {
          principal.value =
            tipo === "nequi"
              ? filtrarNequi(principal.value)
              : filtrarMano(principal.value);

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

      function validarFormulario() {
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

      function onRetirar() {
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
        mostrarExito(tipoActual, principal, monto, cantidad, filas);
      }

      function mostrarError(msg) {
        detenerTemporizadorClave();
        document.getElementById("stepForm").hidden = true;
        document.getElementById("stepResultado").hidden = false;
        document.getElementById("resultadoContenido").innerHTML = `
      <div class="prompt-line"><span class="caret error">!</span><span class="error">${msg}</span></div>
      <div class="prompt-line" style="margin-top:6px;"><span class="caret error">!</span><span class="error">El proceso debe iniciarse nuevamente.</span></div>
    `;
        document.getElementById("nuevoRetiroBtn").textContent =
          "Reiniciar proceso";
      }

      function mostrarExito(tipo, principal, monto, cantidad, filas) {
        detenerTemporizadorClave();
        ultimoMonto = monto;
        ultimoCantidadPorRetiro = cantidad;

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
          .addEventListener("click", verificarDisponibilidad);
      }

      function verificarDisponibilidad() {
        const raw = document.getElementById("numRetirosInput").value.trim();
        const resultadoEl = document.getElementById("verificacionResultado");
        const n = parseInt(raw, 10);

        if (raw === "" || Number.isNaN(n) || n <= 0) {
          resultadoEl.innerHTML = `
        <div class="prompt-line" style="margin-top:10px;"><span class="caret error">!</span><span class="error">Ingrese un número entero positivo de retiros.</span></div>
      `;
          return;
        }

        const montoTotal = ultimoMonto * n;
        const desgloseTotal = calcularRetiroConMatriz(montoTotal);
        const necesario = desgloseTotal.cantidad;
        const totalNecesario = necesario.reduce(
          (acc, c, i) => acc + c * VALORES[i],
          0,
        );
        const faltante = necesario.map((need, i) =>
          Math.max(0, need - INVENTARIO_ATM[i]),
        );
        const posible = faltante.every((f) => f === 0);

        const filasNecesario = ordenVisual
          .map(
            (i) => `
      <div class="breakdown-row"><span>${nombres[i]}</span><span class="dots"></span><span>${necesario[i]}</span></div>
    `,
          )
          .join("");

        let html = "";

        if (posible) {
          html += `
        <div class="prompt-line" style="margin-top:10px;"><span class="caret">&gt;</span>
          <span>Sí es posible realizar ${n} retiro${n !== 1 ? "s" : ""} de $${formatearMonto(ultimoMonto)} (total $${formatearMonto(totalNecesario)}).</span>
        </div>
        <div class="breakdown">
          <div class="prompt-line"><span class="caret">&gt;</span><span>Billetes necesarios:</span></div>
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
          ${filasNecesario}
        </div>
        <div class="breakdown">
          <div class="prompt-line"><span class="caret error">!</span><span class="error">Billetes faltantes:</span></div>
          ${filasFaltante}
        </div>
      `;
        }

        resultadoEl.innerHTML = html;
      }

      function resetTodo() {
        detenerTemporizadorClave();
        tipoActual = null;
        montoSeleccionado = null;
        ultimoMonto = null;
        ultimoCantidadPorRetiro = null;
        document.getElementById("stepResultado").hidden = true;
        document.getElementById("stepForm").hidden = true;
        document.getElementById("stepTipo").hidden = false;
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
          montoSeleccionado = "otro";
          document.getElementById("otroValorRow").hidden = false;
          otroInput.disabled = false;
          otroInput.focus();
        } else {
          montoSeleccionado = Number(val);
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