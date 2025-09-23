/* app.js (corrección: normalización de categorías + edición con <select>) */

let searchQuery = "";
let sortConfig = { key: null, ascending: true };
let editingProduct = null;

const MOBILE_BREAKPOINT = 600;
let wasMobile = window.innerWidth <= MOBILE_BREAKPOINT;
window.addEventListener("resize", () => {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  if (isMobile !== wasMobile) {
    wasMobile = isMobile;
    renderProducts();
  }
});

/* ---------------- Helpers ---------------- */

// Normaliza cualquier texto de categoría a la forma usada internamente:
// - minúsculas
// - guiones/espacios => underscore
// - elimina caracteres extra
function normalizeCategory(value) {
  if (!value) return "otros";
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, ""); // quitar caracteres no alfanuméricos (salvo _)
}

// Lista canónica de categorías (clave, etiqueta para mostrar)
// Usa claves normalizadas en `key` y etiquetas legibles en `label`
const CATEGORY_LIST = [
  { key: "alimentos_frescos", label: "Alimentos Frescos" },
  { key: "panaderia_cereales", label: "Panadería y Cereales" },
  { key: "despensa", label: "Despensa" },
  { key: "lacteos", label: "Lácteos" },
  { key: "proteina", label: "Proteína" },
  { key: "aseo", label: "Aseo" },
  { key: "limpieza_hogar", label: "Limpieza Hogar" },
  { key: "bebidas", label: "Bebidas" },
  { key: "congelados", label: "Congelados" },
  { key: "otros", label: "Otros" },
  { key: "agotados", label: "Agotados" },
];

// Formatea la cantidad para mostrar: si step === 1 -> entero; si step < 1 -> 2 decimales
function formatQuantity(product) {
  if (!product) return "";
  const q = Number(product.quantity);
  const step = Number(product.step || 1);
  if (isNaN(q)) return "";
  if (step === 1) return String(Math.floor(q)); // mostrar entero
  // si es entero pero step != 1, mostrar con 2 decimales (ej 1.50)
  return q.toFixed(2);
}

/* ---------------- API helpers ---------------- */

async function fetchProducts() {
  const res = await fetch("/api/products");
  return res.ok ? res.json() : [];
}

async function saveProduct(product) {
  // Normalizar categoría antes de enviar
  product.category = normalizeCategory(product.category);
  // mantener original_category igual
  product.original_category = product.category;
  if (!product.step) product.step = 1;

  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  return res.json();
}

// Actualiza sumando delta (puede ser decimal). Backend espera { id, delta } en /api/products/update
async function updateProduct(id, delta) {
  const res = await fetch("/api/products/update", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, delta }),
  });
  return res.ok ? res.json() : null;
}

// Actualiza edición completa (backend: /api/products/update-edit)
async function updateProductEdit(product) {
  // asegúrate que la categoría esté normalizada
  product.category = normalizeCategory(product.category);
  if (!product.step) product.step = 1;
  const res = await fetch("/api/products/update-edit", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  return res.ok ? res.json() : null;
}

// Actualiza solo categoría (ruta /api/products/update-category)
async function updateProductCategory(id, newCategory) {
  const res = await fetch("/api/products/update-category", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, newCategory: normalizeCategory(newCategory) }),
  });
  return res.ok ? res.json() : null;
}

async function deleteProduct(id) {
  await fetch(`/api/products/${id}`, { method: "DELETE" });
}

/* ---------------- UI: encabezado / orden ---------------- */

function buildTableHeader() {
  const tableHeadRow = document.querySelector("#product-table thead tr");
  if (editingProduct) {
    tableHeadRow.innerHTML = `
      <th data-key="name">Producto</th>
      <th data-key="quantity">Cantidad</th>
      <th data-key="category">Categoría</th>
      <th data-key="step">Unidad mínima</th>
      <th>Acciones</th>
    `;
  } else {
    tableHeadRow.innerHTML = `
      <th data-key="name">Producto</th>
      <th data-key="quantity">Cantidad</th>
      <th>Acciones</th>
    `;
  }

  const nameTh = tableHeadRow.querySelector('th[data-key="name"]');
  const qtyTh = tableHeadRow.querySelector('th[data-key="quantity"]');

  if (nameTh) {
    nameTh.dataset.originalText =
      nameTh.dataset.originalText || nameTh.textContent;
    nameTh.onclick = () => {
      if (sortConfig.key === "name") sortConfig.ascending = !sortConfig.ascending;
      else {
        sortConfig.key = "name";
        sortConfig.ascending = true;
      }
      renderProducts();
    };
  }
  if (qtyTh) {
    qtyTh.dataset.originalText =
      qtyTh.dataset.originalText || qtyTh.textContent;
    qtyTh.onclick = () => {
      if (sortConfig.key === "quantity")
        sortConfig.ascending = !sortConfig.ascending;
      else {
        sortConfig.key = "quantity";
        sortConfig.ascending = true;
      }
      renderProducts();
    };
  }
}

