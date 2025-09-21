const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// VERIFICACIÓN DE VARIABLES DE ENTORNO
// =============================================
console.log('=== VERIFICACIÓN DE VARIABLES DE ENTORNO ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL disponible:', !!process.env.DATABASE_URL);
console.log('DB_USER disponible:', !!process.env.DB_USER);
console.log('DB_PASSWORD disponible:', !!process.env.DB_PASSWORD);
console.log('DB_HOST disponible:', !!process.env.DB_HOST);
console.log('DB_PORT disponible:', !!process.env.DB_PORT);
console.log('DB_DATABASE disponible:', !!process.env.DB_DATABASE);

// Verificar variables críticas
if (!process.env.DATABASE_URL && 
    (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_HOST || !process.env.DB_DATABASE)) {
  console.error('❌ ERROR: No se encontraron variables de configuración de base de datos');
  console.error('Por favor configura DATABASE_URL o las variables individuales de conexión');
} else {
  console.log('✅ Configuración de base de datos encontrada');
}

// =============================================
// CONFIGURACIÓN DE BASE DE DATOS
// =============================================
const isProduction = process.env.NODE_ENV === 'production';

// Crear pool de conexiones a PostgreSQL
let connectionConfig = {};

if (process.env.DATABASE_URL) {
  // Usar DATABASE_URL si está disponible (Recomendado para Render)
  connectionConfig.connectionString = process.env.DATABASE_URL;
  connectionConfig.ssl = isProduction ? { rejectUnauthorized: false } : false;
  console.log('🔗 Usando DATABASE_URL para la conexión');
} else {
  // Usar variables individuales como fallback
  connectionConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_DATABASE,
    ssl: isProduction ? { rejectUnauthorized: false } : false
  };
  console.log('🔗 Usando variables individuales para la conexión');
}

const pool = new Pool(connectionConfig);

// =============================================
// MIDDLEWARE
// =============================================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =============================================
// CONEXIÓN A BASE DE DATOS
// =============================================
const connectToDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL con éxito');
    
    // Verificar si la tabla products existe
    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'products'
        );
      `);
      
      if (tableCheck.rows[0].exists) {
        console.log('✅ Tabla "products" encontrada en la base de datos');
      } else {
        console.warn('⚠️  Tabla "products" no encontrada. Debes crearla con el esquema correcto.');
      }
    } catch (tableError) {
      console.warn('⚠️  No se pudo verificar la existencia de la tabla products:', tableError.message);
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    console.error('Por favor verifica tus variables de entorno y la conexión a la base de datos');
  }
};

connectToDB();

// =============================================
// ENDPOINTS DE VERIFICACIÓN
// =============================================

// Endpoint para verificar variables de entorno
app.get('/api/env-check', (req, res) => {
  const envVars = {
    node_env: process.env.NODE_ENV || 'No configurado',
    port: process.env.PORT || 'Usando puerto por defecto (3000)',
    database_url: process.env.DATABASE_URL ? 'Configurada' : 'No configurada',
    db_user: process.env.DB_USER || 'No configurado',
    db_host: process.env.DB_HOST || 'No configurado',
    db_database: process.env.DB_DATABASE || 'No configurado',
    db_port: process.env.DB_PORT || 'Usando puerto por defecto (5432)',
    app_url: `https://${req.get('host')}`
  };
  
  res.json({
    success: true,
    message: 'Verificación de variables de entorno',
    environment: envVars,
    timestamp: new Date().toISOString()
  });
});

// Endpoint de prueba de conexión a la base de datos
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
    res.json({ 
      success: true, 
      message: 'Conexión a la base de datos exitosa',
      database: {
        time: result.rows[0].current_time,
        version: result.rows[0].postgres_version
      }
    });
  } catch (error) {
    console.error('Error de conexión a la base de datos:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      suggestion: 'Verifica la configuración de tu base de datos en Render'
    });
  }
});

// =============================================
// ENDPOINTS PRINCIPALES DE PRODUCTOS
// =============================================

// Endpoint para obtener todos los productos
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id');
    res.json({
      success: true,
      count: result.rows.length,
      products: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
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
    
    // Validaciones básicas
    if (!name || !price || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, precio y cantidad son campos requeridos'
      });
    }
    
    const result = await pool.query(
      'INSERT INTO products (name, description, price, quantity, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, parseFloat(price), parseInt(quantity), category]
    );
    
    res.status(201).json({
      success: true,
      message: 'Producto creado correctamente',
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
      message: 'Producto actualizado correctamente',
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
      message: 'Producto eliminado correctamente',
      deletedProduct: result.rows[0]
    });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// =============================================
// RUTAS ADICIONALES
// =============================================

// Ruta principal - servir el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '.', 'index.html'));
});

// Ruta de información del API
app.get('/api', (req, res) => {
  res.json({
    name: 'Home Inventory API',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      productDetail: '/api/products/:id',
      envCheck: '/api/env-check',
      dbTest: '/api/test-db'
    },
    documentation: 'Visita /api para ver los endpoints disponibles'
  });
});

// =============================================
// MANEJO DE ERRORES
// =============================================

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Something went wrong!' 
  });
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Endpoint not found' 
  });
});

// =============================================
// INICIAR SERVIDOR
// =============================================
app.listen(PORT, () => {
  console.log(`\n=== SERVIDOR INICIADO ===`);
  console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
  console.log(`🌍 Modo: ${isProduction ? 'production' : 'development'}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   - http://localhost:${PORT}/api/env-check`);
  console.log(`   - http://localhost:${PORT}/api/test-db`);
  console.log(`   - http://localhost:${PORT}/api/products`);
  console.log(`=========================================`);
});
