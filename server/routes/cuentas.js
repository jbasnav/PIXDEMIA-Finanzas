const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar todas las cuentas con sus saldos calculados
router.get('/', (req, res) => {
  try {
    const cuentas = db.prepare(`
      SELECT id, nombre, tipo, saldo_inicial_2026, color_hex, activo, created_at
      FROM cuentas
      ORDER BY id ASC
    `).all();

    // Calcular saldos dinámicos
    const saldos = cuentas.map(c => {
      const directos = db.prepare(`
        SELECT COALESCE(SUM(importe), 0) as total
        FROM movimientos
        WHERE cuenta_id = ? AND es_transferencia_interna = 0
      `).get(c.id).total;

      const salTransfers = db.prepare(`
        SELECT COALESCE(SUM(ABS(importe)), 0) as total
        FROM movimientos
        WHERE cuenta_id = ? AND es_transferencia_interna = 1
      `).get(c.id).total;

      const entTransfers = db.prepare(`
        SELECT COALESCE(SUM(ABS(importe)), 0) as total
        FROM movimientos
        WHERE cuenta_destino_id = ? AND es_transferencia_interna = 1
      `).get(c.id).total;

      const saldoActual = c.saldo_inicial_2026 + directos - salTransfers + entTransfers;

      return {
        ...c,
        saldo_actual: Number(saldoActual.toFixed(2))
      };
    });

    res.json(saldos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nueva cuenta
router.post('/', (req, res) => {
  try {
    const { nombre, tipo, saldo_inicial_2026 = 0, color_hex = '#3b82f6' } = req.body;
    if (!nombre || !tipo) {
      return res.status(400).json({ error: 'Nombre y tipo son obligatorios' });
    }

    const stmt = db.prepare(`
      INSERT INTO cuentas (nombre, tipo, saldo_inicial_2026, color_hex, activo)
      VALUES (?, ?, ?, ?, 1)
    `);
    const info = stmt.run(nombre, tipo, Number(saldo_inicial_2026), color_hex);

    const nuevaCuenta = db.prepare('SELECT * FROM cuentas WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(nuevaCuenta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar cuenta
router.put('/:id', (req, res) => {
  try {
    const { nombre, tipo, saldo_inicial_2026, color_hex, activo } = req.body;
    const cuentaExistente = db.prepare('SELECT * FROM cuentas WHERE id = ?').get(req.params.id);
    if (!cuentaExistente) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    const nuevoNombre = nombre !== undefined ? nombre : cuentaExistente.nombre;
    const nuevoTipo = tipo !== undefined ? tipo : cuentaExistente.tipo;
    const nuevoSaldo = saldo_inicial_2026 !== undefined ? Number(saldo_inicial_2026) : cuentaExistente.saldo_inicial_2026;
    const nuevoColor = color_hex !== undefined ? color_hex : cuentaExistente.color_hex;
    const nuevoActivo = activo !== undefined ? (activo ? 1 : 0) : cuentaExistente.activo;

    const stmt = db.prepare(`
      UPDATE cuentas
      SET nombre = ?,
          tipo = ?,
          saldo_inicial_2026 = ?,
          color_hex = ?,
          activo = ?
      WHERE id = ?
    `);
    stmt.run(nuevoNombre, nuevoTipo, nuevoSaldo, nuevoColor, nuevoActivo, req.params.id);

    const actualizada = db.prepare('SELECT * FROM cuentas WHERE id = ?').get(req.params.id);
    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar cuenta
router.delete('/:id', (req, res) => {
  try {
    const movCount = db.prepare('SELECT COUNT(*) as count FROM movimientos WHERE cuenta_id = ? OR cuenta_destino_id = ?')
      .get(req.params.id, req.params.id).count;

    if (movCount > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una cuenta que contiene movimientos asociados. Puedes desactivarla.' });
    }

    db.prepare('DELETE FROM cuentas WHERE id = ?').run(req.params.id);
    res.json({ message: 'Cuenta eliminada con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
