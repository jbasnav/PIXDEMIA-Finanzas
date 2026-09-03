const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parseExcelFile } = require('../services/excelParser');

// Configuración de multer en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls|xlsm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Por favor sube un archivo Excel válido (.xlsx, .xls)'));
    }
  }
});

// Endpoint POST /api/import-excel
router.post('/excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha adjuntado ningún archivo Excel' });
    }

    const importResults = parseExcelFile(req.file.buffer);

    res.json({
      success: true,
      filename: req.file.originalname,
      ...importResults
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
