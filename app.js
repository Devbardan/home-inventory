async function fetchProducts() {
  const res = await fetch("/products");
  const data = await res.json();
  return data;
}

async function saveProduct(product) {
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
    body: JSON.stringify({ name, delta }), // delta puede ser +1 (reponer) o -1 (consumir)
  });
  return res.json();
}

async function renderProducts() {
  const products = await fetchProducts();
  const list = document.getElementById("product-list");
  list.innerHTML = ""; // Limpiar la tabla

  products.forEach((product) => {
    const tr = document.createElement("tr");

    // Si la cantidad es 0 o menor, cambiar el estilo de la fila
    if (product.quantity <= 0) {
      tr.style.backgroundColor = "#e74c3c"; // Fondo rojo
      tr.style.color = "white"; // Texto blanco
    }

    // Columna: Nombre del producto
    const nameTd = document.createElement("td");
    nameTd.textContent = product.name;

    // Columna: Cantidad
    const quantityTd = document.createElement("td");
    quantityTd.textContent = product.quantity;

    // Columna: Acciones
    const actionsTd = document.createElement("td");

    const consumeBtn = document.createElement("button");
    consumeBtn.textContent = "➖";
    consumeBtn.classList.add("consume");
    consumeBtn.onclick = () => consume(product.name);

    const addBtn = document.createElement("button");
    addBtn.textContent = "➕";
    addBtn.classList.add("add");
    addBtn.onclick = () => add(product.name);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.classList.add("delete");
    deleteBtn.onclick = () => deleteProduct(product.name);

    actionsTd.appendChild(consumeBtn);
    actionsTd.appendChild(addBtn);
    actionsTd.appendChild(deleteBtn);

    // Agregar las celdas a la fila
    tr.appendChild(nameTd);
    tr.appendChild(quantityTd);
    tr.appendChild(actionsTd);

    // Agregar la fila al tbody
    list.appendChild(tr);
  });
}

async function consume(name) {
  await updateProduct(name, -1);
  renderProducts();
}

async function add(name) {
  await updateProduct(name, +1);
  renderProducts();
}

async function deleteProduct(name) {
  await fetch(`/products/${name}`, { method: "DELETE" });
  renderProducts();
}

document
  .getElementById("add-product-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = document.getElementById("product-name").value;
    const quantity = parseInt(
      document.getElementById("product-quantity").value,
      10
    );

    await saveProduct({ name, quantity });
    renderProducts();
    this.reset();
  });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}

// Primera carga
renderProducts();

// ESTILOS ANIMACIONES
// Seleccionamos el botón flotante
const addProductBtn = document.getElementById("addProductBtn");

// Añadimos un evento al botón flotante para hacer scroll hasta el formulario
addProductBtn.addEventListener("click", () => {
  // Hacemos scroll hasta el formulario
  document.getElementById("add-product-form").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});
