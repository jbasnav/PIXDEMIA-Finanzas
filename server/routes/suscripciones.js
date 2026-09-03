const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar todas las suscripciones con KPIs
router.get('/', (req, res) => {
  try {
    const subs = db.prepare(`
      SELECT s.*, c.nombre as cuenta_nombre, c.color_hex as cuenta_color
      FROM suscripciones_servicios s
      LEFT JOIN cuentas c ON s.cuenta_pago_id = c.id
      ORDER BY s.estado ASC, s.coste_recurrente DESC
    `).all();

    // Calcular KPIs
    let costeMensualizadoTotal = 0;
    let costeAnualTotal = 0;
    const porCategoria = {};

    subs.forEach(s => {
      if (s.estado === 'activo') {
        let mensual = s.coste_recurrente;
        if (s.periodicidad === 'anual') mensual = s.coste_recurrente / 12;
        else if (s.periodicidad === 'trimestral') mensual = s.coste_recurrente / 3;
        else if (s.periodicidad === 'semestral') mensual = s.coste_recurrente / 6;

        costeMensualizadoTotal += mensual;
        costeAnualTotal += mensual * 12;

        const cat = s.categoria_servicio || 'Otros';
        porCategoria[cat] = (porCategoria[cat] || 0) + mensual;
      }
    });

    res.json({
      suscripciones: subs,
      kpis: {
        costeMensualizadoTotal: Number(costeMensualizadoTotal.toFixed(2)),
        costeAnualTotal: Number(costeAnualTotal.toFixed(2)),
        totalActivas: subs.filter(s => s.estado === 'activo').length,
        totalPausadas: subs.filter(s => s.estado === 'pausado').length,
        porCategoria
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear suscripción
router.post('/', (req, res) => {
  try {
    const {
      nombre,
      categoria_servicio = 'Streaming',
      coste_recurrente,
      periodicidad = 'mensual',
      fecha_proxima_renovacion,
      cuenta_pago_id = null,
      estado = 'activo',
      compartido_con = '',
      icono = 'Tv',
      logo_url = '',
      color = '#6366f1',
      notas = ''
    } = req.body;

    if (!nombre || coste_recurrente === undefined) {
      return res.status(400).json({ error: 'Nombre y coste son obligatorios' });
    }

    const result = db.prepare(`
      INSERT INTO suscripciones_servicios (
        nombre, categoria_servicio, coste_recurrente, periodicidad, fecha_proxima_renovacion,
        cuenta_pago_id, estado, compartido_con, icono, logo_url, color, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nombre, categoria_servicio, parseFloat(coste_recurrente) || 0, periodicidad,
      fecha_proxima_renovacion, cuenta_pago_id ? parseInt(cuenta_pago_id) : null,
      estado, compartido_con, icono, logo_url, color, notas
    );

    res.status(201).json({ id: result.lastInsertRowid, message: 'Suscripción creada con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar suscripción
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      categoria_servicio,
      coste_recurrente,
      periodicidad,
      fecha_proxima_renovacion,
      cuenta_pago_id,
      estado,
      compartido_con,
      icono,
      logo_url,
      color,
      notas
    } = req.body;

    db.prepare(`
      UPDATE suscripciones_servicios SET
        nombre = COALESCE(?, nombre),
        categoria_servicio = COALESCE(?, categoria_servicio),
        coste_recurrente = COALESCE(?, coste_recurrente),
        periodicidad = COALESCE(?, periodicidad),
        fecha_proxima_renovacion = COALESCE(?, fecha_proxima_renovacion),
        cuenta_pago_id = ?,
        estado = COALESCE(?, estado),
        compartido_con = COALESCE(?, compartido_con),
        icono = COALESCE(?, icono),
        logo_url = COALESCE(?, logo_url),
        color = COALESCE(?, color),
        notas = COALESCE(?, notas)
      WHERE id = ?
    `).run(
      nombre, categoria_servicio, coste_recurrente !== undefined ? parseFloat(coste_recurrente) : null,
      periodicidad, fecha_proxima_renovacion, cuenta_pago_id ? parseInt(cuenta_pago_id) : null,
      estado, compartido_con, icono, logo_url, color, notas, parseInt(id)
    );

    res.json({ message: 'Suscripción actualizada con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar suscripción
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM suscripciones_servicios WHERE id = ?').run(parseInt(id));
    res.json({ message: 'Suscripción eliminada con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
