const APP_VERSION = "aula-1";
const CONFIG_KEY = "material-aula-config-v1";
const BOXES_KEY = "material-aula-boxes-v1";
const PUBLIC_APP_URL = "https://franjam32.github.io/MaterialAula/";
const DEFAULT_GROUPS = ["Grupo 1", "Grupo 2", "Grupo 3", "Grupo 4"];
const DEFAULT_BOXES = [
  { code: "CAJA-01", name: "Caja 1" },
  { code: "CAJA-02", name: "Caja 2" },
  { code: "CAJA-03", name: "Caja 3" },
  { code: "CAJA-04", name: "Caja 4" },
  { code: "CAJA-05", name: "Caja 5" },
  { code: "CAJA-06", name: "Caja 6" },
];

let config = loadConfig();
let boxes = loadBoxes();
let entries = [];
let view = "dashboard";

const $ = (selector) => document.querySelector(selector);

function loadConfig() {
  const params = new URLSearchParams(location.search);
  const stored = safeJson(localStorage.getItem(CONFIG_KEY), {});
  return {
    endpoint: params.get("gs") || stored.endpoint || "",
    publicUrl: stored.publicUrl || PUBLIC_APP_URL,
    defaultGroup: params.get("grupo") || stored.defaultGroup || DEFAULT_GROUPS[0],
  };
}

function loadBoxes() {
  const stored = safeJson(localStorage.getItem(BOXES_KEY), null);
  return Array.isArray(stored) && stored.length ? stored : DEFAULT_BOXES;
}

function saveConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function saveBoxes() {
  localStorage.setItem(BOXES_KEY, JSON.stringify(boxes));
}

function safeJson(value, fallback) {
  try {
    return JSON.parse(value) || fallback;
  } catch {
    return fallback;
  }
}

function isStudentMode() {
  return new URLSearchParams(location.search).get("modo") === "alumno";
}

function currentBoxCode() {
  const params = new URLSearchParams(location.search);
  return params.get("caja") || params.get("box") || params.get("qr") || "";
}

function boxByCode(code) {
  return boxes.find((box) => box.code.toLowerCase() === String(code).toLowerCase());
}

function render() {
  if (isStudentMode()) {
    renderStudent();
    return;
  }
  renderTeacher();
}

function renderTeacher() {
  $("#app").innerHTML = `
    <div class="teacher-shell">
      <aside class="sidebar">
        <div class="brand">
          <strong>Material Aula</strong>
          <span>Practica con cajas QR</span>
        </div>
        <nav class="nav">
          ${navButton("dashboard", "Seguimiento")}
          ${navButton("boxes", "Cajas y QR")}
          ${navButton("settings", "Google Sheets")}
        </nav>
      </aside>
      <main class="main">
        <header class="topbar">
          <div>
            <p class="eyebrow">Modo profesor</p>
            <h1>${viewTitle()}</h1>
          </div>
          <div class="toolbar">
            <button type="button" onclick="refreshEntries()">Actualizar entregas</button>
            <button class="secondary" type="button" onclick="exportEntries()">Exportar CSV</button>
          </div>
        </header>
        ${renderTeacherView()}
      </main>
    </div>
  `;
  drawQrCodes();
}

function navButton(id, label) {
  return `<button class="${view === id ? "active" : ""}" type="button" onclick="setView('${id}')">${label}</button>`;
}

function setView(next) {
  view = next;
  render();
}

function viewTitle() {
  return {
    dashboard: "Seguimiento del inventario creado",
    boxes: "Cajas y codigos QR",
    settings: "Conexion con Google Sheets",
  }[view];
}

function renderTeacherView() {
  if (view === "boxes") return renderBoxesView();
  if (view === "settings") return renderSettingsView();
  return renderDashboardView();
}

