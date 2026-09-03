const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todas las categorías y sus subcategorías/tiendas
router.get('/', (req, res) => {
  try {
    const categorias = db.prepare(`
      SELECT id, nombre, tipo, icono, color, created_at
      FROM categorias
      ORDER BY nombre ASC
    `).all();

    const subcategorias = db.prepare(`
      SELECT id, categoria_id, nombre
      FROM subcategorias_o_tiendas
      ORDER BY nombre ASC
    `).all();

    const result = categorias.map(cat => ({
      ...cat,
      subcategorias: subcategorias.filter(sub => sub.categoria_id === cat.id).map(s => s.nombre)
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lista plana de subcategorías/tiendas para autocompletado rápido
router.get('/tiendas-habituales', (req, res) => {
  try {
    const tiendas = db.prepare(`
      SELECT DISTINCT nombre FROM subcategorias_o_tiendas
      UNION
      SELECT DISTINCT subcategoria as nombre FROM movimientos WHERE subcategoria IS NOT NULL AND subcategoria != ''
      ORDER BY nombre ASC
    `).all();

    res.json(tiendas.map(t => t.nombre));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear categoría
router.post('/', (req, res) => {
  try {
    const { nombre, tipo, icono = 'Tag', color = '#64748b', subcategorias = [] } = req.body;
    if (!nombre || !tipo) {
      return res.status(400).json({ error: 'Nombre y tipo son obligatorios' });
    }

    const insertCat = db.prepare(`
      INSERT INTO categorias (nombre, tipo, icono, color)
      VALUES (?, ?, ?, ?)
    `);

    const insertSub = db.prepare(`
      INSERT INTO subcategorias_o_tiendas (categoria_id, nombre)
      VALUES (?, ?)
    `);

    const result = db.transaction(() => {
      const info = insertCat.run(nombre, tipo, icono, color);
      const catId = info.lastInsertRowid;
      for (const sub of subcategorias) {
        if (sub && sub.trim()) {
          insertSub.run(catId, sub.trim());
        }
      }
      return catId;
    })();

    const nueva = db.prepare('SELECT * FROM categorias WHERE id = ?').get(result);
    res.status(201).json(nueva);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
