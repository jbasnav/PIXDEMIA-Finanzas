const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar movimientos con filtros avanzados
router.get('/', (req, res) => {
  try {
    const usuarioId = req.query.usuario_id || req.headers['x-usuario-id'] || 1;
    const {
      cuenta_id,
      categoria_id,
      tipo_categoria,
      mes,
      ano = 2026,
      fecha_inicio,
      fecha_fin,
      busqueda,
      etiqueta_especial,
      es_transferencia,
      es_consolidado,
      sort_by = 'fecha',
      order = 'desc',
      limit = 100,
      offset = 0
    } = req.query;

    let whereClauses = ['m.usuario_id = ?'];
    let params = [usuarioId];

    if (cuenta_id) {
      whereClauses.push('(m.cuenta_id = ? OR m.cuenta_destino_id = ? OR m.cuenta_imputada_id = ?)');
      params.push(cuenta_id, cuenta_id, cuenta_id);
    }

    if (categoria_id) {
      whereClauses.push('m.categoria_id = ?');
      params.push(categoria_id);
    }

    if (tipo_categoria) {
      whereClauses.push('cat.tipo = ?');
      params.push(tipo_categoria);
    }

    if (ano) {
      whereClauses.push("strftime('%Y', m.fecha) = ?");
      params.push(String(ano));
    }

    if (mes) {
      whereClauses.push("strftime('%m', m.fecha) = ?");
      params.push(String(mes).padStart(2, '0'));
    }

    if (fecha_inicio) {
      whereClauses.push('m.fecha >= ?');
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      whereClauses.push('m.fecha <= ?');
      params.push(fecha_fin);
    }

    if (etiqueta_especial) {
      whereClauses.push('m.etiqueta_especial = ?');
      params.push(etiqueta_especial);
    }

    if (es_transferencia !== undefined && es_transferencia !== '') {
      whereClauses.push('m.es_transferencia_interna = ?');
      params.push(Number(es_transferencia));
    }

    if (es_consolidado !== undefined && es_consolidado !== '') {
      whereClauses.push('COALESCE(m.es_consolidado, 1) = ?');
      params.push(Number(es_consolidado));
    }

    if (busqueda) {
      whereClauses.push('(m.concepto LIKE ? OR m.subcategoria LIKE ? OR m.notas LIKE ?)');
      const q = `%${busqueda}%`;
      params.push(q, q, q);
    }

    const whereSql = whereClauses.join(' AND ');

    // Contar total
    const countSql = `
      SELECT COUNT(*) as total
      FROM movimientos m
      JOIN categorias cat ON m.categoria_id = cat.id
      JOIN cuentas c ON m.cuenta_id = c.id
      WHERE ${whereSql}
    `;
    const totalCount = db.prepare(countSql).get(...params).total;

    // Mapeo seguro de columnas para ordenación
    const sortColumnMap = {
      fecha: 'm.fecha',
      cuenta: 'c.nombre',
      concepto: 'm.concepto',
      categoria: 'cat.nombre',
      importe: 'm.importe',
      proyecto: 'm.etiqueta_especial'
    };
    const sortCol = sortColumnMap[sort_by] || 'm.fecha';
    const orderDir = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Obtener resultados paginados
    const querySql = `
      SELECT 
        m.id,
        m.usuario_id,
        m.fecha,
        m.cuenta_id,
        c.nombre as cuenta_nombre,
        c.color_hex as cuenta_color,
        m.cuenta_imputada_id,
        ci.nombre as cuenta_imputada_nombre,
        ci.color_hex as cuenta_imputada_color,
        m.categoria_id,
        cat.nombre as categoria_nombre,
        cat.tipo as categoria_tipo,
        cat.icono as categoria_icono,
        cat.color as categoria_color,
        m.subcategoria,
        m.concepto,
        m.importe,
        m.es_transferencia_interna,
        m.cuenta_destino_id,
        cd.nombre as cuenta_destino_nombre,
        COALESCE(m.es_consolidado, 1) as es_consolidado,
        m.etiqueta_especial,
        m.notas,
        m.origen_importacion,
        m.created_at
      FROM movimientos m
      JOIN categorias cat ON m.categoria_id = cat.id
      JOIN cuentas c ON m.cuenta_id = c.id
      LEFT JOIN cuentas cd ON m.cuenta_destino_id = cd.id
      LEFT JOIN cuentas ci ON m.cuenta_imputada_id = ci.id
      WHERE ${whereSql}
      ORDER BY ${sortCol} ${orderDir}, m.id ${orderDir}
      LIMIT ? OFFSET ?
    `;

    const movimientos = db.prepare(querySql).all(...params, Number(limit), Number(offset));

    // Calcular saldos cronológicos progresivos (Saldo Cuenta y Saldo Global después de cada movimiento)
    const allRowsCronologicos = db.prepare(`
      SELECT m.id, m.fecha, m.cuenta_id, m.cuenta_destino_id, m.importe, m.es_transferencia_interna
      FROM movimientos m
      ORDER BY m.fecha ASC, m.id ASC
    `).all();

    const cuentasList = db.prepare('SELECT id, tipo, saldo_inicial_2026 FROM cuentas').all();
    const accountRunningBalances = {};
    let globalLiquidRunning = 0;

    cuentasList.forEach(c => {
      accountRunningBalances[c.id] = c.saldo_inicial_2026 || 0;
      if (c.tipo === 'corriente' || c.tipo === 'ahorro_emergencia') {
        globalLiquidRunning += (c.saldo_inicial_2026 || 0);
      }
    });

    const balancesMap = new Map();
    for (const r of allRowsCronologicos) {
      const isTransfer = r.es_transferencia_interna === 1;
      if (isTransfer) {
        const amt = Math.abs(r.importe);
        accountRunningBalances[r.cuenta_id] = (accountRunningBalances[r.cuenta_id] || 0) - amt;
        if (r.cuenta_destino_id) {
          accountRunningBalances[r.cuenta_destino_id] = (accountRunningBalances[r.cuenta_destino_id] || 0) + amt;
        }
      } else {
        accountRunningBalances[r.cuenta_id] = (accountRunningBalances[r.cuenta_id] || 0) + r.importe;
        globalLiquidRunning += r.importe;
      }

      balancesMap.set(r.id, {
        saldo_cuenta: Number((accountRunningBalances[r.cuenta_id] || 0).toFixed(2)),
        saldo_global: Number(globalLiquidRunning.toFixed(2))
      });
    }

    const movimientosEnriquecidos = movimientos.map(m => {
      const b = balancesMap.get(m.id) || { saldo_cuenta: 0, saldo_global: 0 };
      return {
        ...m,
        saldo_cuenta: b.saldo_cuenta,
        saldo_global: b.saldo_global
      };
    });

    res.json({
      total: totalCount,
      limit: Number(limit),
      offset: Number(offset),
      data: movimientosEnriquecidos,
      movimientos: movimientosEnriquecidos
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear movimiento
router.post('/', (req, res) => {
  try {
    const usuarioId = req.body.usuario_id || req.headers['x-usuario-id'] || 1;
    const {
      fecha,
      cuenta_id,
      cuenta_imputada_id = null,
      categoria_id,
      subcategoria = '',
      concepto,
      importe,
      es_transferencia_interna = 0,
      cuenta_destino_id = null,
      es_consolidado = 1,
      etiqueta_especial = null,
      notas = ''
    } = req.body;

    if (!fecha || !cuenta_id || !categoria_id || !concepto || importe === undefined) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (fecha, cuenta, categoria, concepto, importe)' });
    }

    // Regla de negocio para transferencias internas
    let finalEsTransferencia = Number(es_transferencia_interna);
    let finalCuentaDestino = cuenta_destino_id;
    let finalImporte = Number(importe);

    if (finalEsTransferencia === 1) {
      if (!finalCuentaDestino) {
        return res.status(400).json({ error: 'Para transferencias internas es obligatorio especificar cuenta de destino' });
      }
      if (Number(cuenta_id) === Number(finalCuentaDestino)) {
        return res.status(400).json({ error: 'La cuenta de origen y destino no pueden ser la misma' });
      }
      // Asegurarse de que el importe del movimiento base es negativo (salida del origen)
      finalImporte = -Math.abs(finalImporte);
    }

    const stmt = db.prepare(`
      INSERT INTO movimientos (
        usuario_id, fecha, cuenta_id, cuenta_imputada_id, categoria_id, subcategoria, concepto, importe,
        es_transferencia_interna, cuenta_destino_id, es_consolidado, etiqueta_especial, notas, origen_importacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Manual')
    `);

    const info = stmt.run(
      Number(usuarioId),
      fecha,
      Number(cuenta_id),
      cuenta_imputada_id ? Number(cuenta_imputada_id) : null,
      Number(categoria_id),
      subcategoria,
      concepto,
      finalImporte,
      finalEsTransferencia,
      finalCuentaDestino ? Number(finalCuentaDestino) : null,
      es_consolidado !== undefined ? Number(es_consolidado) : 1,
      etiqueta_especial || null,
      notas || ''
    );

    // Si la subcategoría es nueva, agregarla a la tabla de subcategorías para sugerencias
    if (subcategoria && subcategoria.trim()) {
      try {
        db.prepare('INSERT OR IGNORE INTO subcategorias_o_tiendas (categoria_id, nombre) VALUES (?, ?)')
          .run(Number(categoria_id), subcategoria.trim());
      } catch (e) {
        // Ignorar si ya existe
      }
    }

    const creado = db.prepare(`
      SELECT 
        m.*, 
        c.nombre as cuenta_nombre, 
        cat.nombre as categoria_nombre,
        cd.nombre as cuenta_destino_nombre,
        ci.nombre as cuenta_imputada_nombre
      FROM movimientos m
      JOIN categorias cat ON m.categoria_id = cat.id
      JOIN cuentas c ON m.cuenta_id = c.id
      LEFT JOIN cuentas cd ON m.cuenta_destino_id = cd.id
      LEFT JOIN cuentas ci ON m.cuenta_imputada_id = ci.id
      WHERE m.id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json(creado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar movimiento
router.put('/:id', (req, res) => {
  try {
    const {
      fecha,
      cuenta_id,
      cuenta_imputada_id,
      categoria_id,
      subcategoria,
      concepto,
      importe,
      es_transferencia_interna,
      cuenta_destino_id,
      es_consolidado,
      etiqueta_especial,
      notas
    } = req.body;

    const stmt = db.prepare(`
      UPDATE movimientos
      SET fecha = COALESCE(?, fecha),
          cuenta_id = COALESCE(?, cuenta_id),
          cuenta_imputada_id = ?,
          categoria_id = COALESCE(?, categoria_id),
          subcategoria = COALESCE(?, subcategoria),
          concepto = COALESCE(?, concepto),
          importe = COALESCE(?, importe),
          es_transferencia_interna = COALESCE(?, es_transferencia_interna),
          cuenta_destino_id = COALESCE(?, cuenta_destino_id),
          es_consolidado = COALESCE(?, es_consolidado),
          etiqueta_especial = COALESCE(?, etiqueta_especial),
          notas = COALESCE(?, notas)
      WHERE id = ?
    `);

    stmt.run(
      fecha,
      cuenta_id,
      cuenta_imputada_id !== undefined ? (cuenta_imputada_id ? Number(cuenta_imputada_id) : null) : null,
      categoria_id,
      subcategoria,
      concepto,
      importe !== undefined ? Number(importe) : null,
      es_transferencia_interna !== undefined ? Number(es_transferencia_interna) : null,
      cuenta_destino_id,
      es_consolidado !== undefined ? Number(es_consolidado) : null,
      etiqueta_especial,
      notas,
      req.params.id
    );

    const actualizado = db.prepare(`
      SELECT 
        m.*, 
        c.nombre as cuenta_nombre, 
        c.color_hex as cuenta_color,
        cat.nombre as categoria_nombre,
        cat.color as categoria_color,
        cat.tipo as categoria_tipo,
        cd.nombre as cuenta_destino_nombre,
        ci.nombre as cuenta_imputada_nombre
      FROM movimientos m
      JOIN categorias cat ON m.categoria_id = cat.id
      JOIN cuentas c ON m.cuenta_id = c.id
      LEFT JOIN cuentas cd ON m.cuenta_destino_id = cd.id
      LEFT JOIN cuentas ci ON m.cuenta_imputada_id = ci.id
      WHERE m.id = ?
    `).get(req.params.id);

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle rápido de consolidación
router.patch('/:id/toggle-consolidado', (req, res) => {
  try {
    db.prepare(`
      UPDATE movimientos
      SET es_consolidado = CASE WHEN COALESCE(es_consolidado, 1) = 1 THEN 0 ELSE 1 END
      WHERE id = ?
    `).run(req.params.id);

    const actualizado = db.prepare(`
      SELECT 
        m.*, 
        c.nombre as cuenta_nombre, 
        c.color_hex as cuenta_color,
        cat.nombre as categoria_nombre,
        cat.color as categoria_color,
        cat.tipo as categoria_tipo,
        cd.nombre as cuenta_destino_nombre
      FROM movimientos m
      JOIN categorias cat ON m.categoria_id = cat.id
      JOIN cuentas c ON m.cuenta_id = c.id
      LEFT JOIN cuentas cd ON m.cuenta_destino_id = cd.id
      WHERE m.id = ?
    `).get(req.params.id);

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar movimiento
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM movimientos WHERE id = ?').run(req.params.id);
    res.json({ message: 'Movimiento eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resumen de proyectos especiales y etiquetas (ej: Obra Local / Riff / Reonor, Viajes, etc.)
router.get('/proyectos-resumen', (req, res) => {
  try {
    const proyectos = db.prepare(`
      SELECT 
        etiqueta_especial as etiqueta,
        COUNT(*) as total_movimientos,
        COALESCE(SUM(CASE WHEN importe < 0 THEN ABS(importe) ELSE 0 END), 0) as total_gastado,
        COALESCE(SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END), 0) as total_ingresado,
        MIN(fecha) as primer_movimiento,
        MAX(fecha) as ultimo_movimiento
      FROM movimientos
      WHERE etiqueta_especial IS NOT NULL AND etiqueta_especial != ''
      GROUP BY etiqueta_especial
      ORDER BY total_gastado DESC
    `).all();

    res.json(proyectos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