function renderDashboardView() {
  const total = entries.length;
  const boxesUsed = new Set(entries.map((entry) => entry.boxCode).filter(Boolean)).size;
  const groupsUsed = new Set(entries.map((entry) => entry.group).filter(Boolean)).size;
  const badState = entries.filter((entry) => /caducado|mal estado|incompleto/i.test(entry.state || "")).length;

  return `
    <section class="stats">
      ${stat("Materiales enviados", total)}
      ${stat("Cajas revisadas", boxesUsed)}
      ${stat("Grupos activos", groupsUsed)}
      ${stat("Incidencias", badState)}
    </section>
    <section class="panel">
      <div class="toolbar">
        <button type="button" onclick="refreshEntries()">Actualizar desde Sheets</button>
        <span class="status" id="loadStatus">${config.endpoint ? "" : "Configura primero la URL de Google Sheets."}</span>
      </div>
      <div class="entry-list">
        ${entries.length ? entries.map(renderEntryRow).join("") : `<div class="empty">Aun no hay entregas cargadas. Pulsa “Actualizar desde Sheets”.</div>`}
      </div>
    </section>
  `;
}

function stat(label, value) {
  return `<article class="stat"><span>${label}</span><strong>${value}</strong></article>`;
}

function renderEntryRow(entry) {
  return `
    <article class="entry-row">
      <div class="entry-color" style="background:${colorHex(entry.categoryColor)}"></div>
      <div>
        <h3>${escapeHtml(entry.materialName || "Material sin nombre")}</h3>
        <div class="meta">
          <span>${escapeHtml(entry.group || "Sin grupo")}</span>
          <span>${escapeHtml(entry.boxCode || "Sin caja")}</span>
          <span>${escapeHtml(entry.units || "0")} uds.</span>
          <span>${escapeHtml(entry.state || "Sin estado")}</span>
          <span>${escapeHtml(entry.category || "Otros")}</span>
          ${entry.expiry ? `<span>Caducidad: ${escapeHtml(entry.expiry)}</span>` : ""}
        </div>
        ${entry.observations ? `<p>${escapeHtml(entry.observations)}</p>` : ""}
      </div>
      <div>
        ${entry.photoUrl ? `<a href="${escapeHtml(entry.photoUrl)}" target="_blank" rel="noreferrer">Foto</a>` : ""}
      </div>
    </article>
  `;
}

