const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, "public")));

// Actualizar producto existente (consumir o reponer)
app.put("/products/update", (req, res) => {
  const { name, delta } = req.body;

  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) return res.status(500).send("Error leyendo data.json");

    let products = [];
    try {
      products = JSON.parse(data);
    } catch (e) {
      products = [];
    }

    const index = products.findIndex(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );

    if (index !== -1) {
      products[index].quantity += delta;
      if (products[index].quantity < 0) products[index].quantity = 0;
    } else {
      return res.status(404).send("Producto no encontrado");
    }

    fs.writeFile("data.json", JSON.stringify(products, null, 2), (err) => {
      if (err) return res.status(500).send("Error escribiendo data.json");
      res.json(products[index]);
    });
  });
});

// Editar producto (nombre, cantidad, categoría)
app.put("/products/update-edit", (req, res) => {
  const { oldName, name, quantity, category } = req.body;

  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) return res.status(500).send("Error leyendo data.json");

    let products = [];
    try {
      products = JSON.parse(data);
    } catch (e) {
      products = [];
    }

    const index = products.findIndex(
      (p) => p.name.toLowerCase() === oldName.toLowerCase()
    );

    if (index === -1) return res.status(404).send("Producto no encontrado");

    products[index].name = name;
    products[index].quantity = quantity;
    products[index].category = category;
    products[index].originalCategory = category;

    fs.writeFile("data.json", JSON.stringify(products, null, 2), (err) => {
      if (err) return res.status(500).send("Error escribiendo data.json");
      res.json(products[index]);
    });
  });
});

// Leer productos
app.get("/products", (req, res) => {
  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) return res.status(500).send("Error leyendo data.json");
    res.json(JSON.parse(data || "[]"));
  });
});

// Agregar producto (si existe, suma la cantidad)
app.post("/products", (req, res) => {
  const newProduct = req.body;

  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) return res.status(500).send("Error leyendo data.json");

    let products = [];
    try {
      products = JSON.parse(data);
    } catch (e) {
      products = [];
    }

    // Buscar producto existente ignorando mayúsculas
    const index = products.findIndex(
      (p) => p.name.toLowerCase() === newProduct.name.toLowerCase()
    );

    if (index !== -1) {
      // Si ya existe, sumamos la cantidad
      products[index].quantity += newProduct.quantity;
    } else {
      // Si no existe, lo agregamos
      products.push(newProduct);
    }

    fs.writeFile("data.json", JSON.stringify(products, null, 2), (err) => {
      if (err) return res.status(500).send("Error escribiendo data.json");
      res.json(products);
    });
  });
});

// Eliminar producto por nombre
app.delete("/products/:name", (req, res) => {
  const productName = req.params.name.toLowerCase();

  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) return res.status(500).send("Error leyendo data.json");

    let products = [];
    try {
      products = JSON.parse(data);
    } catch (e) {
      products = [];
    }

    // Filtrar el producto que NO queremos eliminar
    const newProducts = products.filter(
      (p) => p.name.toLowerCase() !== productName
    );

    fs.writeFile("data.json", JSON.stringify(newProducts, null, 2), (err) => {
      if (err) return res.status(500).send("Error escribiendo data.json");
      res.json({ message: `Producto ${productName} eliminado` });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
