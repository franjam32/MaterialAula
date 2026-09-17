const STORAGE_KEY = "material-docente-sanitario-v1";
const PRACTICE_CONFIG_KEY = "material-docente-practica-config-v1";

const today = new Date().toISOString().slice(0, 10);
const PUBLIC_APP_URL = "https://franjam32.github.io/MaterialAula/";
const STUDENT_GROUPS = ["Grupo 1", "Grupo 2", "Grupo 3", "Grupo 4"];

const sampleData = {
  locations: [
    ...buildDefaultLocations(),
  ],
  items: [],
  loans: [],
};

sampleData.items = [
  {
    id: crypto.randomUUID(),
    name: "Fonendos de practica",
    category: "Circulatorio",
    quantity: 10,
    minStock: 4,
    locationId: sampleData.locations[0].id,
    lot: "",
    expiry: "",
    notes: "Material docente reutilizable.",
    description: "Instrumento de auscultacion para practicar la escucha de sonidos cardiacos y respiratorios.",
    imageUrl: "",
    sourceUrl: "",
    imageSource: "",
  },
  {
    id: crypto.randomUUID(),
    name: "Guantes de nitrilo talla M",
    category: "Otros",
    quantity: 250,
    minStock: 100,
    locationId: sampleData.locations[1].id,
    lot: "GN-M-24",
    expiry: "",
    notes: "Uso para practicas.",
    description: "Guantes desechables de nitrilo para proteger las manos durante practicas y procedimientos.",
    imageUrl: "",
    sourceUrl: "",
    imageSource: "",
  },
  {
    id: crypto.randomUUID(),
    name: "Sondas vesicales entrenamiento",
    category: "Otros",
    quantity: 24,
    minStock: 10,
    locationId: sampleData.locations[2].id,
    lot: "SV-09",
    expiry: "2026-12-15",
    notes: "",
    description: "Sonda flexible para entrenamiento de tecnicas de sondaje y cuidados basicos.",
    imageUrl: "",
    sourceUrl: "",
    imageSource: "",
  },
];

sampleData.loans = [
  {
    id: crypto.randomUUID(),
    itemId: sampleData.items[0].id,
    quantity: 2,
    tutor: "Maria Lopez",
    outDate: today,
    dueDate: "2026-09-12",
    returnDate: "",
    notes: "Practica de constantes.",
  },
];

let data = loadData();
let scannerStream = null;
let scannerTimer = null;
let autoEnrichStarted = false;
let practiceConfig = loadPracticeConfig();

const $ = (selector) => document.querySelector(selector);

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return normalizeData(sampleData);
  try {
    return normalizeData(JSON.parse(stored));
  } catch {
    return sampleData;
  }
}

function normalizeData(source) {
  source.items = (source.items || []).map((item) => ({
    description: "",
    imageUrl: "",
    sourceUrl: "",
    imageSource: "",
    ...item,
    category: normalizeCategory(item.category),
  }));
  source.locations = ensureDefaultLocations(source.locations || []);
  source.loans = source.loans || [];
  return source;
}

function buildDefaultLocations() {
  return [
    { name: "Caja A-01", type: "Caja", path: "Mesa practica / Caja A-01", code: "LOC-CAJA-A01" },
    { name: "Caja A-02", type: "Caja", path: "Mesa practica / Caja A-02", code: "LOC-CAJA-A02" },
    { name: "Caja A-03", type: "Caja", path: "Mesa practica / Caja A-03", code: "LOC-CAJA-A03" },
    { name: "Caja B-01", type: "Caja", path: "Mesa practica / Caja B-01", code: "LOC-CAJA-B01" },
    { name: "Caja B-02", type: "Caja", path: "Mesa practica / Caja B-02", code: "LOC-CAJA-B02" },
    { name: "Caja B-03", type: "Caja", path: "Mesa practica / Caja B-03", code: "LOC-CAJA-B03" },
  ].map((location) => ({ id: crypto.randomUUID(), ...location }));
}

function ensureDefaultLocations(locations) {
  const existingCodes = new Set(locations.map((location) => location.code));
  const missing = buildDefaultLocations().filter((location) => !existingCodes.has(location.code));
  return locations.concat(missing);
}

function normalizeCategory(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("circulator") || text.includes("cardio") || text.includes("vascular")) return "Circulatorio";
  if (text.includes("respir") || text.includes("oxigen") || text.includes("mascarilla") || text.includes("via aerea")) return "Respiratorio";
  if (text.includes("pedi")) return "Pediatrico";
  return ["Circulatorio", "Respiratorio", "Otros", "Pediatrico"].includes(value) ? value : "Otros";
}

function categoryClass(category) {
  return `cat-${normalizeCategory(category).toLowerCase()}`;
}

