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

// Verificar variables críticas
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: No se encontraron variables de configuración de base de datos');
} else {
  console.log('✅ Configuración de base de datos encontrada');
}

// =============================================
// CONFIGURACIÓN DE BASE DE DATOS
// =============================================
const isProduction = process.env.NODE_ENV === 'production';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

// =============================================
// MIDDLEWARE
// =============================================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =============================================
// CONEXIÓN A BASE DE DATOS Y CREACIÓN DE TABLA
// =============================================
const connectToDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL con éxito');
    
    // Verificar si la tabla products existe y crearla si no existe
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
        console.log('⚠️  Tabla "products" no encontrada. Creándola...');
        
        // Crear la tabla products con la estructura correcta
        await client.query(`
          CREATE TABLE products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            quantity INTEGER NOT NULL,
            category VARCHAR(100),
            originalCategory VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        console.log('✅ Tabla "products" creada exitosamente');
        
        // Insertar datos de ejemplo
        await client.query(`
          INSERT INTO products (name, quantity, category, originalCategory) VALUES
          ('🍅 Tomate', 4, 'alimentos_frescos', 'alimentos_frescos'),
          ('🥔 Papas', 10, 'alimentos_frescos', 'alimentos_frescos'),
          ('🥜 Cacahuetes', 1, 'despensa', 'despensa'),
          ('🧴 Lejía', 1, 'limpieza_hogar', 'limpieza_hogar'),
          ('🍋 Limón', 3, 'alimentos_frescos', 'alimentos_frescos'),
          ('🎃 Calabacín', 2, 'alimentos_frescos', 'alimentos_frescos'),
          ('🍊 Naranjas', 11, 'alimentos_frescos', 'alimentos_frescos'),
          ('🧅 Cebolla', 4, 'alimentos_frescos', 'alimentos_frescos'),
          ('🧄 Ajo', 3, 'alimentos_frescos', 'alimentos_frescos'),
          ('🥕 Zanahoria', 7, 'alimentos_frescos', 'alimentos_frescos'),
          ('🥑 Aguacate', 2, 'alimentos_frescos', 'alimentos_frescos'),
          ('🍇 Uvas', 1, 'alimentos_frescos', 'alimentos_frescos'),
          ('🥓 Bacon', 2, 'proteina', 'proteina'),
          ('🧀 Queso en lonchas', 2, 'lacteos', 'lacteos'),
          ('🧀 Queso rayado', 2, 'lacteos', 'lacteos'),
          ('🥩 Fuet', 1, 'proteina', 'proteina'),
          ('🧈 Mantequilla', 1, 'lacteos', 'lacteos'),
          ('🥓 Lonchas de jamón', 1, 'proteina', 'proteina'),
          ('🍷 Tinto de verano', 2, 'bebidas', 'bebidas'),
          ('🍄 Champiñones', 1, 'alimentos_frescos', 'alimentos_frescos'),
          ('🥛 Nata', 4, 'lacteos', 'lacteos'),
          ('🥣 Cereal', 3, 'panaderia-y-cereales', 'panaderia-y-cereales'),
          ('🍚 Arroz', 2, 'panaderia-y-cereales', 'panaderia-y-cereales'),
          ('🧂 Sal', 1, 'despensa', 'despensa'),
          ('☕️ Colacao', 1, 'despensa', 'despensa'),
          ('☕️ Café', 1, 'despensa', 'despensa'),
          ('🍞 Pan', 1, 'panaderia-y-cereales', 'panaderia-y-cereales'),
          ('🧂 Pimienta', 1, 'despensa', 'despensa'),
          ('🧄 Ajo en polvo', 1, 'despensa', 'despensa'),
          ('🌿 Perejil', 1, 'despensa', 'despensa'),
          ('🌿 Tomillo', 1, 'despensa', 'despensa'),
          ('🌿 Orégano', 1, 'despensa', 'despensa'),
          ('🌾 Avena', 1, 'panaderia-y-cereales', 'panaderia-y-cereales'),
          ('🌾 Harina', 1, 'panaderia-y-cereales', 'panaderia-y-cereales'),
          ('🐟 Atún', 6, 'proteina', 'proteina'),
          ('🍅 Tomate frito', 1, 'despensa', 'despensa'),
          ('🍝 Pasta', 1, 'panaderia-y-cereales', 'panaderia-y-cereales'),
          ('🫒 Aceite de oliva', 5, 'despensa', 'despensa'),
          ('🪔 Aceite de girasol', 2, 'despensa', 'despensa'),
          ('🧼 Lavavajillas', 1, 'limpieza_hogar', 'limpieza_hogar'),
          ('💧 Agua', 72, 'bebidas', 'bebidas'),
          ('🥚 Huevos', 10, 'proteina', 'proteina'),
          ('🥩 Carne molida', 2, 'proteina', 'proteina'),
          ('🐟 Salmón', 1, 'proteina', 'proteina'),
          ('🐙 Aros de pulpo', 1, 'proteina', 'proteina'),
          ('🍗 Pollo', 5, 'proteina', 'proteina'),
          ('🥬 Espinacas', 1, 'alimentos_frescos', 'alimentos_frescos'),
          ('🍓 Frutos rojos', 1, 'alimentos_frescos', 'alimentos_frescos'),
          ('🍍 Frutos tropicales', 1, 'alimentos_frescos', 'alimentos_frescos'),
          ('🍟 Papas fritas', 1, 'despensa', 'despensa'),
          ('🍢 Carne kebab', 1, 'proteina', 'proteina'),
          ('🧊 Hielo', 1, 'bebidas', 'bebidas'),
          ('🌾 Harina pan', 1, 'panaderia-y-cereales', 'panaderia-y-cereales'),
          ('🧴 Shampoo', 2, 'aseo', 'aseo'),
          ('🚿 Gel de ducha', 0, 'aseo', 'aseo'),
          ('🧻 Papel baño', 11, 'aseo', 'aseo'),
          ('🧼 Jabón en barra', 2, 'aseo', 'aseo'),
          ('🧴 Desodorante', 2, 'aseo', 'aseo'),
          ('🧼 Jabón íntimo', 2, 'aseo', 'aseo'),
          ('💨 Ambientador', 1, 'limpieza_hogar', 'limpieza_hogar'),
          ('💆‍♂️ Acondicionador', 2, 'aseo', 'aseo'),
          ('🧽 Esponja', 2, 'limpieza_hogar', 'limpieza_hogar'),
          ('🥬 Lechuga', 0, 'alimentos_frescos', 'alimentos_frescos');
        `);
        
        console.log('✅ Datos de ejemplo insertados correctamente');
      }
    } catch (tableError) {
      console.error('❌ Error al verificar/crear la tabla products:', tableError.message);
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
  }
};

connectToDB();

// =============================================
// RUTAS COMPATIBLES CON TU FRONTEND (RUTAS ORIGINALES)
// =============================================

// Leer productos (ruta original)
app.get("/products", async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, quantity, category, "originalCategory" FROM products ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar producto existente (consumir o reponer) - ruta original
app.put("/products/update", async (req, res) => {
  const { name, delta } = req.body;

  try {
    // Buscar producto por nombre
    const findResult = await pool.query('SELECT * FROM products WHERE name = $1', [name]);
    
    if (findResult.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const product = findResult.rows[0];
    const newQuantity = product.quantity + delta;
    
    // Actualizar cantidad
    const updateResult = await pool.query(
      'UPDATE products SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newQuantity < 0 ? 0 : newQuantity, product.id]
    );

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Error actualizando producto:', error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Editar producto (nombre, cantidad, categoría) - ruta original
app.put("/products/update-edit", async (req, res) => {
  const { oldName, name, quantity, category } = req.body;

  try {
    // Buscar producto por nombre antiguo
    const findResult = await pool.query('SELECT * FROM products WHERE name = $1', [oldName]);
    
    if (findResult.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const product = findResult.rows[0];
    
    // Actualizar producto
    const updateResult = await pool.query(
      'UPDATE products SET name = $1, quantity = $2, category = $3, "originalCategory" = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [name, quantity, category, category, product.id]
    );

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Error editando producto:', error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Agregar producto (si existe, suma la cantidad) - ruta original
app.post("/products", async (req, res) => {
  const { name, quantity, category, originalCategory } = req.body;

  try {
    // Buscar si el producto ya existe
    const findResult = await pool.query('SELECT * FROM products WHERE name = $1', [name]);
    
    if (findResult.rows.length > 0) {
      // Si existe, sumar la cantidad
      const product = findResult.rows[0];
      const newQuantity = product.quantity + quantity;
      
      const updateResult = await pool.query(
        'UPDATE products SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [newQuantity, product.id]
      );
      
      res.json(updateResult.rows[0]);
    } else {
      // Si no existe, crear nuevo producto
      const insertResult = await pool.query(
        'INSERT INTO products (name, quantity, category, "originalCategory") VALUES ($1, $2, $3, $4) RETURNING *',
        [name, quantity, category, originalCategory || category]
      );
      
      res.json(insertResult.rows[0]);
    }
  } catch (error) {
    console.error('Error agregando producto:', error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Eliminar producto por nombre - ruta original
app.delete("/products/:name", async (req, res) => {
  const productName = req.params.name;

  try {
    const result = await pool.query('DELETE FROM products WHERE name = $1 RETURNING *', [productName]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    
    res.json({ message: `Producto ${productName} eliminado`, deletedProduct: result.rows[0] });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// =============================================
// RUTAS ADICIONALES (PARA VERIFICACIÓN)
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
      products: '/products',
      productUpdate: '/products/update',
      productEdit: '/products/update-edit',
      envCheck: '/api/env-check',
      dbTest: '/api/test-db'
    }
  });
});

// Endpoint para verificar variables de entorno
app.get('/api/env-check', (req, res) => {
  const envVars = {
    node_env: process.env.NODE_ENV || 'No configurado',
    port: process.env.PORT || 'Usando puerto por defecto (3000)',
    database_url: process.env.DATABASE_URL ? 'Configurada' : 'No configurada',
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
      error: error.message
    });
  }
});

// =============================================
// MANEJO DE ERRORES
// =============================================

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// =============================================
// INICIAR SERVIDOR
// =============================================
app.listen(PORT, () => {
  console.log(`\n=== SERVIDOR INICIADO ===`);
  console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
  console.log(`🌍 Modo: ${isProduction ? 'production' : 'development'}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   - http://localhost:${PORT}/products`);
  console.log(`   - http://localhost:${PORT}/products/update`);
  console.log(`   - http://localhost:${PORT}/products/update-edit`);
  console.log(`=========================================`);
});
