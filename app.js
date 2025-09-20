/* app.js - versión corregida y responsive:
   - edición con columna "Categoría" solo cuando editingProduct != null
   - todos los productos muestran categoría en modo edición (texto), fila editada muestra select
   - responsive: móvil muestra ➖ ➕ + "..." y al pulsar "..." aparecen ✏️ 🗑️
   - ordenación por nombre / cantidad restaurada y robusta
*/

let searchQuery = ""; // búsqueda en tiempo real
let sortConfig = { key: null, ascending: true }; // orden
let editingProduct = null; // nombre del producto en edición

// Umbral móvil
const MOBILE_BREAKPOINT = 600;
let wasMobile = window.innerWidth <= MOBILE_BREAKPOINT;

// Re-render cuando se cruza el breakpoint (evita re-render en cada resize)
window.addEventListener("resize", () => {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  if (isMobile !== wasMobile) {
    wasMobile = isMobile;
    renderProducts();
  }
});

async function fetchProducts() {
  const res = await fetch("/products");
  return res.json();
}

async function saveProduct(product) {
  let category = (product.category || "otros")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/ /g, "_");
  product.category = category;
  product.originalCategory = category;

  const res = await fetch("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  return res.json();
}

async function updateProduct(name, delta) {
  const res = await fetch("/products/update", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, delta }),
  });
  return res.json();
}

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

  // añadir listeners de orden (siempre reasignamos para los elements actuales)
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

  // Header dinámico y listeners de sort
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

    // === Si esta fila está en edición ===
    if (editingProduct === product.name) {
      // Nombre (input)
      const nameTd = document.createElement("td");
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = product.name;
      nameInput.classList.add("inline-input");
      nameTd.appendChild(nameInput);

      // Cantidad (input)
      const quantityTd = document.createElement("td");
      const quantityInput = document.createElement("input");
      quantityInput.type = "number";
      quantityInput.min = 0;
      quantityInput.value = product.quantity;
      quantityInput.classList.add("inline-input", "inline-number");
      quantityTd.appendChild(quantityInput);

      // Categoría (select)
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

      // Acciones: confirmar / cancelar
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

        await fetch("/products/update-edit", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oldName: product.name,
            name: newName,
            quantity: newQuantity,
            category: newCategory,
          }),
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
      // === Fila normal (no edición) ===
      const nameTd = document.createElement("td");
      if (searchQuery) {
        const regex = new RegExp(`(${searchQuery})`, "gi");
        nameTd.innerHTML = product.name.replace(regex, "<mark>$1</mark>");
      } else {
        nameTd.textContent = product.name;
      }

      const quantityTd = document.createElement("td");
      quantityTd.textContent = product.quantity;

      // Si estamos en modo edición global (editingProduct != null),
      // mostramos la columna categoría en texto para todas las filas.
      let categoryTd = null;
      if (editingProduct) {
        categoryTd = document.createElement("td");
        categoryTd.textContent = currentCategory.replace(/_/g, " ");
      }

      // === Acciones con lógica móvil ===
      const actionsTd = document.createElement("td");
      const container = document.createElement("div");
      container.classList.add("actions-container");

      // Botones comunes
      const consumeBtn = document.createElement("button");
      consumeBtn.textContent = "➖";
      consumeBtn.classList.add("consume");
      consumeBtn.onclick = () => consume(product.name);

      const addBtn = document.createElement("button");
      addBtn.textContent = "➕";
      addBtn.classList.add("add");
      addBtn.onclick = () => add(product.name);

      // Botones de escritorio (siempre visibles en desktop)
      const editBtnDesktop = document.createElement("button");
      editBtnDesktop.textContent = "✏️";
      editBtnDesktop.classList.add("edit", "desktop-only");
      editBtnDesktop.onclick = () => {
        editingProduct = product.name;
        renderProducts();
      };

      const deleteBtnDesktop = document.createElement("button");
      deleteBtnDesktop.textContent = "🗑️";
      deleteBtnDesktop.classList.add("delete", "desktop-only");
      deleteBtnDesktop.onclick = () => deleteProduct(product.name);

      // Botones móviles (están en el panel desplegable)
      const editBtnMobile = document.createElement("button");
      editBtnMobile.textContent = "✏️";
      editBtnMobile.classList.add("edit", "mobile-only");
      editBtnMobile.onclick = () => {
        editingProduct = product.name;
        renderProducts();
      };

      const deleteBtnMobile = document.createElement("button");
      deleteBtnMobile.textContent = "🗑️";
      deleteBtnMobile.classList.add("delete", "mobile-only");
      deleteBtnMobile.onclick = () => deleteProduct(product.name);

      // Panel móvil oculto inicialmente
      const mobileExtra = document.createElement("div");
      mobileExtra.classList.add("mobile-extra-buttons");
      mobileExtra.style.display = "none";
      mobileExtra.appendChild(editBtnMobile);
      mobileExtra.appendChild(deleteBtnMobile);

      // Botón "..." solo visible en móvil (CSS controla visibilidad)
      const moreBtn = document.createElement("button");
      moreBtn.textContent = "...";
      moreBtn.classList.add("more-btn", "mobile-only");
      moreBtn.onclick = () => {
        mobileExtra.style.display =
          mobileExtra.style.display === "flex" ? "none" : "flex";
      };

      // Construcción container: en desktop show all buttons (consume/add/edit/delete)
      // in mobile CSS will hide desktop-only and show mobile-only; mobileExtra is toggled by moreBtn
      container.appendChild(consumeBtn);
      container.appendChild(addBtn);

      // Desktop buttons
      container.appendChild(editBtnDesktop);
      container.appendChild(deleteBtnDesktop);

      // Mobile extras
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