function categoryLabel(category) {
  const normalized = normalizeCategory(category);
  const labels = {
    Circulatorio: "ROJO Circulatorio",
    Respiratorio: "AZUL Respiratorio",
    Otros: "VERDE Otros",
    Pediatrico: "AMARILLO Pediatrico",
  };
  return labels[normalized] || labels.Otros;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadPracticeConfig() {
  try {
    const params = new URLSearchParams(location.search);
    const stored = JSON.parse(localStorage.getItem(PRACTICE_CONFIG_KEY)) || { student: "", endpoint: "" };
    if (params.get("gs")) stored.endpoint = params.get("gs");
    if (!stored.student) stored.student = STUDENT_GROUPS[0];
    return stored;
  } catch {
    return { student: STUDENT_GROUPS[0], endpoint: "" };
  }
}

function savePracticeConfig() {
  localStorage.setItem(PRACTICE_CONFIG_KEY, JSON.stringify(practiceConfig));
}

function formatDate(value) {
  if (!value) return "Sin caducidad";
  return new Intl.DateTimeFormat("es-ES").format(new Date(`${value}T00:00:00`));
}

function getLocation(id) {
  return data.locations.find((location) => location.id === id);
}

function getItem(id) {
  return data.items.find((item) => item.id === id);
}

function loanedQuantity(itemId) {
  return data.loans
    .filter((loan) => loan.itemId === itemId && !loan.returnDate)
    .reduce((sum, loan) => sum + Number(loan.quantity || 0), 0);
}

function availableQuantity(item) {
  return Number(item.quantity || 0) - loanedQuantity(item.id);
}

function isLate(loan) {
  return !loan.returnDate && loan.dueDate < today;
}

function expiryStatus(item) {
  if (!item.expiry) return null;
  const expiry = new Date(`${item.expiry}T00:00:00`);
  const now = new Date(`${today}T00:00:00`);
  const days = Math.ceil((expiry - now) / 86400000);
  if (days < 0) return { text: "Caducado", type: "red" };
  if (days <= 60) return { text: "Caduca pronto", type: "blue" };
  return null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  saveData();
  renderStats();
  renderSelects();
  renderSearch();
  renderAlerts();
  renderItems();
  renderLocations();
  renderLoans();
  renderLabels();
  renderPracticeSettings();
}

function renderStats() {
  $("#statItems").textContent = data.items.length;
  $("#statLocations").textContent = data.locations.length;
  $("#statLoaned").textContent = data.loans.filter((loan) => !loan.returnDate).length;
  $("#statLate").textContent = data.loans.filter(isLate).length;
}

function renderSelects() {
  const locationOptions = data.locations
    .map((location) => `<option value="${location.id}">${escapeHtml(location.path)}</option>`)
    .join("");
  $("#itemLocation").innerHTML = locationOptions;

  const itemOptions = data.items
    .map((item) => `<option value="${item.id}">${escapeHtml(item.name)} (${availableQuantity(item)} disp.)</option>`)
    .join("");
  $("#loanItem").innerHTML = itemOptions;
}

function renderSearch() {
  const query = $("#globalSearch").value.trim().toLowerCase();
  const results = query
    ? data.items.filter((item) => {
        const location = getLocation(item.locationId);
        return [item.name, item.category, item.lot, item.notes, location?.path]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
    : data.items.slice(0, 5);

  $("#searchResults").innerHTML = results.length
    ? results.map(renderItemResult).join("")
    : `<div class="empty">No se ha encontrado material con esa busqueda.</div>`;
  renderFeaturedResult(results[0]);
}

function renderItemResult(item) {
  const location = getLocation(item.locationId);
  const loaned = loanedQuantity(item.id);
  const available = availableQuantity(item);
  const expiry = expiryStatus(item);
  return `
    <article class="item-row product-row ${categoryClass(item.category)}">
      <div class="product-thumb">${renderProductImage(item)}</div>
      <div class="product-info">
        <div class="item-main">
          <strong>${escapeHtml(item.name)}</strong>
          <span class="category-badge">${categoryLabel(item.category)}</span>
        </div>
        <p class="description">${escapeHtml(item.description || "Descripcion pendiente de completar desde internet.")}</p>
        <div class="meta">
          <span>${escapeHtml(location?.path || "Sin ubicacion")}</span>
          <span>Total: ${item.quantity}</span>
          <span>${available} disponibles</span>
          ${loaned ? `<span>Prestados: ${loaned}</span>` : ""}
          ${item.expiry ? `<span>Caducidad: ${formatDate(item.expiry)}</span>` : "<span>Sin caducidad</span>"}
          ${expiry ? `<span class="pill ${expiry.type}">${expiry.text}</span>` : ""}
          ${item.imageSource ? `<span>Imagen: ${escapeHtml(item.imageSource)}</span>` : ""}
          ${item.sourceUrl ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">Fuente venta</a>` : ""}
        </div>
      </div>
    </article>
  `;
}

function renderFeaturedResult(item) {
  const target = $("#featuredResult");
  if (!item) {
    target.innerHTML = "";
    return;
  }
  const location = getLocation(item.locationId);
  target.innerHTML = `
    <div class="desktop-preview">
      <article class="featured-card ${categoryClass(item.category)}">
        <div class="product-thumb large">${renderProductImage(item)}</div>
        <div>
          <p class="eyebrow">Resultado principal</p>
          <h3>${escapeHtml(item.name)}</h3>
          <span class="category-badge">${categoryLabel(item.category)}</span>
          <p>${escapeHtml(item.description || "Pulsa completar desde internet para cargar descripcion e imagen automaticamente.")}</p>
          <div class="stock-block">
            <span>Stock total</span>
            <strong>${availableQuantity(item)}</strong>
            <small>disponibles</small>
          </div>
        </div>
      </article>
      <article class="location-card">
        <h3>Ubicacion exacta</h3>
        <strong>${escapeHtml(location?.path || "Sin ubicacion")}</strong>
        <dl>
          <div><dt>Pasillo</dt><dd>${escapeHtml(parseLocationPart(location?.path, "Pasillo") || "-")}</dd></div>
          <div><dt>Estanteria</dt><dd>${escapeHtml(parseLocationPart(location?.path, "Estanteria") || "-")}</dd></div>
          <div><dt>Caja</dt><dd>${escapeHtml(location?.name || "-")}</dd></div>
          <div><dt>QR</dt><dd>${escapeHtml(location?.code || "-")}</dd></div>
        </dl>
      </article>
      ${renderShelfMap(location)}
    </div>
  `;
}

function renderProductImage(item) {
  if (item.imageUrl) {
    return `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('.product-thumb').classList.add('image-missing'); this.remove();" />`;
  }
  const initials = item.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return `<span>${escapeHtml(initials || "MD")}</span>`;
}

function parseLocationPart(path = "", label) {
  return path.split("/").map((part) => part.trim()).find((part) => part.toLowerCase().startsWith(label.toLowerCase()));
}

function renderShelfMap(location) {
  const activeShelf = parseLocationPart(location?.path, "Estanteria") || location?.name || "Ubicacion";
  const shelfNames = ["Estanteria 1", "Estanteria 2", "Estanteria 3"];
  return `
    <article class="shelf-panel">
      <h3>${escapeHtml(parseLocationPart(location?.path, "Pasillo") || "Pasillo")}</h3>
      <div class="shelf-map">
        ${shelfNames.map((name) => `
          <div class="shelf ${activeShelf.includes(name) ? "active" : ""}">
            <span>${name}</span>
            <div class="shelf-slots">
              ${Array.from({ length: 9 }).map((_, index) => `<i class="${activeShelf.includes(name) && index === 4 ? "target" : ""}"></i>`).join("")}
            </div>
            ${activeShelf.includes(name) ? `<strong>${escapeHtml(location?.name || "")}</strong>` : ""}
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function renderAlerts() {
  const alerts = [];
  data.items.forEach((item) => {
    if (availableQuantity(item) <= Number(item.minStock || 0)) {
      alerts.push(`${item.name}: stock bajo (${availableQuantity(item)} disponibles)`);
    }
    const expiry = expiryStatus(item);
    if (expiry) alerts.push(`${item.name}: ${expiry.text.toLowerCase()} (${formatDate(item.expiry)})`);
  });
  data.loans.filter(isLate).forEach((loan) => {
    const item = getItem(loan.itemId);
    alerts.push(`${item?.name || "Material"}: prestamo retrasado de ${loan.tutor}`);
  });

  $("#alertsList").innerHTML = alerts.length
    ? alerts.map((alert) => `<div class="info-card"><span class="pill red">Aviso</span><p>${escapeHtml(alert)}</p></div>`).join("")
    : `<div class="empty">Sin avisos pendientes.</div>`;
}

function renderItems() {
  $("#itemsTable").innerHTML = data.items.length
    ? data.items.map((item) => {
        const location = getLocation(item.locationId);
        return `
          <article class="item-row product-row ${categoryClass(item.category)}">
            <div class="product-thumb">${renderProductImage(item)}</div>
            <div class="product-info">
              <div class="item-main">
                <strong>${escapeHtml(item.name)}</strong>
                <span class="category-badge">${categoryLabel(item.category)}</span>
              </div>
              <p class="description">${escapeHtml(item.description || "Descripcion pendiente de internet.")}</p>
              <div class="meta">
                <span>${availableQuantity(item)} disponibles de ${item.quantity}</span>
                <span>${escapeHtml(location?.path || "Sin ubicacion")}</span>
                <span>${formatDate(item.expiry)}</span>
                ${item.lot ? `<span>Lote: ${escapeHtml(item.lot)}</span>` : ""}
              </div>
              <div class="row-actions">
                <button type="button" onclick="editItem('${item.id}')">Editar</button>
                <button class="ghost-button" type="button" onclick="enrichItemById('${item.id}')">Completar</button>
                <button class="ghost-button" type="button" onclick="quickLoan('${item.id}')">Prestar</button>
                <button class="ghost-button" type="button" onclick="deleteItem('${item.id}')">Eliminar</button>
              </div>
            </div>
          </article>
        `;
      }).join("")
    : `<div class="empty">Aun no hay material registrado.</div>`;
}

function renderLocations() {
  $("#locationsList").innerHTML = data.locations.length
    ? data.locations.map((location) => {
        const count = data.items.filter((item) => item.locationId === location.id).length;
        return `
          <article class="info-card">
            <div class="item-main">
              <strong>${escapeHtml(location.name)}</strong>
              <span class="pill">${escapeHtml(location.type)}</span>
            </div>
            <div class="meta">
              <span>${escapeHtml(location.path)}</span>
              <span>Codigo: ${escapeHtml(location.code)}</span>
              <span>${count} materiales</span>
            </div>
            <div class="row-actions">
              <button type="button" onclick="openLocation('${location.code}')">Ver contenido</button>
              <button class="ghost-button" type="button" onclick="editLocation('${location.id}')">Editar</button>
            </div>
          </article>
        `;
      }).join("")
    : `<div class="empty">Crea una caja, estanteria o balda para empezar.</div>`;
}

function renderLoans() {
  const loans = data.loans.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  $("#loansList").innerHTML = loans.length
    ? loans.map((loan) => {
        const item = getItem(loan.itemId);
        const status = loan.returnDate ? "Devuelto" : isLate(loan) ? "Retrasado" : "Prestado";
        const statusClass = status === "Retrasado" ? "red" : status === "Devuelto" ? "blue" : "";
        return `
          <article class="info-card">
            <div class="item-main">
              <strong>${escapeHtml(item?.name || "Material eliminado")}</strong>
              <span class="pill ${statusClass}">${status}</span>
            </div>
            <div class="meta">
              <span>Cantidad: ${loan.quantity}</span>
              <span>Tutor: ${escapeHtml(loan.tutor)}</span>
              <span>Salida: ${formatDate(loan.outDate)}</span>
              <span>Regreso: ${formatDate(loan.dueDate)}</span>
              ${loan.returnDate ? `<span>Devuelto: ${formatDate(loan.returnDate)}</span>` : ""}
            </div>
            <div class="row-actions">
              ${loan.returnDate ? "" : `<button type="button" onclick="returnLoan('${loan.id}')">Marcar devuelto</button>`}
              <button class="ghost-button" type="button" onclick="editLoan('${loan.id}')">Editar</button>
            </div>
          </article>
        `;
      }).join("")
    : `<div class="empty">No hay prestamos registrados.</div>`;
}

function renderLabels() {
  $("#labelsGrid").innerHTML = data.locations.map((location) => `
    <article class="label-card">
      <div class="qr-code" data-qr="${escapeHtml(buildLocationUrl(location.code))}" aria-label="QR ${escapeHtml(location.code)}"></div>
      <strong>${escapeHtml(location.name)}</strong>
      <p class="meta">${escapeHtml(location.path)}</p>
      <p><strong>${escapeHtml(location.code)}</strong></p>
      <p class="label-url">${escapeHtml(buildLocationUrl(location.code))}</p>
    </article>
  `).join("");
  drawQrCodes();
}

function buildLocationUrl(code) {
  const base = getAppBaseUrl();
  const url = new URL(base);
  url.searchParams.set("qr", code);
  url.searchParams.set("modo", "alumno");
  if (practiceConfig.endpoint) url.searchParams.set("gs", practiceConfig.endpoint);
  return url.toString();
}

function getAppBaseUrl() {
  if (location.protocol === "file:") return PUBLIC_APP_URL;
  return `${location.origin}${location.pathname}`;
}

function drawQrCodes() {
  document.querySelectorAll("[data-qr]").forEach((target) => {
    const value = target.dataset.qr;
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    target.innerHTML = qr.createSvgTag(4, 2);
  });
}

function openLocation(codeOrUrl) {
  const code = extractLocationCode(codeOrUrl);
  const location = data.locations.find((entry) => entry.code.toLowerCase() === code.trim().toLowerCase());
  const target = $("#scanResult");
  if (!location) {
    target.innerHTML = `<div class="empty">No encuentro una ubicacion con el codigo ${escapeHtml(code)}.</div>`;
    return;
  }
  const items = data.items.filter((item) => item.locationId === location.id);
  if (isStudentMode()) {
    target.innerHTML = renderStudentPractice(location);
    switchView("scanner");
    return;
  }
  target.innerHTML = `
    <article class="info-card">
      <div class="item-main">
        <strong>${escapeHtml(location.name)}</strong>
        <span class="pill">${escapeHtml(location.type)}</span>
      </div>
      <p class="meta">${escapeHtml(location.path)}</p>
    </article>
    ${renderShelfMap(location)}
    <div class="result-list">${items.length ? items.map(renderItemResult).join("") : `<div class="empty">Esta ubicacion esta vacia.</div>`}</div>
  `;
  switchView("scanner");
}

function isStudentMode() {
  return new URLSearchParams(location.search).get("modo") === "alumno";
}

function renderStudentPractice(location) {
  return `
    <div class="student-hero">
      <p>Practica de identificacion</p>
      <h2>${escapeHtml(location.name)}</h2>
      <span>${escapeHtml(location.path)}</span>
    </div>
    <article class="info-card">
      <div class="item-main">
        <strong>Rellena un material cada vez</strong>
        <span class="pill">${escapeHtml(location.code)}</span>
      </div>
      <p class="meta">Identifica el objeto, revisa la descripcion o haz una foto si la imagen no coincide.</p>
    </article>
    <form id="practiceEntryForm" class="practice-form">
      <label>
        Grupo
        <select id="practiceEntryStudent" required>
          ${STUDENT_GROUPS.map((group) => `<option value="${group}" ${practiceConfig.student === group ? "selected" : ""}>${group}</option>`).join("")}
        </select>
      </label>
      <label>
        Material identificado
        <input id="practiceMaterialName" type="text" placeholder="Ej. Guantes nitrilo" required autocomplete="off" />
      </label>
      <label>
        Unidades
        <input id="practiceUnits" type="number" min="0" placeholder="Ej. 12" required />
      </label>
      <label>
        Estado
        <select id="practiceState" required>
          <option value="Nuevo">Nuevo</option>
          <option value="Usado">Usado</option>
          <option value="Caducado">Caducado</option>
          <option value="Mal estado">Mal estado</option>
          <option value="Incompleto">Incompleto</option>
          <option value="Desconocido">Desconocido</option>
        </select>
      </label>
      <label>
        Clasificacion por color
        <select id="practiceCategory" required>
          <option value="Circulatorio">ROJO Circulatorio</option>
          <option value="Respiratorio">AZUL Respiratorio</option>
          <option value="Pediatrico">AMARILLO Pediatrico</option>
          <option value="Otros" selected>VERDE Otros</option>
        </select>
      </label>
      <label>
        Caducidad opcional
        <input id="practiceExpiry" type="date" />
      </label>
      <label class="wide">
        Observaciones
        <textarea id="practiceNotes" rows="3" placeholder="Detalles, dudas, deterioro, lote visible..."></textarea>
      </label>
      <label class="wide">
        Descripcion automatica o corregida
        <textarea id="practiceDescription" rows="3" placeholder="Busca automaticamente o escribe que es y para que sirve."></textarea>
      </label>
      <label class="wide">
        Imagen automatica
        <input id="practiceImageUrl" type="url" placeholder="Se puede completar automaticamente." />
      </label>
      <label class="wide">
        Foto hecha por el alumno
        <input id="practicePhoto" type="file" accept="image/*" capture="environment" />
      </label>
      <div class="button-row wide">
        <button type="button" onclick="enrichPracticeMaterial()">Buscar objeto</button>
        <button class="send-button" type="button" onclick="submitPracticeEntry('${escapeHtml(location.code)}')">Enviar</button>
      </div>
      <div id="practiceEntryStatus" class="internet-status wide" aria-live="polite"></div>
    </form>
  `;
}

function renderPracticeSettings() {
  if (!$("#practiceStudent")) return;
  $("#practiceStudent").value = practiceConfig.student || STUDENT_GROUPS[0];
  $("#practiceEndpoint").value = practiceConfig.endpoint || "";
}

function extractLocationCode(value) {
  const raw = String(value || "").trim();
  try {
    const url = new URL(raw);
    return url.searchParams.get("qr") || url.searchParams.get("ubicacion") || raw;
  } catch {
    return raw;
  }
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
  $("#viewTitle").textContent = document.querySelector(`[data-view="${viewId}"]`).textContent;
}

function resetItemForm() {
  $("#itemForm").reset();
  $("#itemId").value = "";
}

function resetLoanForm() {
  $("#loanForm").reset();
  $("#loanId").value = "";
  $("#loanOutDate").value = today;
}

window.editItem = (id) => {
  const item = getItem(id);
  $("#itemId").value = item.id;
  $("#itemName").value = item.name;
  $("#itemCategory").value = item.category;
  $("#itemQuantity").value = item.quantity;
  $("#itemMinStock").value = item.minStock;
  $("#itemLocation").value = item.locationId;
  $("#itemLot").value = item.lot;
  $("#itemExpiry").value = item.expiry;
  $("#itemNotes").value = item.notes;
  $("#itemDescription").value = item.description || "";
  $("#itemImage").value = item.imageUrl || "";
  switchView("inventory");
};

window.deleteItem = (id) => {
  if (!confirm("Eliminar este material tambien ocultara sus prestamos asociados. ¿Continuar?")) return;
  data.items = data.items.filter((item) => item.id !== id);
  render();
};

window.quickLoan = (id) => {
  resetLoanForm();
  $("#loanItem").value = id;
  switchView("loans");
};

window.editLocation = (id) => {
  const location = data.locations.find((entry) => entry.id === id);
  $("#locationId").value = location.id;
  $("#locationName").value = location.name;
  $("#locationType").value = location.type;
  $("#locationPath").value = location.path;
  $("#locationCode").value = location.code;
};

window.editLoan = (id) => {
  const loan = data.loans.find((entry) => entry.id === id);
  $("#loanId").value = loan.id;
  $("#loanItem").value = loan.itemId;
  $("#loanQuantity").value = loan.quantity;
  $("#loanTutor").value = loan.tutor;
  $("#loanOutDate").value = loan.outDate;
  $("#loanDueDate").value = loan.dueDate;
  $("#loanReturnDate").value = loan.returnDate;
  $("#loanNotes").value = loan.notes;
};

window.returnLoan = (id) => {
  const loan = data.loans.find((entry) => entry.id === id);
  loan.returnDate = today;
  render();
};

window.openLocation = openLocation;
window.enrichItemById = async (id) => {
  const item = getItem(id);
  await enrichItem(item);
  render();
};
window.enrichPracticeMaterial = enrichPracticeMaterial;
window.submitPracticeEntry = submitPracticeEntry;

$("#itemForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const item = {
    id: $("#itemId").value || crypto.randomUUID(),
    name: $("#itemName").value.trim(),
    category: $("#itemCategory").value,
    quantity: Number($("#itemQuantity").value || 0),
    minStock: Number($("#itemMinStock").value || 0),
    locationId: $("#itemLocation").value,
    lot: $("#itemLot").value.trim(),
    expiry: $("#itemExpiry").value,
    notes: $("#itemNotes").value.trim(),
    description: $("#itemDescription").value.trim(),
    imageUrl: $("#itemImage").value.trim(),
    sourceUrl: data.items.find((entry) => entry.id === $("#itemId").value)?.sourceUrl || "",
    imageSource: data.items.find((entry) => entry.id === $("#itemId").value)?.imageSource || "",
  };
  data.items = data.items.filter((entry) => entry.id !== item.id).concat(item);
  resetItemForm();
  render();
  if (!item.description || !item.imageUrl) {
    enrichItem(item).then(render);
  }
});

