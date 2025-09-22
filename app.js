/* app.js - versión conectada a API Postgres:
   - Mantiene búsqueda, ordenación, edición, responsive y exportar
   - Ahora usa /api/products (GET, POST, PUT, DELETE)
   - Se usa id como identificador en vez de name
*/

let searchQuery = ""; // búsqueda en tiempo real
let sortConfig = { key: null, ascending: true }; // orden
let editingProduct = null; // id del producto en edición

// Umbral móvil
const MOBILE_BREAKPOINT = 600;
let wasMobile = window.innerWidth <= MOBILE_BREAKPOINT;

// Re-render cuando se cruza el breakpoint
window.addEventListener("resize", () => {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  if (isMobile !== wasMobile) {
    wasMobile = isMobile;
    renderProducts();
  }
});

// === API ===
async function fetchProducts() {
  const res = await fetch("/api/products");
  return res.json();
}

async function saveProduct(product) {
  let category = (product.category || "otros")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/ /g, "_");
  product.category = category;
  product.original_category = category;

  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  return res.json();
}

async function updateProduct(id, delta) {
  const products = await fetchProducts();
  const product = products.find((p) => p.id === id);
  if (!product) return null;

  const updated = {
    ...product,
    quantity: (product.quantity || 0) + delta,
  };

  const res = await fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updated),
  });
  return res.json();
}

async function updateProductEdit(id, updatedProduct) {
  const res = await fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedProduct),
  });
  return res.json();
}

async function deleteProduct(id) {
  await fetch(`/api/products/${id}`, { method: "DELETE" });
  renderProducts();
}

