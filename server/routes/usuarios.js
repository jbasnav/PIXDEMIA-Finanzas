const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar todos los usuarios/perfiles de gestión
router.get('/', (req, res) => {
  try {
    const usuarios = db.prepare(`
      SELECT u.id, u.nombre, u.email_o_alias, u.color_hex, u.icono, u.es_defecto, u.created_at,
             (SELECT COUNT(*) FROM cuentas WHERE usuario_id = u.id AND activo = 1) as total_cuentas,
             (SELECT COUNT(*) FROM movimientos WHERE usuario_id = u.id) as total_movimientos
      FROM usuarios_gestion u
      ORDER BY u.es_defecto DESC, u.id ASC
    `).all();

    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo usuario/perfil de gestión
router.post('/', (req, res) => {
  try {
    const { nombre, email_o_alias = '', color_hex = '#4f46e5', icono = 'Users' } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la gestión o usuario es obligatorio' });
    }

    const stmt = db.prepare(`
      INSERT INTO usuarios_gestion (nombre, email_o_alias, color_hex, icono, es_defecto)
      VALUES (?, ?, ?, ?, 0)
    `);
    const info = stmt.run(nombre.trim(), email_o_alias.trim(), color_hex, icono);
    const nuevoUsuario = db.prepare('SELECT * FROM usuarios_gestion WHERE id = ?').get(info.lastInsertRowid);

    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar usuario/perfil
router.put('/:id', (req, res) => {
  try {
    const { nombre, email_o_alias, color_hex, icono } = req.body;
    const user = db.prepare('SELECT * FROM usuarios_gestion WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const newNombre = nombre !== undefined ? nombre.trim() : user.nombre;
    const newAlias = email_o_alias !== undefined ? email_o_alias.trim() : user.email_o_alias;
    const newColor = color_hex !== undefined ? color_hex : user.color_hex;
    const newIcono = icono !== undefined ? icono : user.icono;

    db.prepare(`
      UPDATE usuarios_gestion
      SET nombre = ?, email_o_alias = ?, color_hex = ?, icono = ?
      WHERE id = ?
    `).run(newNombre, newAlias, newColor, newIcono, req.params.id);

    const updated = db.prepare('SELECT * FROM usuarios_gestion WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Establecer usuario por defecto
router.post('/:id/set-default', (req, res) => {
  try {
    db.prepare('UPDATE usuarios_gestion SET es_defecto = 0').run();
    db.prepare('UPDATE usuarios_gestion SET es_defecto = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Usuario establecido por defecto' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar usuario y sus datos asociados
router.delete('/:id', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM usuarios_gestion').get().count;
    if (totalUsers <= 1) {
      return res.status(400).json({ error: 'No se puede eliminar el único perfil de gestión existente' });
    }

    const userId = req.params.id;
    // Eliminar datos dependientes
    db.prepare('DELETE FROM movimientos WHERE usuario_id = ?').run(userId);
    db.prepare('DELETE FROM cuentas WHERE usuario_id = ?').run(userId);
    db.prepare('DELETE FROM presupuestos WHERE usuario_id = ?').run(userId);
    db.prepare('DELETE FROM suscripciones_servicios WHERE usuario_id = ?').run(userId);
    db.prepare('DELETE FROM prestamos_y_pasivos WHERE usuario_id = ?').run(userId);
    db.prepare('DELETE FROM usuarios_gestion WHERE id = ?').run(userId);

    // Asegurar que al menos uno quede como default
    const hasDefault = db.prepare('SELECT id FROM usuarios_gestion WHERE es_defecto = 1').get();
    if (!hasDefault) {
      db.prepare('UPDATE usuarios_gestion SET es_defecto = 1 WHERE id = (SELECT id FROM usuarios_gestion LIMIT 1)').run();
    }

    res.json({ success: true, message: 'Usuario y todos sus registros eliminados correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
