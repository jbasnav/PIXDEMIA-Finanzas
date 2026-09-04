const express = require('express');
const router = express.Router();
const db = require('../db');
const { applyMovimientoPasivoImpact, reverseMovimientoPasivoImpact } = require('../services/pasivoSyncService');
const { calcularFechasSerie } = require('../services/recurrenciaService');

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
      whereClauses.push('(m.cuenta_id = ? OR m.cuenta_destino_id = ?)');
      params.push(cuenta_id, cuenta_id);
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
      estado: 'COALESCE(m.es_consolidado, 1)',
      es_consolidado: 'COALESCE(m.es_consolidado, 1)',
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
        m.pasivo_id,
        p.nombre as pasivo_nombre,
        m.serie_id,
        m.frecuencia_recurrencia,
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
      LEFT JOIN prestamos_y_pasivos p ON m.pasivo_id = p.id
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
      pasivo_id = null,
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
      finalImporte = -Math.abs(finalImporte);
    }

    // Auto-detectar pasivo si no viene indicado explícitamente
    let finalPasivoId = pasivo_id ? Number(pasivo_id) : null;
    if (!finalPasivoId) {
      const pasivos = db.prepare('SELECT id, nombre FROM prestamos_y_pasivos').all();
      const textToMatch = `${concepto || ''} ${etiqueta_especial || ''} ${subcategoria || ''}`.toLowerCase();
      const matched = pasivos.find(p => textToMatch.includes(p.nombre.toLowerCase()));
      if (matched) finalPasivoId = matched.id;
    }

    const {
      serie_id = null,
      frecuencia_recurrencia = null
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO movimientos (
        usuario_id, fecha, cuenta_id, cuenta_imputada_id, categoria_id, subcategoria, concepto, importe,
        es_transferencia_interna, cuenta_destino_id, pasivo_id, serie_id, frecuencia_recurrencia, es_consolidado, etiqueta_especial, notas, origen_importacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Manual')
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
      finalPasivoId,
      serie_id || null,
      frecuencia_recurrencia || null,
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
        ci.nombre as cuenta_imputada_nombre,
        p.nombre as pasivo_nombre
      FROM movimientos m
      JOIN categorias cat ON m.categoria_id = cat.id
      JOIN cuentas c ON m.cuenta_id = c.id
      LEFT JOIN cuentas cd ON m.cuenta_destino_id = cd.id
      LEFT JOIN cuentas ci ON m.cuenta_imputada_id = ci.id
      LEFT JOIN prestamos_y_pasivos p ON m.pasivo_id = p.id
      WHERE m.id = ?
    `).get(info.lastInsertRowid);

    // Sincronizar impacto en pasivo si se crea como consolidado
    if (creado.pasivo_id && Number(creado.es_consolidado) === 1) {
      applyMovimientoPasivoImpact(creado);
    }

    res.status(201).json(creado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar movimiento
router.put('/:id', (req, res) => {
  try {
    const oldMov = db.prepare('SELECT * FROM movimientos WHERE id = ?').get(req.params.id);
    if (!oldMov) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    // Si el movimiento anterior estaba consolidado y vinculado a un pasivo, revertir su impacto antes de aplicar el nuevo
    if (oldMov.pasivo_id && Number(oldMov.es_consolidado) === 1) {
      reverseMovimientoPasivoImpact(oldMov);
    }

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
      pasivo_id,
      serie_id,
      frecuencia_recurrencia,
      actualizar_posteriores_serie,
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
          pasivo_id = ?,
          serie_id = COALESCE(?, serie_id),
          frecuencia_recurrencia = COALESCE(?, frecuencia_recurrencia),
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
      pasivo_id !== undefined ? (pasivo_id ? Number(pasivo_id) : null) : oldMov.pasivo_id,
      serie_id !== undefined ? serie_id : oldMov.serie_id,
      frecuencia_recurrencia !== undefined ? frecuencia_recurrencia : oldMov.frecuencia_recurrencia,
      es_consolidado !== undefined ? Number(es_consolidado) : null,
      etiqueta_especial,
      notas,
      req.params.id
    );

    // Si se solicita propagar cambios a los movimientos futuros previstos de la serie
    const activeSerieId = serie_id || oldMov.serie_id;
    if (actualizar_posteriores_serie && activeSerieId) {
      const propStmt = db.prepare(`
        UPDATE movimientos
        SET categoria_id = COALESCE(?, categoria_id),
            cuenta_id = COALESCE(?, cuenta_id),
            cuenta_imputada_id = ?,
            subcategoria = COALESCE(?, subcategoria),
            concepto = COALESCE(?, concepto),
            importe = COALESCE(?, importe),
            cuenta_destino_id = ?,
            pasivo_id = ?,
            etiqueta_especial = COALESCE(?, etiqueta_especial),
            notas = COALESCE(?, notas)
        WHERE serie_id = ? AND id != ? AND fecha >= ? AND COALESCE(es_consolidado, 1) = 0
      `);

      propStmt.run(
        categoria_id,
        cuenta_id,
        cuenta_imputada_id !== undefined ? (cuenta_imputada_id ? Number(cuenta_imputada_id) : null) : null,
        subcategoria,
        concepto,
        importe !== undefined ? Number(importe) : null,
        cuenta_destino_id !== undefined ? (cuenta_destino_id ? Number(cuenta_destino_id) : null) : oldMov.cuenta_destino_id,
        pasivo_id !== undefined ? (pasivo_id ? Number(pasivo_id) : null) : oldMov.pasivo_id,
        etiqueta_especial,
        notas,
        activeSerieId,
        req.params.id,
        fecha || oldMov.fecha
      );
    }

    const actualizado = db.prepare(`
      SELECT 
        m.*, 
        c.nombre as cuenta_nombre, 
        c.color_hex as cuenta_color,
        cat.nombre as categoria_nombre,
        cat.color as categoria_color,
        cat.tipo as categoria_tipo,
        cd.nombre as cuenta_destino_nombre,
        ci.nombre as cuenta_imputada_nombre,
        p.nombre as pasivo_nombre
      FROM movimientos m
      JOIN categorias cat ON m.categoria_id = cat.id
      JOIN cuentas c ON m.cuenta_id = c.id
      LEFT JOIN cuentas cd ON m.cuenta_destino_id = cd.id
      LEFT JOIN cuentas ci ON m.cuenta_imputada_id = ci.id
      LEFT JOIN prestamos_y_pasivos p ON m.pasivo_id = p.id
      WHERE m.id = ?
    `).get(req.params.id);

    // Aplicar nuevo impacto sobre el pasivo si queda consolidado
    if (actualizado.pasivo_id && Number(actualizado.es_consolidado) === 1) {
      applyMovimientoPasivoImpact(actualizado);
    }

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Convertir movimiento en serie repetitiva / Generar ocurrencias futuras / Agrupar serie
router.post('/:id/convertir-en-serie', (req, res) => {
  try {
    const mov = db.prepare('SELECT * FROM movimientos WHERE id = ?').get(req.params.id);
    if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });

    const {
      frecuencia = 'mensual',
      modo_fin = 'fecha_fin', // 'fecha_fin' | 'numero_cuotas' | 'solo_fin'
      fecha_inicio = null,
      fecha_fin = null,
      numero_cuotas = 12,
      eliminar_futuros_existentes = true,
      agrupar_existentes = true
    } = req.body;

    // Asignar o mantener serie_id
    let serieId = mov.serie_id;
    if (!serieId) {
      serieId = `serie_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      db.prepare('UPDATE movimientos SET serie_id = ?, frecuencia_recurrencia = ? WHERE id = ?')
        .run(serieId, frecuencia, mov.id);
      mov.serie_id = serieId;
      mov.frecuencia_recurrencia = frecuencia;
    } else {
      db.prepare('UPDATE movimientos SET frecuencia_recurrencia = ? WHERE id = ?')
        .run(frecuencia, mov.id);
      mov.frecuencia_recurrencia = frecuencia;
    }

    // Auto-identificar y agrupar todos los movimientos existentes coincidentes en la base de datos
    if (agrupar_existentes && mov.concepto && mov.concepto.trim()) {
      const cleanConcepto = mov.concepto.trim();
      db.prepare(`
        UPDATE movimientos 
        SET serie_id = ?,
            frecuencia_recurrencia = ?,
            cuenta_destino_id = COALESCE(?, cuenta_destino_id),
            pasivo_id = COALESCE(?, pasivo_id)
        WHERE (serie_id IS NULL OR serie_id = '' OR serie_id != ?)
          AND LOWER(TRIM(concepto)) = LOWER(TRIM(?))
      `).run(
        serieId, 
        frecuencia, 
        mov.cuenta_destino_id || null, 
        mov.pasivo_id || null, 
        serieId, 
        cleanConcepto
      );
    }

    const fechaBase = fecha_inicio || mov.fecha;

    // Si se solicita limpiar futuros previos no consolidados de esta serie
    if (eliminar_futuros_existentes) {
      db.prepare(`
        DELETE FROM movimientos 
        WHERE serie_id = ? AND id != ? AND fecha >= ? AND COALESCE(es_consolidado, 1) = 0
      `).run(serieId, mov.id, fechaBase);
    }

    const fechasFuturas = calcularFechasSerie({
      fechaBase,
      frecuencia,
      modoFin: modo_fin,
      fechaFin: fecha_fin,
      numeroCuotas: Number(numeroCuotas),
      incluirBase: false
    });

    const insertStmt = db.prepare(`
      INSERT INTO movimientos (
        usuario_id, fecha, cuenta_id, cuenta_imputada_id, categoria_id, subcategoria,
        concepto, importe, es_transferencia_interna, cuenta_destino_id, pasivo_id,
        serie_id, frecuencia_recurrencia, es_consolidado, etiqueta_especial, notas, origen_importacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'Serie Recurrente')
    `);

    const generatedIds = [];
    for (const f of fechasFuturas) {
      // Evitar duplicar en la misma fecha para la misma serie o con el mismo concepto
      const existeSerie = db.prepare('SELECT id FROM movimientos WHERE serie_id = ? AND fecha = ?').get(serieId, f);
      if (existeSerie) continue;

      const existeConcepto = db.prepare(`
        SELECT id FROM movimientos 
        WHERE fecha = ? AND cuenta_id = ? AND LOWER(TRIM(concepto)) = LOWER(TRIM(?))
      `).get(f, mov.cuenta_id, mov.concepto.trim());

      if (existeConcepto) {
        db.prepare('UPDATE movimientos SET serie_id = ?, frecuencia_recurrencia = ? WHERE id = ?')
          .run(serieId, frecuencia, existeConcepto.id);
        generatedIds.push(existeConcepto.id);
      } else {
        const info = insertStmt.run(
          mov.usuario_id || 1,
          f,
          mov.cuenta_id,
          mov.cuenta_imputada_id || null,
          mov.categoria_id,
          mov.subcategoria || '',
          mov.concepto,
          mov.importe,
          mov.es_transferencia_interna || 0,
          mov.cuenta_destino_id || null,
          mov.pasivo_id || null,
          serieId,
          frecuencia,
          mov.etiqueta_especial || null,
          mov.notas || null
        );
        generatedIds.push(info.lastInsertRowid);
      }
    }

    res.json({
      success: true,
      serie_id: serieId,
      frecuencia,
      total_generados: generatedIds.length,
      fechas: fechasFuturas
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar movimientos futuros de una serie
router.delete('/:id/serie-futuros', (req, res) => {
  try {
    const mov = db.prepare('SELECT * FROM movimientos WHERE id = ?').get(req.params.id);
    if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado' });
    if (!mov.serie_id) return res.status(400).json({ error: 'Este movimiento no forma parte de una serie' });

    const info = db.prepare(`
      DELETE FROM movimientos 
      WHERE serie_id = ? AND id != ? AND fecha >= ? AND COALESCE(es_consolidado, 1) = 0
    `).run(mov.serie_id, mov.id, mov.fecha);

    res.json({ success: true, eliminados: info.changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle rápido de consolidación
router.patch('/:id/toggle-consolidado', (req, res) => {
  try {
    const movBefore = db.prepare('SELECT * FROM movimientos WHERE id = ?').get(req.params.id);
    if (!movBefore) return res.status(404).json({ error: 'Movimiento no encontrado' });

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
        cd.nombre as cuenta_destino_nombre,
        p.nombre as pasivo_nombre
      FROM movimientos m
      JOIN categorias cat ON m.categoria_id = cat.id
      JOIN cuentas c ON m.cuenta_id = c.id
      LEFT JOIN cuentas cd ON m.cuenta_destino_id = cd.id
      LEFT JOIN prestamos_y_pasivos p ON m.pasivo_id = p.id
      WHERE m.id = ?
    `).get(req.params.id);

    // Sincronizar pasivo según cambio de estado
    if (actualizado.pasivo_id) {
      if (Number(actualizado.es_consolidado) === 1) {
        applyMovimientoPasivoImpact(actualizado);
      } else {
        reverseMovimientoPasivoImpact(movBefore);
      }
    }

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar movimiento
router.delete('/:id', (req, res) => {
  try {
    const mov = db.prepare('SELECT * FROM movimientos WHERE id = ?').get(req.params.id);
    if (mov && mov.pasivo_id && Number(mov.es_consolidado) === 1) {
      reverseMovimientoPasivoImpact(mov);
    }

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