$("#locationForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const location = {
    id: $("#locationId").value || crypto.randomUUID(),
    name: $("#locationName").value.trim(),
    type: $("#locationType").value,
    path: $("#locationPath").value.trim(),
    code: $("#locationCode").value.trim(),
  };
  data.locations = data.locations.filter((entry) => entry.id !== location.id).concat(location);
  $("#locationForm").reset();
  $("#locationId").value = "";
  render();
});

$("#loanForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const item = getItem($("#loanItem").value);
  const quantity = Number($("#loanQuantity").value || 0);
  const existingId = $("#loanId").value;
  const existing = data.loans.find((loan) => loan.id === existingId);
  const currentLoaned = existing && !existing.returnDate ? loanedQuantity(item.id) - Number(existing.quantity || 0) : loanedQuantity(item.id);

  if (quantity > Number(item.quantity || 0) - currentLoaned && !$("#loanReturnDate").value) {
    alert("No hay suficiente cantidad disponible para ese prestamo.");
    return;
  }

  const loan = {
    id: existingId || crypto.randomUUID(),
    itemId: $("#loanItem").value,
    quantity,
    tutor: $("#loanTutor").value.trim(),
    outDate: $("#loanOutDate").value,
    dueDate: $("#loanDueDate").value,
    returnDate: $("#loanReturnDate").value,
    notes: $("#loanNotes").value.trim(),
  };
  data.loans = data.loans.filter((entry) => entry.id !== loan.id).concat(loan);
  resetLoanForm();
  render();
});

