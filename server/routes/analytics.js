const express = require('express');
const router = express.Router();
const db = require('../db');
const { getDashboardMetrics } = require('../services/financeCalculator');

// Dashboard KPIs y métricas principales
router.get('/dashboard', (req, res) => {
  try {
    const usuarioId = req.query.usuario_id || req.headers['x-usuario-id'] || 1;
    const year = parseInt(req.query.year) || 2026;
    const month = req.query.month ? parseInt(req.query.month) : null;

    const metrics = getDashboardMetrics(year, month, usuarioId);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Control de presupuestos y alertas de sobregasto por categoría
router.get('/presupuestos', (req, res) => {
  try {
    const usuarioId = req.query.usuario_id || req.headers['x-usuario-id'] || 1;
    const year = parseInt(req.query.year) || 2026;
    const month = req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1;
    const formattedMonth = String(month).padStart(2, '0');

    // Categorías de gasto con su límite presupuestario y gasto real acumulado
    const query = `
      SELECT 
        cat.id as categoria_id,
        cat.nombre as categoria_nombre,
        cat.color as categoria_color,
        cat.tipo as categoria_tipo,
        COALESCE(p.limite_mensual, 0) as limite_mensual,
        COALESCE(SUM(ABS(m.importe)), 0) as gasto_real
      FROM categorias cat
      LEFT JOIN presupuestos p ON p.categoria_id = cat.id AND p.ano = ? AND (p.mes = ? OR p.mes = 0) AND p.usuario_id = ?
      LEFT JOIN movimientos m ON m.categoria_id = cat.id 
        AND m.usuario_id = ?
        AND strftime('%Y', m.fecha) = ?
        AND strftime('%m', m.fecha) = ?
        AND m.es_transferencia_interna = 0
        AND m.importe < 0
      WHERE cat.tipo IN ('gasto_fijo', 'gasto_variable')
      GROUP BY cat.id, cat.nombre, cat.color, cat.tipo, p.limite_mensual
      ORDER BY gasto_real DESC
    `;

    const items = db.prepare(query).all(year, month, Number(usuarioId), Number(usuarioId), String(year), formattedMonth);

    const budgetsWithAlerts = items.map(item => {
      const limite = item.limite_mensual > 0 ? item.limite_mensual : 0;
      const pct = limite > 0 ? (item.gasto_real / limite) * 100 : 0;
      const superado = limite > 0 && item.gasto_real > limite;
      const cercaLimite = limite > 0 && item.gasto_real >= (limite * 0.85) && !superado;

      return {
        ...item,
        limite_mensual: limite,
        gasto_real: Number(item.gasto_real.toFixed(2)),
        porcentaje_consumido: Number(pct.toFixed(1)),
        alerta: superado ? 'superado' : (cercaLimite ? 'cuidado' : 'ok')
      };
    });

    res.json(budgetsWithAlerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Guardar o actualizar un presupuesto
router.post('/presupuestos', (req, res) => {
  try {
    const { categoria_id, cuenta_id = null, mes = 0, ano = 2026, limite_mensual } = req.body;
    if (!categoria_id || limite_mensual === undefined) {
      return res.status(400).json({ error: 'categoria_id y limite_mensual son requeridos' });
    }

    const stmt = db.prepare(`
      INSERT INTO presupuestos (categoria_id, cuenta_id, mes, ano, limite_mensual)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(categoria_id, cuenta_id, mes, ano) DO UPDATE SET limite_mensual = excluded.limite_mensual
    `);

    stmt.run(Number(categoria_id), cuenta_id, Number(mes), Number(ano), Number(limite_mensual));
    res.json({ message: 'Presupuesto actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
