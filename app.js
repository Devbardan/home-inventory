/* app.js con soporte para decimales y step */

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

// ===== API helpers =====
async function fetchProducts() {
  const res = await fetch("/api/products");
  return res.json();
}

async function saveProduct(product) {
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
  return res.json();
}

async function updateProductEdit(product) {
  const res = await fetch("/api/products/update-edit", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  return res.json();
}

async function deleteProduct(id) {
  await fetch(`/api/products/${id}`, { method: "DELETE" });
}

// ===== Render =====
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
      // Nombre
      const nameTd = document.createElement("td");
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = product.name;
      nameTd.appendChild(nameInput);

      // Cantidad
      const quantityTd = document.createElement("td");
      const quantityInput = document.createElement("input");
      quantityInput.type = "number";
      quantityInput.step = "0.01";
      quantityInput.value = product.quantity;
      quantityTd.appendChild(quantityInput);

      // Categoría
      const categoryTd = document.createElement("td");
      const categoryInput = document.createElement("input");
      categoryInput.type = "text";
      categoryInput.value = product.category;
      categoryTd.appendChild(categoryInput);

      // Step
      const stepTd = document.createElement("td");
      const stepInput = document.createElement("input");
      stepInput.type = "number";
      stepInput.step = "0.01";
      stepInput.value = product.step || 1;
      stepTd.appendChild(stepInput);

      // Acciones
      const actionsTd = document.createElement("td");
      const confirmBtn = document.createElement("button");
      confirmBtn.textContent = "✔️";
      confirmBtn.onclick = async () => {
        await updateProductEdit({
          id: product.id,
          name: nameInput.value.trim(),
          quantity: parseFloat(quantityInput.value) || 0,
          category: categoryInput.value.trim().toLowerCase(),
          step: parseFloat(stepInput.value) || 1,
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
      const nameTd = document.createElement("td");
      nameTd.textContent = product.name;

      const quantityTd = document.createElement("td");
      quantityTd.textContent = product.quantity;

      let categoryTd = null;
      if (editingProduct) {
        categoryTd = document.createElement("td");
        categoryTd.textContent = currentCategory.replace(/_/g, " ");
      }

      const actionsTd = document.createElement("td");
      const consumeBtn = document.createElement("button");
      consumeBtn.textContent = "➖";
      consumeBtn.onclick = () => consume(product);

      const addBtn = document.createElement("button");
      addBtn.textContent = "➕";
      addBtn.onclick = () => add(product);

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.onclick = () => {
        editingProduct = product.id;
        renderProducts();
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";
      deleteBtn.onclick = () => {
        deleteProduct(product.id).then(renderProducts);
      };

      actionsTd.appendChild(consumeBtn);
      actionsTd.appendChild(addBtn);
      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(deleteBtn);

      tr.appendChild(nameTd);
      tr.appendChild(quantityTd);
      if (categoryTd) tr.appendChild(categoryTd);
      tr.appendChild(actionsTd);
    }

    list.appendChild(tr);
  });

  updateHeaderIndicators();
}

// ===== Acciones =====
async function consume(product) {
  const updated = await updateProduct(product.id, -product.step);
  if (updated && updated.quantity <= 0) {
    await fetch("/api/products/update-category", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id, newCategory: "agotados" }),
    });
  }
  renderProducts();
}

async function add(product) {
  const updated = await updateProduct(product.id, product.step);
  if (updated && updated.quantity > 0 && updated.category === "agotados") {
    await fetch("/api/products/update-category", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: product.id,
        newCategory: updated.original_category,
      }),
    });
  }
  renderProducts();
}

// ===== Formularios =====
document
  .getElementById("add-product-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = document.getElementById("product-name").value.trim();
    const quantity =
      parseFloat(document.getElementById("product-quantity").value) || 0;
    const category =
      document.getElementById("product-category").value.trim().toLowerCase() ||
      "otros";
    const step =
      parseFloat(document.getElementById("product-step")?.value) || 1;

    await saveProduct({ name, quantity, category, step });
    renderProducts();
    this.reset();
    searchQuery = "";
  });

document
  .getElementById("product-name")
  .addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderProducts();
  });

document
  .getElementById("category-filter")
  .addEventListener("change", renderProducts);

document.getElementById("addProductBtn").addEventListener("click", () => {
  document.getElementById("add-product-form").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

renderProducts();