function updateHeaderIndicators() {
  const nameTh = document.querySelector('#product-table thead th[data-key="name"]');
  const qtyTh = document.querySelector('#product-table thead th[data-key="quantity"]');
  if (nameTh) nameTh.textContent = nameTh.dataset.originalText || nameTh.textContent;
  if (qtyTh) qtyTh.textContent = qtyTh.dataset.originalText || qtyTh.textContent;

  if (sortConfig.key) {
    const th = sortConfig.key === "name" ? nameTh : qtyTh;
    if (th) th.textContent += sortConfig.ascending ? " ▲" : " ▼";
  }
}

/* ---------------- Render listado ---------------- */

async function renderProducts() {
  const products = await fetchProducts();
  const list = document.getElementById("product-list");
  const filter = (document.getElementById("category-filter").value || "all").toLowerCase();

  list.innerHTML = "";
  buildTableHeader();

  // ordenar
  if (sortConfig.key) {
    products.sort((a, b) => {
      let valA, valB;
      if (sortConfig.key === "name") {
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
      } else {
        valA = Number(a.quantity || 0);
        valB = Number(b.quantity || 0);
      }
      if (valA < valB) return sortConfig.ascending ? -1 : 1;
      if (valA > valB) return sortConfig.ascending ? 1 : -1;
      return 0;
    });
  }

  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

  products.forEach((product) => {
    // currentCategory (considera si quantity <= 0 => agotados)
    let currentCategory = product.category || "otros";
    if (Number(product.quantity) <= 0) currentCategory = "agotados";

    if (filter !== "all" && filter !== currentCategory.toLowerCase()) return;
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery)) return;

    const tr = document.createElement("tr");
    if (currentCategory === "agotados") {
      tr.style.backgroundColor = "#e74c3c";
      tr.style.color = "white";
    }

    // ---- Modo edición para este producto ----
    if (editingProduct === product.id) {
      // Nombre
      const nameTd = document.createElement("td");
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = product.name || "";
      nameTd.appendChild(nameInput);

      // Cantidad
      const quantityTd = document.createElement("td");
      const quantityInput = document.createElement("input");
      quantityInput.type = "number";
      quantityInput.step = "0.01";
      quantityInput.value = product.quantity || 0;
      quantityTd.appendChild(quantityInput);

      // Categoría -> SELECT (valores normalizados)
      const categoryTd = document.createElement("td");
      const categorySelect = document.createElement("select");
      CATEGORY_LIST.forEach(({ key, label }) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = label;
        if ((product.category || "").toLowerCase() === key) opt.selected = true;
        categorySelect.appendChild(opt);
      });
      categoryTd.appendChild(categorySelect);

      // Step
      const stepTd = document.createElement("td");
      const stepInput = document.createElement("input");
      stepInput.type = "number";
      stepInput.step = "0.01";
      stepInput.value = product.step || 1;
      stepTd.appendChild(stepInput);

      // Acciones: confirmar / cancelar
      const actionsTd = document.createElement("td");
      const confirmBtn = document.createElement("button");
      confirmBtn.textContent = "✔️";
      confirmBtn.onclick = async () => {
        const newName = nameInput.value.trim();
        const newQuantity = parseFloat(quantityInput.value) || 0;
        const newCategory = categorySelect.value; // ya es normalized key
        const newStep = parseFloat(stepInput.value) || 1;

        await updateProductEdit({
          id: product.id,
          name: newName,
          quantity: newQuantity,
          category: newCategory,
          step: newStep,
        });

        editingProduct = null;
        renderProducts();
      };

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "❌";
      cancelBtn.onclick = () => {
        editingProduct = null;
        renderProducts();
      };

      actionsTd.appendChild(confirmBtn);
      actionsTd.appendChild(cancelBtn);

      tr.appendChild(nameTd);
      tr.appendChild(quantityTd);
      tr.appendChild(categoryTd);
      tr.appendChild(stepTd);
      tr.appendChild(actionsTd);
    } else {
      // ---- Fila normal ----
      const nameTd = document.createElement("td");
      if (searchQuery) {
        const regex = new RegExp(`(${searchQuery})`, "gi");
        nameTd.innerHTML = product.name.replace(regex, "<mark>$1</mark>");
      } else {
        nameTd.textContent = product.name;
      }

      const quantityTd = document.createElement("td");
      quantityTd.textContent = formatQuantity(product);

      // si estamos en modo edición (global), mostramos categoría de texto en todas las filas
      let categoryTd = null;
      if (editingProduct) {
        categoryTd = document.createElement("td");
        categoryTd.textContent = (currentCategory || "otros").replace(/_/g, " ");
      }

      // Acciones (responsive)
      const actionsTd = document.createElement("td");
      const container = document.createElement("div");
      container.classList.add("actions-container");

      // Siempre visibles: consumir / añadir
      const consumeBtn = document.createElement("button");
      consumeBtn.textContent = "➖";
      consumeBtn.onclick = () => consume(product);

      const addBtn = document.createElement("button");
      addBtn.textContent = "➕";
      addBtn.onclick = () => add(product);

      // Desktop buttons (siempre visibles en desktop)
      const editBtnDesktop = document.createElement("button");
      editBtnDesktop.textContent = "✏️";
      editBtnDesktop.classList.add("desktop-only");
      editBtnDesktop.onclick = () => {
        editingProduct = product.id;
        renderProducts();
      };

      const deleteBtnDesktop = document.createElement("button");
      deleteBtnDesktop.textContent = "🗑️";
      deleteBtnDesktop.classList.add("desktop-only");
      deleteBtnDesktop.onclick = () => {
        deleteProduct(product.id).then(renderProducts);
      };

      // Mobile extras (ocultos por defecto)
      const editBtnMobile = document.createElement("button");
      editBtnMobile.textContent = "✏️";
      editBtnMobile.classList.add("mobile-only");
      editBtnMobile.onclick = () => {
        editingProduct = product.id;
        renderProducts();
      };

      const deleteBtnMobile = document.createElement("button");
      deleteBtnMobile.textContent = "🗑️";
      deleteBtnMobile.classList.add("mobile-only");
      deleteBtnMobile.onclick = () => {
        deleteProduct(product.id).then(renderProducts);
      };

      const mobileExtra = document.createElement("div");
      mobileExtra.classList.add("mobile-extra-buttons");
      mobileExtra.style.display = "none";
      mobileExtra.appendChild(editBtnMobile);
      mobileExtra.appendChild(deleteBtnMobile);

      const moreBtn = document.createElement("button");
      moreBtn.textContent = "...";
      moreBtn.classList.add("more-btn", "mobile-only");
      moreBtn.onclick = () => {
        mobileExtra.style.display =
          mobileExtra.style.display === "flex" ? "none" : "flex";
      };

      container.appendChild(consumeBtn);
      container.appendChild(addBtn);
      container.appendChild(editBtnDesktop);
      container.appendChild(deleteBtnDesktop);
      container.appendChild(moreBtn);
      container.appendChild(mobileExtra);

      actionsTd.appendChild(container);

      tr.appendChild(nameTd);
      tr.appendChild(quantityTd);
      if (categoryTd) tr.appendChild(categoryTd);
      tr.appendChild(actionsTd);
    }

    list.appendChild(tr);
  });

  updateHeaderIndicators();
}

