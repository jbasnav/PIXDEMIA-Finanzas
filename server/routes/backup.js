const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');

const BACKUP_DIR = path.resolve(__dirname, '../../data/backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 1. Exportar backup completo en JSON
router.get('/export', (req, res) => {
  try {
    const tables = [
      'usuarios',
      'cuentas',
      'categorias',
      'movimientos',
      'pasivos',
      'presupuestos',
      'suscripciones',
      'alimentacion_articulos',
      'alimentacion_tickets'
    ];

    const data = {};
    const summary = {};

    for (const table of tables) {
      try {
        const rows = db.prepare('SELECT * FROM ' + table).all();
        data[table] = rows;
        summary[table] = rows.length;
      } catch (e) {
        data[table] = [];
        summary[table] = 0;
      }
    }

    const backupPayload = {
      app: 'PIXDEMIA-Finanzas',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      summary,
      data
    };

    // Guardar también una copia local en data/backups/
    const dateStamp = new Date().toISOString().replace(/[:.]/g, '-');
    const localBackupPath = path.join(BACKUP_DIR, 'backup_' + dateStamp + '.json');
    fs.writeFileSync(localBackupPath, JSON.stringify(backupPayload, null, 2), 'utf8');

    res.json(backupPayload);
  } catch (error) {
    res.status(500).json({ error: 'Error exportando copia de seguridad: ' + error.message });
  }
});

// 2. Descargar archivo SQLite directo (.db)
router.get('/download-db', (req, res) => {
  try {
    const dbPath = path.resolve(__dirname, '../../data/finanzas.db');
    if (fs.existsSync(dbPath)) {
      const dateStr = new Date().toISOString().split('T')[0];
      res.download(dbPath, 'Finanzas_Backup_' + dateStr + '.db');
    } else {
      res.status(404).json({ error: 'Archivo de base de datos no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Listar instantáneas locales guardadas
router.get('/snapshots', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json([]);
    }
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          created_at: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Crear instantánea manual en el servidor
router.post('/create-snapshot', (req, res) => {
  try {
    const tables = [
      'usuarios',
      'cuentas',
      'categorias',
      'movimientos',
      'pasivos',
      'presupuestos',
      'suscripciones',
      'alimentacion_articulos',
      'alimentacion_tickets'
    ];

    const data = {};
    const summary = {};

    for (const table of tables) {
      try {
        const rows = db.prepare('SELECT * FROM ' + table).all();
        data[table] = rows;
        summary[table] = rows.length;
      } catch (e) {
        data[table] = [];
        summary[table] = 0;
      }
    }

    const dateStamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = 'manual_backup_' + dateStamp + '.json';
    const localBackupPath = path.join(BACKUP_DIR, filename);

    const payload = {
      app: 'PIXDEMIA-Finanzas',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      summary,
      data
    };

    fs.writeFileSync(localBackupPath, JSON.stringify(payload, null, 2), 'utf8');

    res.json({
      success: true,
      message: 'Instantánea de seguridad creada con éxito',
      filename,
      summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Restaurar copia de seguridad (recibe JSON de backup)
router.post('/restore', (req, res) => {
  try {
    const backup = req.body;
    if (!backup || !backup.data) {
      return res.status(400).json({ error: 'Formato de copia de seguridad inválido. Falta el nodo "data".' });
    }

    const { data } = backup;

    // Crear instantánea de seguridad previa antes de sobreescribir
    try {
      const preRestoreTables = ['usuarios', 'cuentas', 'categorias', 'movimientos', 'pasivos', 'presupuestos', 'suscripciones', 'alimentacion_articulos', 'alimentacion_tickets'];
      const preData = {};
      for (const t of preRestoreTables) {
        try { preData[t] = db.prepare('SELECT * FROM ' + t).all(); } catch (_) { preData[t] = []; }
      }
      const preStamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.writeFileSync(
        path.join(BACKUP_DIR, 'pre_restore_' + preStamp + '.json'),
        JSON.stringify({ app: 'PIXDEMIA-Finanzas', date: new Date().toISOString(), data: preData }, null, 2),
        'utf8'
      );
    } catch (errSnap) {
      console.warn('No se pudo guardar la instantánea previa:', errSnap);
    }

    const restoredSummary = {};

    // Ejecutar restauración
    const restoreTx = () => {
      // 1. Limpiar tablas secundarias y luego principales
      const cleanTables = [
        'movimientos',
        'presupuestos',
        'pasivos',
        'suscripciones',
        'alimentacion_tickets',
        'alimentacion_articulos',
        'categorias',
        'cuentas',
        'usuarios'
      ];

      for (const t of cleanTables) {
        try { db.prepare('DELETE FROM ' + t).run(); } catch (_) {}
      }

      // 2. Insertar usuarios
      if (Array.isArray(data.usuarios) && data.usuarios.length > 0) {
        const stmt = db.prepare('INSERT INTO usuarios (id, nombre, email, avatar_url, moneda, tema, activo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const u of data.usuarios) {
          stmt.run(u.id, u.nombre, u.email || null, u.avatar_url || null, u.moneda || 'EUR', u.tema || 'light', u.activo !== undefined ? u.activo : 1, u.created_at || new Date().toISOString());
        }
        restoredSummary.usuarios = data.usuarios.length;
      }

      // 3. Insertar cuentas
      if (Array.isArray(data.cuentas) && data.cuentas.length > 0) {
        const stmt = db.prepare('INSERT INTO cuentas (id, usuario_id, nombre, tipo, saldo_inicial_2026, color_hex, activo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const c of data.cuentas) {
          stmt.run(c.id, c.usuario_id || 1, c.nombre, c.tipo || 'corriente', c.saldo_inicial_2026 || 0, c.color_hex || '#3b82f6', c.activo !== undefined ? c.activo : 1, c.created_at || new Date().toISOString());
        }
        restoredSummary.cuentas = data.cuentas.length;
      }

      // 4. Insertar categorias
      if (Array.isArray(data.categorias) && data.categorias.length > 0) {
        const stmt = db.prepare('INSERT INTO categorias (id, nombre, tipo, icono, color, orden, es_sistema) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const cat of data.categorias) {
          stmt.run(cat.id, cat.nombre, cat.tipo || 'gasto_variable', cat.icono || null, cat.color || '#64748b', cat.orden || 0, cat.es_sistema !== undefined ? cat.es_sistema : 0);
        }
        restoredSummary.categorias = data.categorias.length;
      }

      // 5. Insertar movimientos
      if (Array.isArray(data.movimientos) && data.movimientos.length > 0) {
        const stmt = db.prepare('INSERT INTO movimientos (id, usuario_id, fecha, cuenta_id, cuenta_imputada_id, categoria_id, subcategoria, concepto, importe, es_transferencia_interna, cuenta_destino_id, es_consolidado, etiqueta_especial, notas, origen_importacion, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const m of data.movimientos) {
          stmt.run(
            m.id,
            m.usuario_id || 1,
            m.fecha,
            m.cuenta_id,
            m.cuenta_imputada_id || null,
            m.categoria_id,
            m.subcategoria || null,
            m.concepto,
            m.importe,
            m.es_transferencia_interna ? 1 : 0,
            m.cuenta_destino_id || null,
            m.es_consolidado !== undefined ? m.es_consolidado : 1,
            m.etiqueta_especial || null,
            m.notas || null,
            m.origen_importacion || null,
            m.created_at || new Date().toISOString()
          );
        }
        restoredSummary.movimientos = data.movimientos.length;
      }

      // 6. Insertar pasivos
      if (Array.isArray(data.pasivos) && data.pasivos.length > 0) {
        const stmt = db.prepare('INSERT INTO pasivos (id, usuario_id, nombre, tipo, capital_inicial, capital_pendiente, cuota_mensual, tipo_interes_modalidad, interes_nominal_anual, diferencial_euribor, indice_referencia, plazo_meses_restantes, fecha_inicio, fecha_fin_prevista, historial_intereses_json, cuenta_cargo_id, es_vivienda_habitual, notas, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const p of data.pasivos) {
          stmt.run(
            p.id,
            p.usuario_id || 1,
            p.nombre,
            p.tipo || 'hipoteca',
            p.capital_inicial || 0,
            p.capital_pendiente || 0,
            p.cuota_mensual || 0,
            p.tipo_interes_modalidad || 'variable',
            p.interes_nominal_anual || 0,
            p.diferencial_euribor || 0,
            p.indice_referencia || 'Euríbor 12M',
            p.plazo_meses_restantes || 0,
            p.fecha_inicio || null,
            p.fecha_fin_prevista || null,
            p.historial_intereses_json || '[]',
            p.cuenta_cargo_id || null,
            p.es_vivienda_habitual !== undefined ? p.es_vivienda_habitual : 1,
            p.notas || null,
            p.created_at || new Date().toISOString()
          );
        }
        restoredSummary.pasivos = data.pasivos.length;
      }

      // 7. Insertar presupuestos
      if (Array.isArray(data.presupuestos) && data.presupuestos.length > 0) {
        const stmt = db.prepare('INSERT INTO presupuestos (id, usuario_id, categoria_id, ano, mes, limite_mensual, alerta_porcentaje, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const pr of data.presupuestos) {
          stmt.run(pr.id, pr.usuario_id || 1, pr.categoria_id, pr.ano || 2026, pr.mes || null, pr.limite_mensual || 0, pr.alerta_porcentaje || 80, pr.created_at || new Date().toISOString());
        }
        restoredSummary.presupuestos = data.presupuestos.length;
      }

      // 8. Insertar suscripciones
      if (Array.isArray(data.suscripciones) && data.suscripciones.length > 0) {
        const stmt = db.prepare('INSERT INTO suscripciones (id, usuario_id, nombre, proveedor, categoria_id, cuenta_id, importe, periodicidad, dia_cargo, activo, fecha_inicio, fecha_fin, notas, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const s of data.suscripciones) {
          stmt.run(s.id, s.usuario_id || 1, s.nombre, s.proveedor || null, s.categoria_id || null, s.cuenta_id || null, s.importe || 0, s.periodicidad || 'mensual', s.dia_cargo || 1, s.activo !== undefined ? s.activo : 1, s.fecha_inicio || null, s.fecha_fin || null, s.notas || null, s.created_at || new Date().toISOString());
        }
        restoredSummary.suscripciones = data.suscripciones.length;
      }

      // 9. Insertar alimentacion_articulos
      if (Array.isArray(data.alimentacion_articulos) && data.alimentacion_articulos.length > 0) {
        const stmt = db.prepare('INSERT INTO alimentacion_articulos (id, usuario_id, nombre, categoria_plato, supermercado, precio_habitual, formato_cantidad, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const a of data.alimentacion_articulos) {
          stmt.run(a.id, a.usuario_id || 1, a.nombre, a.categoria_plato || 'otros', a.supermercado || null, a.precio_habitual || 0, a.formato_cantidad || null, a.created_at || new Date().toISOString());
        }
        restoredSummary.alimentacion_articulos = data.alimentacion_articulos.length;
      }
    };

    restoreTx();

    res.json({
      success: true,
      message: 'Base de datos restaurada correctamente a partir de la copia de seguridad',
      restoredSummary
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al restaurar copia de seguridad: ' + error.message });
  }
});

// 6. Restaurar desde un snapshot local del servidor
router.post('/restore-snapshot', (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Nombre de archivo no especificado' });
    }
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo de instantánea no encontrado' });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const backupJson = JSON.parse(content);

    // Reutilizar lógica de restore
    req.body = backupJson;
    return router.handle({ ...req, url: '/restore', method: 'POST' }, res);
  } catch (error) {
    res.status(500).json({ error: 'Error restaurando instantánea: ' + error.message });
  }
});

module.exports = router;
