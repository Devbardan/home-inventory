/* app.js - versión con:
   - categorías canonicales
   - edición con <select> consistente
   - columna "Unidad mínima" añadida en edición
*/

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

/* ----------------- Utilidades de categoría ----------------- */
function canonicalizeCategory(raw) {
  if (!raw && raw !== "") return "otros";
  let v = String(raw).toLowerCase().trim();
  v = v.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  v = v.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  if (v.includes("panader") && v.includes("cereal")) return "panaderia_cereales";
  if (v.includes("alimentos") && v.includes("fresco")) return "alimentos_frescos";
  if (v.includes("despensa")) return "despensa";
  if (v.includes("lacteo")) return "lacteos";
  if (v.includes("proteina") || v.includes("proteinas")) return "proteina";
  if (v.includes("aseo")) return "aseo";
  if (v.includes("limpieza") && v.includes("hogar")) return "limpieza_hogar";
  if (v.includes("bebida")) return "bebidas";
  if (v.includes("congel")) return "congelados";
  if (v.includes("agotad")) return "agotados";
  v = v.replace(/\s+/g, "_").replace(/[^\w_]/g, "");
  return v || "otros";
}

const CATEGORY_OPTIONS = [
  { key: "alimentos_frescos", label: "Alimentos Frescos" },
  { key: "panaderia_cereales", label: "Panadería y Cereales" },
  { key: "despensa", label: "Despensa" },
  { key: "lacteos", label: "Lácteos" },
  { key: "proteina", label: "Proteína" },
  { key: "aseo", label: "Aseo" },
  { key: "limpieza_hogar", label: "Limpieza Hogar" },
  { key: "bebidas", label: "Bebidas" },
  { key: "congelados", label: "Congelados" },
];

function categoryLabel(key) {
  const found = CATEGORY_OPTIONS.find((c) => c.key === key);
  return found ? found.label : (key || "").replace(/_/g, " ");
}

/* ----------------- API helpers ----------------- */
async function fetchProducts() {
  const res = await fetch("/api/products");
  return res.ok ? res.json() : [];
}
async function saveProduct(product) {
  product.category = canonicalizeCategory(product.category);
  product.original_category = product.category;
  if (!product.step && product.step !== 0) product.step = 1;
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  return res.json();
}
async function updateProduct(id, delta) {
  const res = await fetch("/api/products/update", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, delta }),
  });
  return res.ok ? res.json() : null;
}
async function updateProductEdit(product) {
  product.category = canonicalizeCategory(product.category);
  if (!product.step && product.step !== 0) product.step = 1;
  const res = await fetch("/api/products/update-edit", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  return res.ok ? res.json() : null;
}
async function updateProductCategory(id, newCategory) {
  const res = await fetch("/api/products/update-category", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, newCategory: canonicalizeCategory(newCategory) }),
  });
  return res.ok ? res.json() : null;
}
async function deleteProduct(id) {
  await fetch(`/api/products/${id}`, { method: "DELETE" });
}

/* ----------------- Helpers UI ----------------- */
function formatQuantity(product) {
  const q = Number(product.quantity || 0);
  const step = Number(product.step || 1);
  if (isNaN(q)) return "";
  if (step === 1) return String(Math.floor(q));
  return q.toFixed(2);
}

