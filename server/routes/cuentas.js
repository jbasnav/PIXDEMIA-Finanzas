const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar todas las cuentas con sus saldos calculados
router.get('/', (req, res) => {
  try {
    const usuarioId = req.query.usuario_id || req.headers['x-usuario-id'] || 1;
    const cuentas = db.prepare(`
      SELECT id, usuario_id, nombre, tipo, saldo_inicial_2026, color_hex, activo, created_at
      FROM cuentas
      WHERE usuario_id = ?
      ORDER BY id ASC
    `).all(usuarioId);

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

      const totalMovimientos = db.prepare(`
        SELECT COUNT(*) as total FROM movimientos WHERE cuenta_id = ? OR cuenta_destino_id = ?
      `).get(c.id, c.id).total;

      return {
        ...c,
        saldo_actual: Number(saldoActual.toFixed(2)),
        total_movimientos: totalMovimientos
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
    const usuarioId = req.body.usuario_id || req.headers['x-usuario-id'] || 1;
    const { nombre, tipo, saldo_inicial_2026 = 0, color_hex = '#3b82f6' } = req.body;
    if (!nombre || !tipo) {
      return res.status(400).json({ error: 'Nombre y tipo son obligatorios' });
    }

    const stmt = db.prepare(`
      INSERT INTO cuentas (usuario_id, nombre, tipo, saldo_inicial_2026, color_hex, activo)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    const info = stmt.run(usuarioId, nombre.trim(), tipo, Number(saldo_inicial_2026) || 0, color_hex);

    const nuevaCuenta = db.prepare('SELECT * FROM cuentas WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({
      ...nuevaCuenta,
      saldo_actual: Number(nuevaCuenta.saldo_inicial_2026.toFixed(2)),
      total_movimientos: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar cuenta / Calibrar saldo
router.put('/:id', (req, res) => {
  try {
    const { nombre, tipo, saldo_inicial_2026, color_hex, activo, calibrar_saldo_actual } = req.body;
    const cuentaExistente = db.prepare('SELECT * FROM cuentas WHERE id = ?').get(req.params.id);
    if (!cuentaExistente) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    let nuevoSaldo = saldo_inicial_2026 !== undefined ? Number(saldo_inicial_2026) : cuentaExistente.saldo_inicial_2026;

    // Si el usuario quiere calibrar el saldo actual exacto a día de hoy:
    // saldo_inicial = saldo_actual_deseado - movimientos_acumulados
    if (calibrar_saldo_actual !== undefined && calibrar_saldo_actual !== null) {
      const directos = db.prepare(`
        SELECT COALESCE(SUM(importe), 0) as total
        FROM movimientos
        WHERE cuenta_id = ? AND es_transferencia_interna = 0
      `).get(req.params.id).total;

      const salTransfers = db.prepare(`
        SELECT COALESCE(SUM(ABS(importe)), 0) as total
        FROM movimientos
        WHERE cuenta_id = ? AND es_transferencia_interna = 1
      `).get(req.params.id).total;

      const entTransfers = db.prepare(`
        SELECT COALESCE(SUM(ABS(importe)), 0) as total
        FROM movimientos
        WHERE cuenta_destino_id = ? AND es_transferencia_interna = 1
      `).get(req.params.id).total;

      const movDelta = directos - salTransfers + entTransfers;
      nuevoSaldo = Number(calibrar_saldo_actual) - movDelta;
    }

    const nuevoNombre = nombre !== undefined ? nombre.trim() : cuentaExistente.nombre;
    const nuevoTipo = tipo !== undefined ? tipo : cuentaExistente.tipo;
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
    const force = req.query.force === 'true' || req.query.force === '1';
    const movCount = db.prepare('SELECT COUNT(*) as count FROM movimientos WHERE cuenta_id = ? OR cuenta_destino_id = ?')
      .get(req.params.id, req.params.id).count;

    if (movCount > 0 && !force) {
      return res.status(400).json({ 
        error: `La cuenta tiene ${movCount} movimiento(s) asociados. Puedes desactivarla para ocultarla o confirmar eliminación completa.` 
      });
    }

    if (force) {
      db.prepare('DELETE FROM movimientos WHERE cuenta_id = ? OR cuenta_destino_id = ?').run(req.params.id, req.params.id);
    }

    db.prepare('DELETE FROM cuentas WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Cuenta eliminada con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
