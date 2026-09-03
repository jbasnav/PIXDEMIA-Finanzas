const express = require('express');
const router = express.Router();
const db = require('../db');

// Dashboard de Alimentación & Resumen Global
router.get('/dashboard', (req, res) => {
  try {
    const personas = db.prepare('SELECT * FROM personas_hogar WHERE activo = 1 ORDER BY id ASC').all();
    const productos = db.prepare('SELECT * FROM productos_alimentacion ORDER BY categoria ASC, nombre ASC').all();
    const menus = db.prepare('SELECT * FROM menus_planificados ORDER BY id ASC').all();

    // Sumar factor de consumo de las personas
    const totalPersonas = personas.length || 4;
    const factorConsumoTotal = personas.reduce((acc, p) => acc + (p.factor_consumo || 1.0), 0) || 4;

    // Menú activo o principal
    const menuActivo = menus[0] || { coste_estimado_semanal: 148.50 };
    const costeSemanal = menuActivo.coste_estimado_semanal || 148.50;
    const costeMensualEstimado = costeSemanal * 4.33; // 4.33 semanas al mes
    const costePersonaDia = (costeSemanal / (7 * totalPersonas));

    // Obtener gasto real en alimentación en 2026 a partir de los movimientos
    const gastoRealMovs = db.prepare(`
      SELECT COALESCE(SUM(ABS(m.importe)), 0) as totalGasto,
             COUNT(DISTINCT strftime('%m', m.fecha)) as mesesConGasto
      FROM movimientos m
      JOIN categorias cat ON m.categoria_id = cat.id
      WHERE strftime('%Y', m.fecha) = '2026'
        AND m.es_transferencia_interna = 0
        AND LOWER(cat.nombre) LIKE '%alimentaci%'
    `).get();

    const totalGastoReal2026 = gastoRealMovs?.totalGasto || 0;
    const mesesConGasto = gastoRealMovs?.mesesConGasto || 1;
    const gastoMedioMensualReal = mesesConGasto > 0 ? (totalGastoReal2026 / mesesConGasto) : 0;

    res.json({
      personas,
      totalPersonas,
      factorConsumoTotal: Number(factorConsumoTotal.toFixed(2)),
      menuActivo,
      costeSemanalEstimado: Number(costeSemanal.toFixed(2)),
      costeMensualEstimado: Number(costeMensualEstimado.toFixed(2)),
      costePersonaDia: Number(costePersonaDia.toFixed(2)),
      gastoMedioMensualReal: Number(gastoMedioMensualReal.toFixed(2)),
      totalGastoReal2026: Number(totalGastoReal2026.toFixed(2)),
      desviacionMensual: Number((gastoMedioMensualReal - costeMensualEstimado).toFixed(2)),
      totalProductos: productos.length,
      totalMenus: menus.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar productos con sus precios por comercio
router.get('/productos', (req, res) => {
  try {
    const productos = db.prepare(`
      SELECT p.*
      FROM productos_alimentacion p
      ORDER BY p.categoria ASC, p.nombre ASC
    `).all();

    // Obtener precios por comercio para cada producto
    const precios = db.prepare(`
      SELECT ph.*
      FROM precios_historico_comercios ph
      ORDER BY ph.fecha_registro DESC
    `).all();

    const prodsWithPrices = productos.map(p => {
      const pPrices = precios.filter(pr => pr.producto_id === p.id);
      
      // Agrupar último precio por comercio
      const ultimosPorComercio = {};
      pPrices.forEach(pr => {
        if (!ultimosPorComercio[pr.comercio]) {
          ultimosPorComercio[pr.comercio] = pr.precio;
        }
      });

      return {
        ...p,
        preciosPorComercio: ultimosPorComercio,
        historico: pPrices
      };
    });

    res.json(prodsWithPrices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear producto
router.post('/productos', (req, res) => {
  try {
    const {
      nombre,
      categoria = 'Despensa',
      unidad_medida = 'kg',
      precio_referencia_actual = 0,
      comercio_habitual = 'Eroski',
      notas = ''
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    }

    const result = db.prepare(`
      INSERT INTO productos_alimentacion (
        nombre, categoria, unidad_medida, precio_referencia_actual, comercio_habitual, notas
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(nombre, categoria, unidad_medida, parseFloat(precio_referencia_actual) || 0, comercio_habitual, notas);

    const prodId = result.lastInsertRowid;

    // Registrar precio inicial en histórico
    if (precio_referencia_actual > 0) {
      const today = new Date().toISOString().split('T')[0];
      db.prepare(`
        INSERT INTO precios_historico_comercios (producto_id, comercio, precio, fecha_registro)
        VALUES (?, ?, ?, ?)
      `).run(prodId, comercio_habitual, parseFloat(precio_referencia_actual), today);
    }

    res.status(201).json({ id: prodId, message: 'Producto creado con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar nuevo precio en histórico
router.post('/precios', (req, res) => {
  try {
    const { producto_id, comercio, precio, fecha_registro, es_oferta = 0, notas = '' } = req.body;

    if (!producto_id || !comercio || precio === undefined) {
      return res.status(400).json({ error: 'Producto, comercio y precio son obligatorios' });
    }

    const fecha = fecha_registro || new Date().toISOString().split('T')[0];
    const precioNum = parseFloat(precio) || 0;

    db.prepare(`
      INSERT INTO precios_historico_comercios (producto_id, comercio, precio, fecha_registro, es_oferta, notas)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(parseInt(producto_id), comercio, precioNum, fecha, es_oferta ? 1 : 0, notas);

    // Actualizar precio de referencia en el producto
    db.prepare(`
      UPDATE productos_alimentacion SET precio_referencia_actual = ?, comercio_habitual = ? WHERE id = ?
    `).run(precioNum, comercio, parseInt(producto_id));

    res.status(201).json({ message: 'Precio registrado con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Histórico de precios agrupado para gráficas temporales de evolución e inflación
router.get('/historico-precios', (req, res) => {
  try {
    const { productoId } = req.query;

    let query = `
      SELECT ph.id, ph.producto_id, p.nombre as producto_nombre, p.categoria, p.unidad_medida,
             ph.comercio, ph.precio, ph.fecha_registro, ph.es_oferta
      FROM precios_historico_comercios ph
      JOIN productos_alimentacion p ON ph.producto_id = p.id
    `;
    const params = [];
    if (productoId) {
      query += ` WHERE ph.producto_id = ? `;
      params.push(parseInt(productoId));
    }
    query += ` ORDER BY ph.fecha_registro ASC `;

    const registros = db.prepare(query).all(...params);

    // Formatear datos para gráfica Recharts (eje X = fecha_registro)
    const timelineMap = {};
    registros.forEach(r => {
      const d = r.fecha_registro;
      if (!timelineMap[d]) {
        timelineMap[d] = { fecha: d };
      }
      const key = `${r.producto_nombre} (${r.comercio})`;
      timelineMap[d][key] = r.precio;
      timelineMap[d][r.comercio] = r.precio;
    });

    res.json({
      registros,
      timeline: Object.values(timelineMap)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Menús Planificados
router.get('/menus', (req, res) => {
  try {
    const menus = db.prepare('SELECT * FROM menus_planificados ORDER BY id ASC').all();
    const formatted = menus.map(m => {
      let detalles = {};
      try {
        detalles = JSON.parse(m.detalles_json || '{}');
      } catch (e) {
        detalles = {};
      }
      return {
        ...m,
        detalles
      };
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/menus', (req, res) => {
  try {
    const {
      nombre,
      descripcion = '',
      temporada_o_tipo = 'Semanal',
      personas_comensales = 4,
      coste_estimado_semanal = 0,
      detalles = {}
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del menú es obligatorio' });
    }

    const result = db.prepare(`
      INSERT INTO menus_planificados (
        nombre, descripcion, temporada_o_tipo, personas_comensales, coste_estimado_semanal, detalles_json
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      nombre, descripcion, temporada_o_tipo, parseInt(personas_comensales) || 4,
      parseFloat(coste_estimado_semanal) || 0, JSON.stringify(detalles)
    );

    res.status(201).json({ id: result.lastInsertRowid, message: 'Menú creado con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/menus/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      descripcion,
      temporada_o_tipo,
      personas_comensales,
      coste_estimado_semanal,
      detalles
    } = req.body;

    db.prepare(`
      UPDATE menus_planificados SET
        nombre = COALESCE(?, nombre),
        descripcion = COALESCE(?, descripcion),
        temporada_o_tipo = COALESCE(?, temporada_o_tipo),
        personas_comensales = COALESCE(?, personas_comensales),
        coste_estimado_semanal = COALESCE(?, coste_estimado_semanal),
        detalles_json = COALESCE(?, detalles_json)
      WHERE id = ?
    `).run(
      nombre, descripcion, temporada_o_tipo,
      personas_comensales ? parseInt(personas_comensales) : null,
      coste_estimado_semanal ? parseFloat(coste_estimado_semanal) : null,
      detalles ? JSON.stringify(detalles) : null,
      parseInt(id)
    );

    res.json({ message: 'Menú actualizado con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/menus/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM menus_planificados WHERE id = ?').run(parseInt(id));
    res.json({ message: 'Menú eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/productos/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM productos_alimentacion WHERE id = ?').run(parseInt(id));
    res.json({ message: 'Producto eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Personas del Hogar
router.get('/personas', (req, res) => {
  try {
    const personas = db.prepare('SELECT * FROM personas_hogar ORDER BY id ASC').all();
    res.json(personas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/personas', (req, res) => {
  try {
    const { nombre, rol = 'Adulto', factor_consumo = 1.0, activo = 1, notas = '' } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre es obligatorio' });

    const result = db.prepare(`
      INSERT INTO personas_hogar (nombre, rol, factor_consumo, activo, notas)
      VALUES (?, ?, ?, ?, ?)
    `).run(nombre, rol, parseFloat(factor_consumo) || 1.0, activo ? 1 : 0, notas);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Persona agregada con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
