const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de la conexión a Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render te da esta variable
  ssl: {
    rejectUnauthorized: false, // necesario para Render
  },
});

app.use(cors());
app.use(bodyParser.json());

// ✅ Obtener todos los productos
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM productos ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener productos:", err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// ✅ Crear un nuevo producto
app.post("/api/products", async (req, res) => {
  const { name, quantity, category, original_category } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO productos (name, quantity, category, original_category) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, quantity, category, original_category]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al crear producto:", err);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// ✅ Actualizar un producto
app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, quantity, category, original_category } = req.body;
  try {
    const result = await pool.query(
      "UPDATE productos SET name=$1, quantity=$2, category=$3, original_category=$4 WHERE id=$5 RETURNING *",
      [name, quantity, category, original_category, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al actualizar producto:", err);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

// ✅ Eliminar un producto
app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM productos WHERE id=$1", [id]);
    res.json({ message: "Producto eliminado" });
  } catch (err) {
    console.error("Error al eliminar producto:", err);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

// ✅ Archivos estáticos (esto va al final para no tapar las rutas /api)
app.use(express.static("."));

// ✅ Ruta raíz para servir index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
