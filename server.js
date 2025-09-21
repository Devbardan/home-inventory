const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de la base de datos
const isProduction = process.env.NODE_ENV === 'production';

// Crear pool de conexiones a PostgreSQL
const pool = new Pool({
  connectionString: isProduction ? process.env.DATABASE_URL : `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conectar a la base de datos
const connectToDB = async () => {
  try {
    const client = await pool.connect();
    console.log('Conectado a PostgreSQL con éxito');
    client.release();
  } catch (error) {
    console.error('Error conectando a la base de datos:', error.message);
  }
};

connectToDB();

// Endpoint de prueba de conexión a la base de datos
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      success: true, 
      message: 'Conexión a la base de datos exitosa',
      time: result.rows[0].now 
    });
  } catch (error) {
    console.error('Error de conexión a la base de datos:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint para obtener todos los productos
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id');
    res.json({
      success: true,
      products: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Endpoint para obtener un producto por ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }
    
    res.json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Endpoint para crear un nuevo producto
app.post('/api/products', async (req, res) => {
  try {
    const { name, description, price, quantity, category } = req.body;
    
    const result = await pool.query(
      'INSERT INTO products (name, description, price, quantity, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, price, quantity, category]
    );
    
    res.status(201).json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Endpoint para actualizar un producto
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, quantity, category } = req.body;
    
    const result = await pool.query(
      'UPDATE products SET name = $1, description = $2, price = $3, quantity = $4, category = $5 WHERE id = $6 RETURNING *',
      [name, description, price, quantity, category, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }
    
    res.json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Endpoint para eliminar un producto
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Producto eliminado correctamente'
    });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Ruta principal - servir el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
  console.log(`Modo: ${isProduction ? 'production' : 'development'}`);
});