$("#practiceSettingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  practiceConfig = {
    student: $("#practiceStudent").value.trim(),
    endpoint: $("#practiceEndpoint").value.trim(),
  };
  savePracticeConfig();
  $("#practiceStatus").textContent = "Configuracion guardada en este dispositivo.";
});

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

$("#globalSearch").addEventListener("input", renderSearch);
$("#clearSearch").addEventListener("click", () => {
  $("#globalSearch").value = "";
  renderSearch();
});
$("#manualQrButton").addEventListener("click", () => openLocation($("#manualQr").value));
$("#resetItemForm").addEventListener("click", resetItemForm);
$("#resetLoanForm").addEventListener("click", resetLoanForm);
$("#printLabels").addEventListener("click", () => window.print());
$("#enrichAllButton").addEventListener("click", enrichAllItems);
$("#enrichCurrentItem").addEventListener("click", enrichCurrentFormItem);

$("#exportButton").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `material-docente-${today}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

$("#importInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  data = JSON.parse(await file.text());
  render();
});

async function startScanner() {
  if (!("BarcodeDetector" in window)) {
    $("#scanSupport").textContent = "Este navegador no permite leer QR desde aqui. Usa la entrada manual.";
    return;
  }
  const detector = new BarcodeDetector({ formats: ["qr_code"] });
  scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  $("#scannerVideo").srcObject = scannerStream;
  await $("#scannerVideo").play();
  scannerTimer = window.setInterval(async () => {
    const codes = await detector.detect($("#scannerVideo")).catch(() => []);
    if (codes.length) {
      openLocation(codes[0].rawValue);
      stopScanner();
    }
  }, 600);
}

async function enrichCurrentFormItem() {
  const draft = {
    name: $("#itemName").value.trim(),
    category: $("#itemCategory").value.trim(),
    description: $("#itemDescription").value.trim(),
    imageUrl: $("#itemImage").value.trim(),
    sourceUrl: "",
  };
  if (!draft.name) {
    alert("Escribe primero el nombre del material.");
    return;
  }
  setInternetStatus("Buscando imagen y descripcion...");
  await enrichItem(draft);
  $("#itemDescription").value = draft.description;
  $("#itemImage").value = draft.imageUrl;
  setInternetStatus(draft.sourceUrl ? "Completado desde internet." : "No he encontrado una coincidencia clara.");
}

async function enrichPracticeMaterial() {
  const name = normalizeObjectName($("#practiceMaterialName").value.trim());
  if (!name) {
    alert("Escribe primero el nombre del material.");
    return;
  }
  $("#practiceEntryStatus").textContent = "Buscando descripcion e imagen...";
  const draft = {
    name,
    category: $("#practiceCategory").value,
    description: $("#practiceDescription").value.trim(),
    imageUrl: $("#practiceImageUrl").value.trim(),
    sourceUrl: "",
  };
  await enrichItem(draft);
  $("#practiceDescription").value = draft.description || "";
  $("#practiceImageUrl").value = draft.imageUrl || "";
  $("#practiceEntryStatus").textContent = "Busqueda completada. Si no coincide, corrige el texto o haz una foto.";
}

async function submitPracticeEntry(locationCode) {
  const endpoint = practiceConfig.endpoint || $("#practiceEndpoint")?.value.trim();
  if (!endpoint) {
    alert("Falta configurar la URL de Google Apps Script en la pestana Practica.");
    switchView("practice");
    return;
  }

  const locationEntry = data.locations.find((entry) => entry.code === locationCode);
  const student = $("#practiceEntryStudent").value.trim();
  practiceConfig.student = student;
  savePracticeConfig();

  const photoFile = $("#practicePhoto").files[0];
  const photo = photoFile ? await imageFileToPayload(photoFile) : null;
  const payload = {
    submittedAt: new Date().toISOString(),
    student,
    boxCode: locationCode,
    locationName: locationEntry?.name || "",
    locationPath: locationEntry?.path || "",
    materialName: $("#practiceMaterialName").value.trim(),
    units: $("#practiceUnits").value,
    state: $("#practiceState").value,
    category: $("#practiceCategory").value,
    categoryColor: categoryColorName($("#practiceCategory").value),
    expiry: $("#practiceExpiry").value,
    observations: $("#practiceNotes").value.trim(),
    description: $("#practiceDescription").value.trim(),
    imageUrl: $("#practiceImageUrl").value.trim(),
    photo,
  };

  $("#practiceEntryStatus").textContent = "Enviando a Google Sheets...";
  try {
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(payload),
    });
    $("#practiceEntryStatus").textContent = "Enviado. Puedes introducir otro material de la misma caja.";
    $("#practiceMaterialName").value = "";
    $("#practiceUnits").value = "";
    $("#practiceState").value = "Nuevo";
    $("#practiceCategory").value = "Otros";
    $("#practiceExpiry").value = "";
    $("#practiceNotes").value = "";
    $("#practiceDescription").value = "";
    $("#practiceImageUrl").value = "";
    $("#practicePhoto").value = "";
  } catch {
    $("#practiceEntryStatus").textContent = "No se pudo enviar. Revisa conexion y URL de Apps Script.";
  }
}

function categoryColorName(category) {
  const colors = {
    Circulatorio: "Rojo",
    Respiratorio: "Azul",
    Pediatrico: "Amarillo",
    Otros: "Verde",
  };
  return colors[normalizeCategory(category)] || "Verde";
}

async function imageFileToPayload(file) {
  const dataUrl = await resizeImageFile(file, 1200, 0.78);
  return {
    name: file.name || `foto-${Date.now()}.jpg`,
    mimeType: "image/jpeg",
    dataUrl,
  };
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
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function enrichAllItems() {
  setInternetStatus("Completando materiales desde internet...");
  for (const item of data.items) {
    await enrichItem(item);
  }
  setInternetStatus("Revision de internet terminada.");
  render();
}

async function enrichItem(item) {
  const searchItem = { ...item, name: normalizeObjectName(item.name) || item.name };
  const productInfo = await fetchSalesProductInfo(searchItem);
  if (productInfo) {
    item.description = productInfo.description || item.description || buildBriefDescription(item);
    item.imageUrl = productInfo.imageUrl || item.imageUrl;
    item.sourceUrl = productInfo.sourceUrl || item.sourceUrl;
    item.imageSource = productInfo.imageSource || item.imageSource || "Pagina de venta";
    item.category = normalizeCategory(productInfo.category || item.category);
    return item;
  }

  const queries = buildInternetQueries(item);

  if (!item.imageUrl) {
    const openImage = await fetchOpenverseImage(queries[0]);
    if (openImage) {
      item.imageUrl = openImage.imageUrl;
      item.sourceUrl = item.sourceUrl || openImage.sourceUrl;
    }
  }

  if (!item.description) {
    item.description = buildBriefDescription(item);
  }
  return item;
}

async function fetchSalesProductInfo(item) {
  try {
    const params = new URLSearchParams({
      q: item.name,
      category: normalizeCategory(item.category),
    });
    const response = await fetch(`/api/product-info?${params.toString()}`);
    if (!response.ok) return null;
    const result = await response.json();
    return result?.ok ? result : null;
  } catch {
    return null;
  }
}

function buildBriefDescription(item) {
  const name = item.name.toLowerCase();
  if (name.includes("guante")) return "Guante sanitario desechable para proteger las manos durante practicas y procedimientos.";
  if (name.includes("mascarilla") || name.includes("ffp") || name.includes("respir")) return "Equipo respiratorio de proteccion para practicas de higiene, aislamiento o seguridad.";
  if (name.includes("fonendo") || name.includes("estetosc")) return "Instrumento de auscultacion para practicar la escucha de sonidos cardiacos y respiratorios.";
  if (name.includes("sonda")) return "Sonda de uso docente para entrenar tecnicas de cuidados y procedimientos.";
  if (name.includes("pedi")) return "Material pediatrico para practicas docentes con pacientes infantiles o simuladores.";
  return `Material de ${normalizeCategory(item.category).toLowerCase()} para actividades de docencia sanitaria.`;
}

function buildInternetQueries(item) {
  const cleanName = normalizeObjectName(item.name)
    .replace(/\s+/g, " ")
    .trim();
  const shortName = cleanName.split(/\s+/).slice(0, 3).join(" ");
  return [...new Set([cleanName, shortName, `${shortName} sanitario`, item.category].filter(Boolean))];
}

function normalizeObjectName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b(nuevo|usado|caducado|caducada|mal estado|incompleto|desconocido)\b/gi, " ")
    .replace(/\b(caja|cajas|unidad|unidades|uds|ud|lote|ref|referencia|talla|tamano|color|azul|blanco|negro)\b/gi, " ")
    .replace(/\b(de practica|practica|entrenamiento|docente|simulacion|material sanitario|material)\b/gi, " ")
    .replace(/[0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchOpenverseImage(query) {
  try {
    const url = `https://api.openverse.engineering/v1/images/?q=${encodeURIComponent(query)}&page_size=1&license_type=commercial,modification`;
    const data = await fetch(url).then((response) => response.ok ? response.json() : null);
    const result = data?.results?.find((entry) => entry.thumbnail || entry.url);
    if (!result) return null;
    return {
      imageUrl: result.thumbnail || result.url,
      sourceUrl: result.foreign_landing_url || result.url,
    };
  } catch {
    return null;
  }
}

