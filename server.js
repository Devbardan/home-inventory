// server.js con soporte para decimales y step
import express from "express";
import pkg from "pg";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ================== RUTAS ==================

// Obtener todos los productos
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM productos ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener productos:", err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// Agregar producto
app.post("/api/products", async (req, res) => {
  try {
    let { name, quantity, category, step } = req.body;
    if (!step) step = 1; // default 1 unidad
    const result = await pool.query(
      "INSERT INTO productos (name, quantity, category, original_category, step) VALUES ($1, $2, $3, $3, $4) RETURNING *",
      [name, quantity, category, step]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al agregar producto:", err);
    res.status(500).json({ error: "Error al agregar producto" });
  }
});

// Actualizar cantidad (+/- step)
app.put("/api/products/update", async (req, res) => {
  try {
    const { id, delta } = req.body;
    const result = await pool.query(
      "UPDATE productos SET quantity = GREATEST(quantity + $1, 0) WHERE id = $2 RETURNING *",
      [delta, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al actualizar producto:", err);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

// Actualizar producto completo (edición)
app.put("/api/products/update-edit", async (req, res) => {
  try {
    const { id, name, quantity, category, step } = req.body;
    const result = await pool.query(
      "UPDATE productos SET name=$1, quantity=$2, category=$3, original_category=$3, step=$4 WHERE id=$5 RETURNING *",
      [name, quantity, category, step || 1, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al editar producto:", err);
    res.status(500).json({ error: "Error al editar producto" });
  }
});

// Cambiar categoría (agotados, etc.)
app.put("/api/products/update-category", async (req, res) => {
  try {
    const { id, newCategory } = req.body;
    const result = await pool.query(
      "UPDATE productos SET category=$1 WHERE id=$2 RETURNING *",
      [newCategory, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al cambiar categoría:", err);
    res.status(500).json({ error: "Error al cambiar categoría" });
  }
});

// Eliminar producto
app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM productos WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error al eliminar producto:", err);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

// ================== SERVIDOR ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