// === Renderizado ===
function buildTableHeader() {
  const tableHeadRow = document.querySelector("#product-table thead tr");
  if (editingProduct) {
    tableHeadRow.innerHTML = `
      <th data-key="name">Producto</th>
      <th data-key="quantity">Cantidad</th>
      <th data-key="category">Categoría</th>
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
      if (sortConfig.key === "name")
        sortConfig.ascending = !sortConfig.ascending;
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
  const nameTh = document.querySelector(
    '#product-table thead th[data-key="name"]'
  );
  const qtyTh = document.querySelector(
    '#product-table thead th[data-key="quantity"]'
  );
  if (nameTh)
    nameTh.textContent = nameTh.dataset.originalText || nameTh.textContent;
  if (qtyTh)
    qtyTh.textContent = qtyTh.dataset.originalText || qtyTh.textContent;

  if (sortConfig.key && (nameTh || qtyTh)) {
    const th = sortConfig.key === "name" ? nameTh : qtyTh;
    if (th) th.textContent += sortConfig.ascending ? " ▲" : " ▼";
  }
}

async function renderProducts() {
  const products = await fetchProducts();
  const list = document.getElementById("product-list");
  const filter = document.getElementById("category-filter").value.toLowerCase();

  list.innerHTML = "";
  buildTableHeader();

  // Ordenar
  if (sortConfig.key) {
    products.sort((a, b) => {
      let valA, valB;
      if (sortConfig.key === "name") {
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
      } else if (sortConfig.key === "quantity") {
        valA = a.quantity || 0;
        valB = b.quantity || 0;
      }
      if (valA < valB) return sortConfig.ascending ? -1 : 1;
      if (valA > valB) return sortConfig.ascending ? 1 : -1;
      return 0;
    });
  }

  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

  products.forEach((product) => {
    let currentCategory = product.category || "otros";
    if (product.quantity <= 0) currentCategory = "agotados";

    if (filter !== "all" && filter !== currentCategory.toLowerCase()) return;
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery))
      return;

    const tr = document.createElement("tr");
    if (currentCategory === "agotados") {
      tr.style.backgroundColor = "#e74c3c";
      tr.style.color = "white";
    }

    if (editingProduct === product.id) {
      // === Fila en edición ===
      const nameTd = document.createElement("td");
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = product.name;
      nameInput.classList.add("inline-input");
      nameTd.appendChild(nameInput);

      const quantityTd = document.createElement("td");
      const quantityInput = document.createElement("input");
      quantityInput.type = "number";
      quantityInput.min = 0;
      quantityInput.value = product.quantity;
      quantityInput.classList.add("inline-input", "inline-number");
      quantityTd.appendChild(quantityInput);

      const categoryTd = document.createElement("td");
      const categorySelect = document.createElement("select");
      categorySelect.classList.add("inline-select");
      const categories = [
        "Alimentos Frescos",
        "Panaderia y Cereales",
        "Despensa",
        "Lacteos",
        "Proteina",
        "Aseo",
        "Limpieza Hogar",
        "Otros",
      ];
      categories.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.toLowerCase().replace(/ /g, "_");
        option.textContent = cat;
        if (option.value === product.category) option.selected = true;
        categorySelect.appendChild(option);
      });
      categoryTd.appendChild(categorySelect);

      const actionsTd = document.createElement("td");
      const confirmBtn = document.createElement("button");
      confirmBtn.textContent = "✔️";
      confirmBtn.classList.add("confirm");
      confirmBtn.onclick = async () => {
        const newName = nameInput.value.trim();
        const newQuantity = parseInt(quantityInput.value, 10) || 0;
        const newCategory = (categorySelect.value || "otros")
          .trim()
          .toLowerCase()
          .replace(/ /g, "_");

        await updateProductEdit(product.id, {
          name: newName,
          quantity: newQuantity,
          category: newCategory,
          original_category: product.original_category,
        });

        editingProduct = null;
        renderProducts();
      };

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "❌";
      cancelBtn.classList.add("cancel");
      cancelBtn.onclick = () => {
        editingProduct = null;
        renderProducts();
      };

      actionsTd.appendChild(confirmBtn);
      actionsTd.appendChild(cancelBtn);

      tr.appendChild(nameTd);
      tr.appendChild(quantityTd);
      tr.appendChild(categoryTd);
      tr.appendChild(actionsTd);
    } else {
      // === Fila normal ===
      const nameTd = document.createElement("td");
      if (searchQuery) {
        const regex = new RegExp(`(${searchQuery})`, "gi");
        nameTd.innerHTML = product.name.replace(regex, "<mark>$1</mark>");
      } else {
        nameTd.textContent = product.name;
      }

      const quantityTd = document.createElement("td");
      quantityTd.textContent = product.quantity;

      let categoryTd = null;
      if (editingProduct) {
        categoryTd = document.createElement("td");
        categoryTd.textContent = currentCategory.replace(/_/g, " ");
      }

      const actionsTd = document.createElement("td");
      const container = document.createElement("div");
      container.classList.add("actions-container");

      const consumeBtn = document.createElement("button");
      consumeBtn.textContent = "➖";
      consumeBtn.classList.add("consume");
      consumeBtn.onclick = () => consume(product.id);

      const addBtn = document.createElement("button");
      addBtn.textContent = "➕";
      addBtn.classList.add("add");
      addBtn.onclick = () => add(product.id);

      const editBtnDesktop = document.createElement("button");
      editBtnDesktop.textContent = "✏️";
      editBtnDesktop.classList.add("edit", "desktop-only");
      editBtnDesktop.onclick = () => {
        editingProduct = product.id;
        renderProducts();
      };

      const deleteBtnDesktop = document.createElement("button");
      deleteBtnDesktop.textContent = "🗑️";
      deleteBtnDesktop.classList.add("delete", "desktop-only");
      deleteBtnDesktop.onclick = () => deleteProduct(product.id);

      const editBtnMobile = document.createElement("button");
      editBtnMobile.textContent = "✏️";
      editBtnMobile.classList.add("edit", "mobile-only");
      editBtnMobile.onclick = () => {
        editingProduct = product.id;
        renderProducts();
      };

      const deleteBtnMobile = document.createElement("button");
      deleteBtnMobile.textContent = "🗑️";
      deleteBtnMobile.classList.add("delete", "mobile-only");
      deleteBtnMobile.onclick = () => deleteProduct(product.id);

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

// === Acciones rápidas ===
async function consume(id) {
  const updated = await updateProduct(id, -1);
  if (updated && updated.quantity === 0) {
    await updateProductEdit(id, { ...updated, category: "agotados" });
  }
  renderProducts();
}

async function add(id) {
  const updated = await updateProduct(id, +1);
  if (updated && updated.quantity > 0 && updated.category === "agotados") {
    await updateProductEdit(id, {
      ...updated,
      category: updated.original_category,
    });
  }
  renderProducts();
}

// === Búsqueda y agregar ===
const productNameInput = document.getElementById("product-name");
productNameInput.addEventListener("input", (e) => {
  searchQuery = e.target.value.toLowerCase();
  renderProducts();
});

document
  .getElementById("add-product-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = productNameInput.value.trim();
    const quantity =
      parseInt(document.getElementById("product-quantity").value, 10) || 0;
    const categoryInput =
      document.getElementById("product-category").value || "";
    let category = categoryInput
      .trim()
      .toLowerCase()
      .replace(/ /g, "_")
      .replace(/-/g, "_");
    if (!category) category = "otros";

    await saveProduct({ name, quantity, category });
    renderProducts();
    this.reset();
    searchQuery = "";
  });

// === Filtro y botones extra ===
document
  .getElementById("category-filter")
  .addEventListener("change", renderProducts);

document.getElementById("addProductBtn").addEventListener("click", () => {
  document.getElementById("add-product-form").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

// Exportar productos agotados
async function exportAgotados() {
  const products = await fetchProducts();
  const agotados = products.filter(
    (p) => p.category === "agotados" || p.quantity <= 0
  );

  const alertBox = document.getElementById("alert-box");

  if (agotados.length === 0) {
    alertBox.textContent = "No hay productos agotados";
    alertBox.style.display = "block";
    setTimeout(() => (alertBox.style.display = "none"), 3000);
    return;
  }

  let message = "🛒 *Productos agotados:*\n";
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

document
  .getElementById("exportAgotadosBtn")
  .addEventListener("click", exportAgotados);

// === Inicializar ===
renderProducts();
