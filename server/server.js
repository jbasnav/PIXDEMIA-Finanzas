const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const db = require('./db');
const { parseExcelFile } = require('./services/excelParser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Asegurar que la base de datos está cargada antes de procesar peticiones
app.use(async (req, res, next) => {
  if (db.ready) {
    await db.ready;
  }
  next();
});

// Rutas API
app.use('/api/cuentas', require('./routes/cuentas'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/movimientos', require('./routes/movimientos'));
app.use('/api/pasivos', require('./routes/pasivos'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/suscripciones', require('./routes/suscripciones'));
app.use('/api/alimentacion', require('./routes/alimentacion'));
app.use('/api/import', require('./routes/import'));

// Endpoint directo POST /api/import-excel requerido
const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/import-excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha proporcionado ningún archivo Excel' });
    }
    const results = parseExcelFile(req.file.buffer);
    res.json({
      success: true,
      archivo: req.file.originalname,
      ...results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Servir frontend compilado en producción si existe
const clientDist = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Finanzas API</title><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h2>Backend API de Finanzas Personales en ejecución en el puerto ${PORT}</h2>
            <p>Para iniciar el Frontend en modo desarrollo, ejecuta: <code>npm.cmd --prefix client run dev</code></p>
          </body>
        </html>
      `);
    }
  });
});

async function startServer() {
  await db.ready;
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Servidor de Finanzas Personales activo en: http://localhost:${PORT}`);
    console.log(`📊 Base de datos SQLite conectada: /data/finanzas.db`);
    console.log(`=======================================================`);
  });
}

startServer();