function renderBoxesView() {
  return `
    <div class="grid">
      <section class="panel span-5 settings-only">
        <h2>Nueva caja</h2>
        <form class="form-grid" onsubmit="addBox(event)">
          <label>
            Codigo
            <input id="newBoxCode" type="text" placeholder="CAJA-07" required />
          </label>
          <label>
            Nombre
            <input id="newBoxName" type="text" placeholder="Caja 7" required />
          </label>
          <button class="wide" type="submit">Anadir caja</button>
        </form>
        <p class="meta">Puedes usar 6 cajas o mas. Cada QR abre el formulario de alumno para esa caja.</p>
      </section>
      <section class="panel span-7">
        <div class="toolbar">
          <button type="button" onclick="window.print()">Imprimir QR</button>
          <button class="secondary" type="button" onclick="resetBoxes()">Restaurar 6 cajas</button>
        </div>
        <div class="qr-grid">
          ${boxes.map(renderQrCard).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderQrCard(box) {
  const url = buildStudentUrl(box.code);
  return `
    <article class="qr-card">
      <div class="qr-code" data-qr="${escapeHtml(url)}"></div>
      <h3>${escapeHtml(box.name)}</h3>
      <p><strong>${escapeHtml(box.code)}</strong></p>
      <p class="qr-url">${escapeHtml(url)}</p>
    </article>
  `;
}

function renderSettingsView() {
  return `
    <section class="panel">
      <form class="form-grid" onsubmit="saveSettings(event)">
        <label class="wide">
          URL de Google Apps Script
          <input id="endpointInput" type="url" value="${escapeHtml(config.endpoint)}" placeholder="https://script.google.com/macros/s/..." />
        </label>
        <label>
          URL publica de la app
          <input id="publicUrlInput" type="url" value="${escapeHtml(config.publicUrl)}" />
        </label>
        <label>
          Grupo por defecto
          <select id="defaultGroupInput">
            ${DEFAULT_GROUPS.map((group) => `<option value="${group}" ${config.defaultGroup === group ? "selected" : ""}>${group}</option>`).join("")}
          </select>
        </label>
        <button type="submit">Guardar configuracion</button>
      </form>
      <p class="meta">Primero crea el Apps Script, pega su URL aqui y despues imprime los QR. Asi los moviles de los alumnos enviaran las respuestas a tu Google Sheet.</p>
    </section>
  `;
}

function buildStudentUrl(code) {
  const url = new URL(config.publicUrl || PUBLIC_APP_URL);
  url.searchParams.set("modo", "alumno");
  url.searchParams.set("caja", code);
  url.searchParams.set("grupo", config.defaultGroup || DEFAULT_GROUPS[0]);
  if (config.endpoint) url.searchParams.set("gs", config.endpoint);
  return url.toString();
}

function drawQrCodes() {
  document.querySelectorAll("[data-qr]").forEach((target) => {
    const qr = qrcode(0, "M");
    qr.addData(target.dataset.qr);
    qr.make();
    target.innerHTML = qr.createSvgTag(4, 2);
  });
}

function renderStudent() {
  const code = currentBoxCode();
  const box = boxByCode(code) || { code, name: code || "Caja" };
  $("#app").innerHTML = `
    <main class="student-page">
      <div class="student-wrap">
        <section class="student-hero">
          <p>Practica de identificacion</p>
          <h1>${escapeHtml(box.name)}</h1>
          <span>${escapeHtml(box.code)}</span>
        </section>
        <section class="student-card">
          <form class="student-form" onsubmit="submitStudentEntry(event)">
            <label>
              Grupo
              <select id="studentGroup" required>
                ${DEFAULT_GROUPS.map((group) => `<option value="${group}" ${config.defaultGroup === group ? "selected" : ""}>${group}</option>`).join("")}
              </select>
            </label>
            <label>
              Material identificado
              <input id="materialName" type="text" placeholder="Ej. guantes nitrilo" required autocomplete="off" />
            </label>
            <label>
              Unidades
              <input id="units" type="number" min="0" placeholder="Ej. 12" required />
            </label>
            <label>
              Estado
              <select id="state" required>
                <option>Nuevo</option>
                <option>Usado</option>
                <option>Caducado</option>
                <option>Mal estado</option>
                <option>Incompleto</option>
                <option>Desconocido</option>
              </select>
            </label>
            <fieldset class="color-options">
              <legend>Clasificacion por color</legend>
              ${renderCategoryOption("Circulatorio", "Rojo", "ROJO", false)}
              ${renderCategoryOption("Respiratorio", "Azul", "AZUL", false)}
              ${renderCategoryOption("Pediatrico", "Amarillo", "AMARILLO", false)}
              ${renderCategoryOption("Otros", "Verde", "VERDE", true)}
            </fieldset>
            <label>
              Caducidad opcional
              <input id="expiry" type="date" />
            </label>
            <label>
              Observaciones
              <textarea id="observations" rows="3" placeholder="Dudas, deterioro, lote visible..."></textarea>
            </label>
            <label>
              Descripcion breve
              <textarea id="description" rows="3" placeholder="Pulsa Buscar objeto o escribe que es y para que sirve."></textarea>
            </label>
            <label>
              Imagen automatica
              <input id="imageUrl" type="url" placeholder="Se puede editar si no coincide." />
            </label>
            <div id="imagePreview"></div>
            <label>
              Foto del alumno
              <input id="photo" type="file" accept="image/*" capture="environment" />
            </label>
            <div class="student-actions">
              <button type="button" onclick="findObjectInfo()">Buscar objeto</button>
              <button class="good" type="submit">Enviar</button>
            </div>
            <div class="status" id="studentStatus"></div>
          </form>
        </section>
      </div>
    </main>
  `;
}

function renderCategoryOption(value, color, label, checked) {
  return `
    <label class="color-option ${color.toLowerCase()}">
      <input type="radio" name="category" value="${value}" ${checked ? "checked" : ""} />
      <span>${label}</span>
      <strong>${value}</strong>
    </label>
  `;
}

function addBox(event) {
  event.preventDefault();
  const code = $("#newBoxCode").value.trim().toUpperCase();
  const name = $("#newBoxName").value.trim();
  if (!code || !name) return;
  if (!boxes.some((box) => box.code === code)) {
    boxes.push({ code, name });
    saveBoxes();
  }
  render();
}

function resetBoxes() {
  boxes = DEFAULT_BOXES.slice();
  saveBoxes();
  render();
}

function saveSettings(event) {
  event.preventDefault();
  config.endpoint = $("#endpointInput").value.trim();
  config.publicUrl = $("#publicUrlInput").value.trim() || PUBLIC_APP_URL;
  config.defaultGroup = $("#defaultGroupInput").value;
  saveConfig();
  render();
}

async function refreshEntries() {
  const status = $("#loadStatus");
  if (!config.endpoint) {
    if (status) status.textContent = "Falta la URL de Google Apps Script.";
    return;
  }
  if (status) status.textContent = "Cargando entregas...";
  try {
    entries = await loadEntriesFromScript(config.endpoint);
    if (status) status.textContent = `Cargadas ${entries.length} entregas.`;
    render();
  } catch {
    if (status) status.textContent = "No se pudieron cargar las entregas.";
  }
}

function loadEntriesFromScript(endpoint) {
  return new Promise((resolve, reject) => {
    const callbackName = `materialAulaCallback_${Date.now()}`;
    const script = document.createElement("script");
    const url = new URL(endpoint);
    url.searchParams.set("action", "list");
    url.searchParams.set("callback", callbackName);
    window[callbackName] = (payload) => {
      delete window[callbackName];
      script.remove();
      resolve(payload.entries || []);
    };
    script.onerror = () => {
      delete window[callbackName];
      script.remove();
      reject(new Error("load failed"));
    };
    script.src = url.toString();
    document.body.appendChild(script);
  });
}

function exportEntries() {
  const rows = [
    ["Fecha", "Grupo", "Caja", "Material", "Unidades", "Estado", "Clasificacion", "Color", "Caducidad", "Observaciones", "Descripcion", "Imagen", "Foto"],
    ...entries.map((entry) => [
      entry.submittedAt || "",
      entry.group || "",
      entry.boxCode || "",
      entry.materialName || "",
      entry.units || "",
      entry.state || "",
      entry.category || "",
      entry.categoryColor || "",
      entry.expiry || "",
      entry.observations || "",
      entry.description || "",
      entry.imageUrl || "",
      entry.photoUrl || "",
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `material-aula-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function findObjectInfo() {
  const name = normalizeObjectName($("#materialName").value);
  if (!name) {
    alert("Escribe primero el material.");
    return;
  }
  $("#studentStatus").textContent = "Buscando imagen y descripcion...";
  $("#description").value = briefDescription(name, getCategoryValue());
  const image = await searchOpenverseImage(name);
  if (image) {
    $("#imageUrl").value = image;
    renderImagePreview(image);
  }
  $("#studentStatus").textContent = "Puedes editar descripcion o imagen antes de enviar.";
}

async function searchOpenverseImage(name) {
  try {
    const query = encodeURIComponent(`${name} sanitario producto`);
    const response = await fetch(`https://api.openverse.engineering/v1/images/?q=${query}&page_size=12`);
    if (!response.ok) return "";
    const data = await response.json();
    const result = (data.results || []).find((item) => {
      const text = `${item.title || ""} ${item.url || ""}`.toLowerCase();
      return !/facebook|pinterest|instagram|youtube/.test(text);
    });
    return result?.thumbnail || result?.url || "";
  } catch {
    return "";
  }
}

function briefDescription(name, category) {
  const text = name.toLowerCase();
  if (text.includes("guante")) return "Guante sanitario desechable para proteger las manos durante practicas y procedimientos.";
  if (text.includes("mascarilla") || text.includes("ffp")) return "Mascarilla de proteccion respiratoria para practicas de higiene, aislamiento o seguridad.";
  if (text.includes("fonendo") || text.includes("estetoscopio")) return "Instrumento de auscultacion para escuchar sonidos cardiacos y respiratorios.";
  if (text.includes("sonda")) return "Sonda sanitaria para entrenar tecnicas de cuidados y procedimientos.";
  if (text.includes("jeringa")) return "Dispositivo para practicar preparacion y administracion simulada de medicacion.";
  const labels = {
    Circulatorio: "Material circulatorio para practicas de valoracion, constantes o cuidados cardiovasculares.",
    Respiratorio: "Material respiratorio para practicas de oxigenoterapia, proteccion o via aerea.",
    Pediatrico: "Material pediatrico para practicas docentes con pacientes infantiles o simuladores.",
    Otros: "Material sanitario de uso docente para practicas y procedimientos.",
  };
  return labels[category] || labels.Otros;
}

function normalizeObjectName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b(nuevo|usado|caducado|caducada|mal estado|incompleto|desconocido)\b/g, " ")
    .replace(/\b(caja|cajas|unidad|unidades|uds|ud|lote|ref|referencia|talla|tamano|color)\b/g, " ")
    .replace(/\b(practica|entrenamiento|docente|simulacion|material sanitario|material)\b/g, " ")
    .replace(/[0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderImagePreview(url) {
  $("#imagePreview").innerHTML = url
    ? `<div class="preview"><img src="${escapeHtml(url)}" alt=""><span>Si no coincide, cambia la URL o usa la foto del alumno.</span></div>`
    : "";
}

async function submitStudentEntry(event) {
  event.preventDefault();
  if (!config.endpoint) {
    $("#studentStatus").textContent = "Falta configurar Google Sheets en el QR.";
    return;
  }
  const photoFile = $("#photo").files[0];
  const photo = photoFile ? await imageFileToPayload(photoFile) : null;
  const boxCode = currentBoxCode();
  const box = boxByCode(boxCode) || { code: boxCode, name: boxCode };
  const category = getCategoryValue();
  const payload = {
    submittedAt: new Date().toISOString(),
    group: $("#studentGroup").value,
    boxCode: box.code,
    boxName: box.name,
    materialName: $("#materialName").value.trim(),
    units: $("#units").value,
    state: $("#state").value,
    category,
    categoryColor: categoryColorName(category),
    expiry: $("#expiry").value,
    observations: $("#observations").value.trim(),
    description: $("#description").value.trim(),
    imageUrl: $("#imageUrl").value.trim(),
    photo,
  };
  $("#studentStatus").textContent = "Enviando...";
  try {
    await fetch(config.endpoint, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
    $("#studentStatus").textContent = "Enviado. Puedes registrar otro material de esta caja.";
    event.target.reset();
    $("#studentGroup").value = payload.group;
    const otherCategory = document.querySelector('input[name="category"][value="Otros"]');
    if (otherCategory) otherCategory.checked = true;
    $("#imagePreview").innerHTML = "";
  } catch {
    $("#studentStatus").textContent = "No se pudo enviar. Revisa la conexion.";
  }
}

function getCategoryValue() {
  return document.querySelector('input[name="category"]:checked')?.value || "Otros";
}

async function imageFileToPayload(file) {
  const dataUrl = await resizeImageFile(file, 1200, 0.78);
  return { name: file.name || `foto-${Date.now()}.jpg`, mimeType: "image/jpeg", dataUrl };
}

function resizeImageFile(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function categoryColorName(category) {
  return { Circulatorio: "Rojo", Respiratorio: "Azul", Pediatrico: "Amarillo", Otros: "Verde" }[category] || "Verde";
}

function colorHex(color) {
  return { Rojo: "#d64545", Azul: "#1f6fbd", Amarillo: "#dba72b", Verde: "#2f9b63" }[color] || "#2f9b63";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js?v=100").catch(() => {});
}

render();