/* ---------------- Acciones rápidas ---------------- */

async function consume(product) {
  const step = Number(product.step || 1);
  const updated = await updateProduct(product.id, -step);
  if (updated && Number(updated.quantity) <= 0) {
    await updateProductCategory(product.id, "agotados");
  }
  renderProducts();
}

async function add(product) {
  const step = Number(product.step || 1);
  const updated = await updateProduct(product.id, step);
  if (updated && Number(updated.quantity) > 0 && updated.category === "agotados") {
    // restaurar original_category (backend guarda original_category si existe)
    await updateProductCategory(product.id, updated.original_category || "otros");
  }
  renderProducts();
}

/* ---------------- Exportar agotados ---------------- */

async function exportAgotados() {
  const products = await fetchProducts();

  const agotados = products.filter(
    (p) =>
      (typeof p.quantity === "number" && Number(p.quantity) <= 0) ||
      (p.category && p.category.toLowerCase() === "agotados")
  );

  const alertBox = document.getElementById("alert-box");

  if (!agotados || agotados.length === 0) {
    alertBox.textContent = "No hay productos agotados";
    alertBox.style.display = "block";
    setTimeout(() => (alertBox.style.display = "none"), 3000);
    return;
  }

  let message = "🛒 Productos agotados:\n\n";
  agotados.forEach((p) => {
    message += `- ${p.name}\n`;
  });

  if (navigator.share) {
    try {
      await navigator.share({ title: "Productos agotados", text: message });
    } catch (err) {
      console.log("Share cancelado o falló", err);
    }
  } else {
    const url = "https://wa.me/?text=" + encodeURIComponent(message);
    window.open(url, "_blank");
  }
}

/* ---------------- Formularios / listeners ---------------- */

document.getElementById("add-product-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  const name = document.getElementById("product-name").value.trim();
  const quantity = parseFloat(document.getElementById("product-quantity").value) || 0;
  // Normalizamos lo que venga del formulario (por si las values del <select> no están normalizadas)
  const rawCategory = document.getElementById("product-category").value || "";
  const category = normalizeCategory(rawCategory);
  const step = parseFloat(document.getElementById("product-step")?.value) || 1;

  await saveProduct({ name, quantity, category, step });
  renderProducts();
  this.reset();
  searchQuery = "";
});

document.getElementById("product-name").addEventListener("input", (e) => {
  searchQuery = e.target.value.toLowerCase();
  renderProducts();
});

document.getElementById("category-filter").addEventListener("change", renderProducts);

document.getElementById("addProductBtn").addEventListener("click", () => {
  document.getElementById("add-product-form").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("exportAgotadosBtn").addEventListener("click", exportAgotados);

/* ---------------- Inicializar ---------------- */
renderProducts();