/* ----------------- Header ----------------- */
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
    nameTh.dataset.originalText = nameTh.dataset.originalText || nameTh.textContent;
    nameTh.onclick = () => {
      if (sortConfig.key === "name") sortConfig.ascending = !sortConfig.ascending;
      else { sortConfig.key = "name"; sortConfig.ascending = true; }
      renderProducts();
    };
  }
  if (qtyTh) {
    qtyTh.dataset.originalText = qtyTh.dataset.originalText || qtyTh.textContent;
    qtyTh.onclick = () => {
      if (sortConfig.key === "quantity") sortConfig.ascending = !sortConfig.ascending;
      else { sortConfig.key = "quantity"; sortConfig.ascending = true; }
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

/* ----------------- Render ----------------- */
async function renderProducts() {
  const products = await fetchProducts();
  const list = document.getElementById("product-list");
  const rawFilter = (document.getElementById("category-filter").value || "all");
  const filter = rawFilter === "all" ? "all" : canonicalizeCategory(rawFilter);
  list.innerHTML = "";
  buildTableHeader();

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

  products.forEach((product) => {
    const quantityNum = Number(product.quantity || 0);
    let currentCategory = canonicalizeCategory(product.category || product.original_category || "otros");
    if (quantityNum <= 0) currentCategory = "agotados";
    if (filter !== "all" && filter !== currentCategory) return;
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery)) return;

    const tr = document.createElement("tr");
    if (currentCategory === "agotados") {
      tr.style.backgroundColor = "#e74c3c";
      tr.style.color = "white";
    }

    if (editingProduct === product.id) {
      const nameTd = document.createElement("td");
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = product.name || "";
      nameTd.appendChild(nameInput);

      const quantityTd = document.createElement("td");
      const quantityInput = document.createElement("input");
      quantityInput.type = "number";
      quantityInput.step = "0.01";
      quantityInput.value = product.quantity;
      quantityTd.appendChild(quantityInput);

      const categoryTd = document.createElement("td");
      const categorySelect = document.createElement("select");
      CATEGORY_OPTIONS.forEach(({ key, label }) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = label;
        if (canonicalizeCategory(product.category) === key) opt.selected = true;
        categorySelect.appendChild(opt);
      });
      categoryTd.appendChild(categorySelect);

      const stepTd = document.createElement("td");
      const stepInput = document.createElement("input");
      stepInput.type = "number";
      stepInput.step = "0.01";
      stepInput.value = product.step || 1;
      stepTd.appendChild(stepInput);

      const actionsTd = document.createElement("td");
      const confirmBtn = document.createElement("button");
      confirmBtn.textContent = "✔️";
      confirmBtn.onclick = async () => {
        await updateProductEdit({
          id: product.id,
          name: nameInput.value.trim(),
          quantity: parseFloat(quantityInput.value) || 0,
          category: categorySelect.value,
          step: parseFloat(stepInput.value) || 1,
        });
        editingProduct = null;
        renderProducts();
      };
      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "❌";
      cancelBtn.onclick = () => { editingProduct = null; renderProducts(); };
      actionsTd.appendChild(confirmBtn);
      actionsTd.appendChild(cancelBtn);

      tr.appendChild(nameTd);
      tr.appendChild(quantityTd);
      tr.appendChild(categoryTd);
      tr.appendChild(stepTd);
      tr.appendChild(actionsTd);
    } else {
      const nameTd = document.createElement("td");
      if (searchQuery) {
        const regex = new RegExp(`(${searchQuery})`, "gi");
        nameTd.innerHTML = product.name.replace(regex, "<mark>$1</mark>");
      } else {
        nameTd.textContent = product.name;
      }
      const quantityTd = document.createElement("td");
      quantityTd.textContent = formatQuantity(product);

      let categoryTd = null, stepTd = null;
      if (editingProduct) {
        categoryTd = document.createElement("td");
        categoryTd.textContent = categoryLabel(currentCategory);
        stepTd = document.createElement("td");
        stepTd.textContent = product.step || 1;
      }

      const actionsTd = document.createElement("td");
      const container = document.createElement("div");
      container.classList.add("actions-container");
      const consumeBtn = document.createElement("button");
      consumeBtn.textContent = "➖";
      consumeBtn.onclick = () => consume(product);
      const addBtn = document.createElement("button");
      addBtn.textContent = "➕";
      addBtn.onclick = () => add(product);
      const editBtnDesktop = document.createElement("button");
      editBtnDesktop.textContent = "✏️";
      editBtnDesktop.classList.add("desktop-only");
      editBtnDesktop.onclick = () => { editingProduct = product.id; renderProducts(); };
      const deleteBtnDesktop = document.createElement("button");
      deleteBtnDesktop.textContent = "🗑️";
      deleteBtnDesktop.classList.add("desktop-only");
      deleteBtnDesktop.onclick = () => deleteProduct(product.id).then(renderProducts);
      const editBtnMobile = document.createElement("button");
      editBtnMobile.textContent = "✏️";
      editBtnMobile.classList.add("mobile-only");
      editBtnMobile.onclick = () => { editingProduct = product.id; renderProducts(); };
      const deleteBtnMobile = document.createElement("button");
      deleteBtnMobile.textContent = "🗑️";
      deleteBtnMobile.classList.add("mobile-only");
      deleteBtnMobile.onclick = () => deleteProduct(product.id).then(renderProducts);
      const mobileExtra = document.createElement("div");
      mobileExtra.classList.add("mobile-extra-buttons");
      mobileExtra.style.display = "none";
      mobileExtra.appendChild(editBtnMobile);
      mobileExtra.appendChild(deleteBtnMobile);
      const moreBtn = document.createElement("button");
      moreBtn.textContent = "...";
      moreBtn.classList.add("more-btn", "mobile-only");
      moreBtn.onclick = () => {
        mobileExtra.style.display = mobileExtra.style.display === "flex" ? "none" : "flex";
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
      if (stepTd) tr.appendChild(stepTd);
      tr.appendChild(actionsTd);
    }

    list.appendChild(tr);
  });
  updateHeaderIndicators();
}

/* ----------------- Acciones ----------------- */
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
    await updateProductCategory(product.id, updated.original_category || "otros");
  }
  renderProducts();
}

/* ----------------- Exportar agotados ----------------- */
async function exportAgotados() {
  const products = await fetchProducts();
  const agotados = products.filter(
    (p) => (typeof p.quantity === "number" && Number(p.quantity) <= 0) ||
           (p.category && canonicalizeCategory(p.category) === "agotados")
  );
  const alertBox = document.getElementById("alert-box");
  if (!agotados || agotados.length === 0) {
    if (alertBox) {
      alertBox.textContent = "No hay productos agotados";
      alertBox.style.display = "block";
      setTimeout(() => (alertBox.style.display = "none"), 3000);
    } else { alert("No hay productos agotados"); }
    return;
  }
  let message = "🛒 Productos agotados:\n\n";
  agotados.forEach((p) => (message += `- ${p.name}\n`));
  if (navigator.share) {
    try { await navigator.share({ title: "Productos agotados", text: message }); }
    catch (err) { console.log("Share cancelado o falló", err); }
  } else {
    window.open("https://wa.me/?text=" + encodeURIComponent(message), "_blank");
  }
}

/* ----------------- Formularios ----------------- */
document.getElementById("add-product-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  const name = document.getElementById("product-name").value.trim();
  const quantity = parseFloat(document.getElementById("product-quantity").value) || 0;
  const rawCategory = document.getElementById("product-category").value || "";
  const category = canonicalizeCategory(rawCategory);
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
const exportBtn = document.getElementById("exportAgotadosBtn");
if (exportBtn) exportBtn.addEventListener("click", exportAgotados);

/* ----------------- Inicial ----------------- */
renderProducts();
