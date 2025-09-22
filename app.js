// === Cambios en llamadas a la API ===

// Obtener todos los productos
async function fetchProducts() {
  const res = await fetch("/api/products");
  return res.json();
}

// Guardar producto nuevo
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

// Actualizar cantidad (+/-)
async function updateProduct(id, delta) {
  // Primero obtenemos el producto actual
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

// Actualizar edición completa (nombre, cantidad, categoría)
async function updateProductEdit(id, updatedProduct) {
  const res = await fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedProduct),
  });
  return res.json();
}

// Eliminar producto
async function deleteProduct(id) {
  await fetch(`/api/products/${id}`, { method: "DELETE" });
  renderProducts();
}