// Consumir producto
async function consume(name) {
  const updated = await updateProduct(name, -1);
  if (updated.quantity === 0) {
    await fetch("/products/update-category", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, newCategory: "agotados" }),
    });
  }
  renderProducts();
}

// Reponer
async function add(name) {
  const updated = await updateProduct(name, +1);
  if (updated.quantity > 0 && updated.category === "agotados") {
    await fetch("/products/update-category", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, newCategory: updated.originalCategory }),
    });
  }
  renderProducts();
}

// Eliminar
async function deleteProduct(name) {
  await fetch(`/products/${name}`, { method: "DELETE" });
  renderProducts();
}

// Búsqueda en tiempo real (form)
const productNameInput = document.getElementById("product-name");
productNameInput.addEventListener("input", (e) => {
  searchQuery = e.target.value.toLowerCase();
  renderProducts();
});

// Agregar producto (form)
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

// Filtro de categorias
document
  .getElementById("category-filter")
  .addEventListener("change", renderProducts);

// Orden - inicial: asignamos originalText si existen
// (buildTableHeader se encarga de poner listeners y originalText cada render)

// Botón flotante -> scroll al formulario
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
    // Mostrar alerta
    alertBox.textContent = "No hay productos agotados";
    alertBox.style.display = "block";

    setTimeout(() => {
      alertBox.style.display = "none";
    }, 3000);

    return;
  }

  // Crear mensaje
  let message = "🛒 *Productos agotados:*\n";
  agotados.forEach((p) => {
    message += `- ${p.name}\n`;
  });

  // Compartir nativo (si existe)
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Productos agotados",
        text: message,
      });
    } catch (err) {
      console.log("Share cancelado o falló", err);
    }
  } else {
    // Fallback: abrir WhatsApp Web
    const url = "https://wa.me/?text=" + encodeURIComponent(message);
    window.open(url, "_blank");
  }
}

// Listener botón exportar
document
  .getElementById("exportAgotadosBtn")
  .addEventListener("click", exportAgotados);

// Primera carga
renderProducts();