function cleanExtract(value) {
  const div = document.createElement("div");
  div.innerHTML = value;
  return (div.textContent || div.innerText || value).replace(/\s+/g, " ").trim().slice(0, 220);
}

function setInternetStatus(message) {
  $("#internetStatus").textContent = message;
}

function stopScanner() {
  if (scannerTimer) window.clearInterval(scannerTimer);
  scannerTimer = null;
  if (scannerStream) scannerStream.getTracks().forEach((track) => track.stop());
  scannerStream = null;
  $("#scannerVideo").srcObject = null;
}

$("#startScan").addEventListener("click", startScanner);
$("#stopScan").addEventListener("click", stopScanner);

$("#scanSupport").textContent = "La camara funciona en navegadores compatibles y normalmente desde localhost o HTTPS.";
applyStudentModeShell();
resetLoanForm();
render();
openInitialLocationFromUrl();
autoEnrichMissingItems();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js?v=7").catch(() => {});
}

async function autoEnrichMissingItems() {
  if (autoEnrichStarted) return;
  autoEnrichStarted = true;
  const missing = data.items.filter(shouldRefreshProductInfo);
  if (!missing.length) return;
  setInternetStatus("Cargando imagenes y descripciones desde internet...");
  for (const item of missing) {
    await enrichItem(item);
    saveData();
  }
  setInternetStatus("Imagenes y descripciones actualizadas.");
  render();
}

function shouldRefreshProductInfo(item) {
  const sourceText = `${item.sourceUrl || ""} ${item.imageUrl || ""} ${item.imageSource || ""}`;
  return (
    !item.description ||
    !item.imageUrl ||
    item.description.length > 180 ||
    /wikipedia|wikimedia|openverse|facebook|fbcdn|lookaside|pinterest|instagram/i.test(sourceText) ||
    (!!item.imageSource && !/medic|sanitar|salud|farma|quiru|orto|herraiz|salunatur|iberomed|axa/i.test(sourceText))
  );
}

function openInitialLocationFromUrl() {
  const params = new URLSearchParams(location.search);
  const code = params.get("qr") || params.get("ubicacion");
  if (code) openLocation(code);
}

function applyStudentModeShell() {
  if (!isStudentMode()) return;
  document.body.classList.add("student-mode");
  $("#viewTitle").textContent = "Identificar material";
}
