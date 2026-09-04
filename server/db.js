const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.resolve(dbDir, 'finanzas.db');

let rawDb = null;

function saveToDisk() {
  if (!rawDb) return;
  const data = rawDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

let isInitialized = false;

class Statement {
  constructor(sql) {
    this.sql = sql;
  }

  all(...params) {
    let flatParams = [];
    if (params.length === 1 && Array.isArray(params[0])) {
      flatParams = params[0];
    } else if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null) {
      const obj = { ...params[0] };
      Object.keys(obj).forEach(k => {
        if (obj[k] === undefined) obj[k] = null;
      });
      const stmt = rawDb.prepare(this.sql);
      const results = [];
      stmt.bind(obj);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } else {
      flatParams = params;
    }

    const sanitizedParams = flatParams.map(p => p === undefined ? null : p);

    try {
      const stmt = rawDb.prepare(this.sql);
      if (sanitizedParams.length > 0) {
        stmt.bind(sanitizedParams);
      }
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (e) {
      console.error('Error en Statement.all:', this.sql, sanitizedParams, e);
      throw e;
    }
  }

  get(...params) {
    const results = this.all(...params);
    return results.length > 0 ? results[0] : undefined;
  }

  run(...params) {
    let flatParams = [];
    if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
      const obj = { ...params[0] };
      Object.keys(obj).forEach(k => {
        if (obj[k] === undefined) obj[k] = null;
      });
      const stmt = rawDb.prepare(this.sql);
      stmt.bind(obj);
      stmt.step();
      stmt.free();
    } else {
      flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const sanitizedParams = flatParams.map(p => p === undefined ? null : p);
      if (sanitizedParams.length > 0) {
        rawDb.run(this.sql, sanitizedParams);
      } else {
        rawDb.run(this.sql);
      }
    }

    const lastIdRes = rawDb.exec('SELECT last_insert_rowid() as id');
    const lastInsertRowid = (lastIdRes[0] && lastIdRes[0].values[0]) ? lastIdRes[0].values[0][0] : 0;
    const changesRes = rawDb.exec('SELECT changes() as ch');
    const changes = (changesRes[0] && changesRes[0].values[0]) ? changesRes[0].values[0][0] : 0;

    saveToDisk();

    return {
      lastInsertRowid,
      changes
    };
  }
}

const dbWrapper = {
  prepare(sql) {
    return new Statement(sql);
  },
  exec(sql) {
    rawDb.exec(sql);
    saveToDisk();
  },
  pragma(str) {
    try {
      rawDb.exec(`PRAGMA ${str};`);
    } catch (e) {
      // Pragma fallback
    }
  },
  transaction(fn) {
    return (...args) => {
      rawDb.exec('BEGIN TRANSACTION;');
      try {
        const res = fn(...args);
        rawDb.exec('COMMIT;');
        saveToDisk();
        return res;
      } catch (err) {
        rawDb.exec('ROLLBACK;');
        throw err;
      }
    };
  }
};

let SQLInstance = null;

async function bootstrap() {
  if (isInitialized) return;
  SQLInstance = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    rawDb = new SQLInstance.Database(filebuffer);
  } else {
    rawDb = new SQLInstance.Database();
  }

  initSchemaAndSeeds();
  isInitialized = true;
}

function initSchemaAndSeeds() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  rawDb.exec(schemaSql);

  // Migraciones automáticas de columnas adicionales para usuarios, prestamos, suscripciones y movimientos
  const alterColumns = [
    'ALTER TABLE prestamos_y_pasivos ADD COLUMN tipo_interes_modalidad TEXT DEFAULT "variable"',
    'ALTER TABLE prestamos_y_pasivos ADD COLUMN diferencial_euribor REAL DEFAULT 0.0',
    'ALTER TABLE prestamos_y_pasivos ADD COLUMN indice_referencia TEXT DEFAULT "Euríbor 12M"',
    'ALTER TABLE prestamos_y_pasivos ADD COLUMN historial_intereses_json TEXT DEFAULT "[]"',
    'ALTER TABLE prestamos_y_pasivos ADD COLUMN fecha_actualizacion_saldo TEXT',
    'ALTER TABLE prestamos_y_pasivos ADD COLUMN mes_revision TEXT DEFAULT "Julio"',
    'ALTER TABLE prestamos_y_pasivos ADD COLUMN frecuencia_revision TEXT DEFAULT "Anual"',
    'ALTER TABLE prestamos_y_pasivos ADD COLUMN proxima_revision_fecha TEXT',
    'ALTER TABLE prestamos_y_pasivos ADD COLUMN numero_titulares INTEGER DEFAULT 1',
    'ALTER TABLE suscripciones_servicios ADD COLUMN logo_url TEXT',
    'ALTER TABLE movimientos ADD COLUMN es_consolidado INTEGER DEFAULT 1',
    'ALTER TABLE movimientos ADD COLUMN cuenta_imputada_id INTEGER',
    'ALTER TABLE movimientos ADD COLUMN pasivo_id INTEGER',
    'ALTER TABLE movimientos ADD COLUMN serie_id TEXT',
    'ALTER TABLE movimientos ADD COLUMN frecuencia_recurrencia TEXT',
    'ALTER TABLE movimientos ADD COLUMN usuario_id INTEGER DEFAULT 1',
    'ALTER TABLE cuentas ADD COLUMN usuario_id INTEGER DEFAULT 1',
    'ALTER TABLE presupuestos ADD COLUMN usuario_id INTEGER DEFAULT 1',
    'ALTER TABLE suscripciones_servicios ADD COLUMN usuario_id INTEGER DEFAULT 1',
    'ALTER TABLE prestamos_y_pasivos ADD COLUMN usuario_id INTEGER DEFAULT 1'
  ];

  for (const alterSql of alterColumns) {
    try {
      rawDb.exec(alterSql);
    } catch (e) {
      // Ya existe la columna o tabla
    }
  }

  // Migración para expandir tipos de cuenta permitidos ('tarjeta', 'prestamo')
  try {
    const tableSqlRes = rawDb.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='cuentas'");
    const tableSql = tableSqlRes[0]?.values[0][0] || '';
    if (tableSql && !tableSql.includes("'tarjeta'")) {
      rawDb.exec(`
        PRAGMA foreign_keys=off;
        CREATE TABLE IF NOT EXISTS cuentas_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER DEFAULT 1 REFERENCES usuarios_gestion(id) ON DELETE CASCADE,
            nombre TEXT NOT NULL,
            tipo TEXT NOT NULL CHECK (tipo IN ('corriente', 'ahorro_emergencia', 'inversion', 'epsv', 'tarjeta', 'prestamo')),
            saldo_inicial_2026 REAL DEFAULT 0.0,
            color_hex TEXT DEFAULT '#3b82f6',
            activo INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO cuentas_new (id, usuario_id, nombre, tipo, saldo_inicial_2026, color_hex, activo, created_at)
          SELECT id, COALESCE(usuario_id, 1), nombre, tipo, saldo_inicial_2026, color_hex, activo, created_at FROM cuentas;
        DROP TABLE cuentas;
        ALTER TABLE cuentas_new RENAME TO cuentas;
        PRAGMA foreign_keys=on;
      `);
    }
  } catch (e) {
    console.error('Error migrando tabla cuentas:', e);
  }

  // Semilla de Usuario por defecto
  try {
    const userCountRes = rawDb.exec('SELECT COUNT(*) as count FROM usuarios_gestion');
    const userCount = userCountRes[0]?.values[0][0] || 0;
    if (userCount === 0) {
      rawDb.run(
        'INSERT INTO usuarios_gestion (id, nombre, email_o_alias, color_hex, icono, es_defecto) VALUES (1, ?, ?, ?, ?, 1)',
        ['Tesorería Familiar', 'familia@pixdemia.com', '#4f46e5', 'Users']
      );
    }
  } catch (e) {
    // Si la tabla no existe o error
  }

  // Actualizar logos por defecto si no existen
  try {
    rawDb.run("UPDATE suscripciones_servicios SET logo_url = '/logos/netflix.svg' WHERE LOWER(nombre) LIKE '%netflix%' AND (logo_url IS NULL OR logo_url = '')");
    rawDb.run("UPDATE suscripciones_servicios SET logo_url = '/logos/amazon-prime.svg' WHERE LOWER(nombre) LIKE '%amazon%' AND (logo_url IS NULL OR logo_url = '')");
    rawDb.run("UPDATE suscripciones_servicios SET logo_url = '/logos/hbo-max.svg' WHERE LOWER(nombre) LIKE '%hbo%' AND (logo_url IS NULL OR logo_url = '')");
    rawDb.run("UPDATE suscripciones_servicios SET logo_url = '/logos/coursera.svg' WHERE LOWER(nombre) LIKE '%coursera%' AND (logo_url IS NULL OR logo_url = '')");
    rawDb.run("UPDATE suscripciones_servicios SET logo_url = '/logos/domestika.svg' WHERE LOWER(nombre) LIKE '%domestika%' AND (logo_url IS NULL OR logo_url = '')");
    rawDb.run("UPDATE suscripciones_servicios SET logo_url = '/logos/spotify.svg' WHERE LOWER(nombre) LIKE '%spotify%' AND (logo_url IS NULL OR logo_url = '')");
    rawDb.run("UPDATE suscripciones_servicios SET logo_url = '/logos/chatgpt.svg' WHERE LOWER(nombre) LIKE '%chatgpt%' AND (logo_url IS NULL OR logo_url = '')");
    rawDb.run("UPDATE suscripciones_servicios SET logo_url = '/logos/google-one.svg' WHERE LOWER(nombre) LIKE '%google%' AND (logo_url IS NULL OR logo_url = '')");
  } catch (e) {
    // Ignorar si la tabla está vacía
  }

  // Semillas de Cuentas
  const cuentasCountRes = rawDb.exec('SELECT COUNT(*) as count FROM cuentas');
  const cuentasCount = cuentasCountRes[0]?.values[0][0] || 0;

  if (cuentasCount === 0) {
    const defaultCuentas = [
      { nombre: 'Santander', tipo: 'corriente', saldo_inicial_2026: 4500.00, color_hex: '#ec0000', usuario_id: 1 },
      { nombre: 'Kutxa', tipo: 'corriente', saldo_inicial_2026: 2150.00, color_hex: '#008080', usuario_id: 1 },
      { nombre: 'N26', tipo: 'ahorro_emergencia', saldo_inicial_2026: 8500.00, color_hex: '#36a18b', usuario_id: 1 },
      { nombre: 'Indexa Capital', tipo: 'inversion', saldo_inicial_2026: 24000.00, color_hex: '#1e293b', usuario_id: 1 },
      { nombre: 'EPSV Julio', tipo: 'epsv', saldo_inicial_2026: 38500.00, color_hex: '#6366f1', usuario_id: 1 },
      { nombre: 'EPSV Yolanda', tipo: 'epsv', saldo_inicial_2026: 31200.00, color_hex: '#ec4899', usuario_id: 1 }
    ];

    for (const c of defaultCuentas) {
      rawDb.run(
        'INSERT INTO cuentas (nombre, tipo, saldo_inicial_2026, color_hex, activo, usuario_id) VALUES (?, ?, ?, ?, 1, ?)',
        [c.nombre, c.tipo, c.saldo_inicial_2026, c.color_hex, c.usuario_id || 1]
      );
    }
  }

  // Semillas de Categorías y Subcategorías
  const catCountRes = rawDb.exec('SELECT COUNT(*) as count FROM categorias');
  const catCount = catCountRes[0]?.values[0][0] || 0;

  if (catCount === 0) {
    const defaultCategorias = [
      { nombre: 'Ingresos Trabajo', tipo: 'ingreso', icono: 'Briefcase', color: '#10b981' },
      { nombre: 'Vivienda y Suministros', tipo: 'gasto_fijo', icono: 'Home', color: '#f59e0b' },
      { nombre: 'Alimentación', tipo: 'gasto_variable', icono: 'ShoppingCart', color: '#3b82f6' },
      { nombre: 'Familia y Estudios', tipo: 'gasto_variable', icono: 'Users', color: '#8b5cf6' },
      { nombre: 'Movilidad y Vehículos', tipo: 'gasto_variable', icono: 'Car', color: '#06b6d4' },
      { nombre: 'Obras y Reformas', tipo: 'gasto_variable', icono: 'Hammer', color: '#f97316' },
      { nombre: 'Ocio y Viajes', tipo: 'gasto_variable', icono: 'Plane', color: '#ec4899' },
      { nombre: 'Salud y Bienestar', tipo: 'gasto_variable', icono: 'HeartPulse', color: '#14b8a6' },
      { nombre: 'Suscripciones y Digital', tipo: 'gasto_fijo', icono: 'Smartphone', color: '#64748b' },
      { nombre: 'Aportación Inversión / Patrimonio', tipo: 'inversion', icono: 'TrendingUp', color: '#84cc16' },
      { nombre: 'Movimiento Interno', tipo: 'transferencia_interna', icono: 'ArrowLeftRight', color: '#94a3b8' }
    ];

    const defaultSubMap = {
      'Ingresos Trabajo': ['Nómina Julio', 'Nómina Yolanda', 'Extras', 'Devolución IRPF'],
      'Vivienda y Suministros': ['Hipoteca', 'TotalEnergies', 'Iberdrola', 'Euskaltel/Digi', 'Agua', 'Basuras', 'Comunidad Propietarios', 'Seguro Hogar'],
      'Alimentación': ['Eroski', 'Lidl', 'Mercadona', 'Carrefour', 'BM Supermercados', 'Panadería y Carnicería'],
      'Familia y Estudios': ['Colegio / Universidad', 'Material Escolar', 'Ropa e Hijas', 'Actividades Extraescolares'],
      'Movilidad y Vehículos': ['Gasolina Repsol/Cepsa', 'Taller y Mantenimiento', 'Seguro Vehículo', 'ITV / Peajes / Parking'],
      'Obras y Reformas': ['Reonor', 'Leroy Merlin', 'Brico Depôt', 'Fontanería / Electricidad', 'Mobiliario y Decoración', 'Riff Local'],
      'Ocio y Viajes': ['Restaurantes y Bares', 'Hoteles y Alojamientos', 'Vuelos / Billetes', 'Cine y Espectáculos', 'Viaje Londres'],
      'Salud y Bienestar': ['Farmacia', 'Dentista', 'Óptica', 'Fisioterapia / Deporte'],
      'Suscripciones y Digital': ['Netflix', 'Spotify', 'Amazon Prime', 'iCloud / Google One', 'ChatGPT Plus'],
      'Aportación Inversión / Patrimonio': ['Aportación Indexa', 'Aportación EPSV Julio', 'Aportación EPSV Yolanda'],
      'Movimiento Interno': ['Traspaso a Kutxa', 'Traspaso a N26', 'Fondo Imprevistos', 'Ajuste Saldo']
    };

    for (const cat of defaultCategorias) {
      rawDb.run(
        'INSERT INTO categorias (nombre, tipo, icono, color) VALUES (?, ?, ?, ?)',
        [cat.nombre, cat.tipo, cat.icono, cat.color]
      );
      const catId = rawDb.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
      const subs = defaultSubMap[cat.nombre] || [];
      for (const sub of subs) {
        rawDb.run('INSERT INTO subcategorias_o_tiendas (categoria_id, nombre) VALUES (?, ?)', [catId, sub]);
      }
    }
  }

  // Semillas de Pasivos con historial de intereses
  const pasivosCountRes = rawDb.exec('SELECT COUNT(*) as count FROM prestamos_y_pasivos');
  const pasivosCount = pasivosCountRes[0]?.values[0][0] || 0;

  if (pasivosCount === 0) {
    const defaultPasivos = [
      {
        nombre: 'Hipoteca Santander',
        capital_inicial: 180000.00,
        capital_pendiente: 84500.00,
        cuota_mensual: 625.50,
        interes_nominal_anual: 1.85,
        tipo_interes_modalidad: 'variable',
        diferencial_euribor: 0.75,
        historial_intereses_json: JSON.stringify([
          { ano: 2022, interes: 1.25, notas: 'Euríbor mínimo' },
          { ano: 2023, interes: 3.40, notas: 'Subida tipos BCE' },
          { ano: 2024, interes: 3.85, notas: 'Pico ciclo de tipos' },
          { ano: 2025, interes: 2.90, notas: 'Inicio de bajadas' },
          { ano: 2026, interes: 1.85, notas: 'Revisión actual 2026' }
        ]),
        fecha_inicio: '2015-07-01',
        fecha_fin_prevista: '2030-06-30',
        fecha_actualizacion_saldo: '2026-01-01',
        tipo: 'hipoteca',
        notas: 'Vivienda habitual'
      },
      {
        nombre: 'Préstamo Local Juancar',
        capital_inicial: 25000.00,
        capital_pendiente: 12000.00,
        cuota_mensual: 350.00,
        interes_nominal_anual: 0.0,
        tipo_interes_modalidad: 'fijo',
        diferencial_euribor: 0.0,
        historial_intereses_json: JSON.stringify([
          { ano: 2023, interes: 0.0, notas: 'Préstamo sin interés' },
          { ano: 2026, interes: 0.0, notas: 'Sin interés' }
        ]),
        fecha_inicio: '2023-01-01',
        fecha_fin_prevista: '2029-12-31',
        fecha_actualizacion_saldo: '2026-01-01',
        tipo: 'familiar',
        notas: 'Financiación proyecto local'
      }
    ];

    for (const p of defaultPasivos) {
      rawDb.run(
        `INSERT INTO prestamos_y_pasivos (
          nombre, capital_inicial, capital_pendiente, cuota_mensual, interes_nominal_anual,
          tipo_interes_modalidad, diferencial_euribor, historial_intereses_json,
          fecha_inicio, fecha_fin_prevista, fecha_actualizacion_saldo, tipo, notas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.nombre, p.capital_inicial, p.capital_pendiente, p.cuota_mensual, p.interes_nominal_anual,
          p.tipo_interes_modalidad, p.diferencial_euribor, p.historial_intereses_json,
          p.fecha_inicio, p.fecha_fin_prevista, p.fecha_actualizacion_saldo, p.tipo, p.notas
        ]
      );
    }
  }

  // Semillas de Suscripciones y Servicios Digitales
  const subsCountRes = rawDb.exec('SELECT COUNT(*) as count FROM suscripciones_servicios');
  const subsCount = subsCountRes[0]?.values[0][0] || 0;

  if (subsCount === 0) {
    const defaultSubs = [
      { nombre: 'Netflix', categoria_servicio: 'Streaming', coste_recurrente: 17.99, periodicidad: 'mensual', fecha_proxima_renovacion: '2026-03-15', estado: 'activo', compartido_con: 'Hogar familiar (4 pantallas)', icono: 'Tv', color: '#e50914', notas: 'Plan Premium 4K' },
      { nombre: 'Amazon Prime', categoria_servicio: 'Streaming', coste_recurrente: 49.90, periodicidad: 'anual', fecha_proxima_renovacion: '2026-11-20', estado: 'activo', compartido_con: 'Envíos + Prime Video', icono: 'ShoppingBag', color: '#00a8e1', notas: 'Renovación anual en Noviembre' },
      { nombre: 'HBO Max', categoria_servicio: 'Streaming', coste_recurrente: 9.99, periodicidad: 'mensual', fecha_proxima_renovacion: '2026-03-22', estado: 'activo', compartido_con: 'Familia', icono: 'Film', color: '#6a38b3', notas: 'Series y cine' },
      { nombre: 'Coursera Plus', categoria_servicio: 'Formación', coste_recurrente: 49.00, periodicidad: 'mensual', fecha_proxima_renovacion: '2026-04-01', estado: 'activo', compartido_con: 'Julio (Certificaciones)', icono: 'GraduationCap', color: '#0056d2', notas: 'Especializaciones Data & AI' },
      { nombre: 'Domestika', categoria_servicio: 'Formación', coste_recurrente: 9.99, periodicidad: 'mensual', fecha_proxima_renovacion: '2026-03-10', estado: 'activo', compartido_con: 'Cursos creativos', icono: 'Palette', color: '#ff4c5a', notas: 'Diseño e ilustración' },
      { nombre: 'Spotify Familiar', categoria_servicio: 'Streaming', coste_recurrente: 17.99, periodicidad: 'mensual', fecha_proxima_renovacion: '2026-03-05', estado: 'activo', compartido_con: '6 cuentas familia', icono: 'Music', color: '#1db954', notas: 'Plan Familiar Premium' },
      { nombre: 'ChatGPT Plus', categoria_servicio: 'Cloud / IA', coste_recurrente: 22.00, periodicidad: 'mensual', fecha_proxima_renovacion: '2026-03-18', estado: 'activo', compartido_con: 'Productividad y Coding', icono: 'Bot', color: '#10a37f', notas: 'OpenAI GPT-4' },
      { nombre: 'Google One 2TB', categoria_servicio: 'Cloud / IA', coste_recurrente: 9.99, periodicidad: 'mensual', fecha_proxima_renovacion: '2026-03-28', estado: 'activo', compartido_con: 'Copia fotos familia', icono: 'Cloud', color: '#4285f4', notas: 'Almacenamiento compartido Drive/Photos' }
    ];

    for (const s of defaultSubs) {
      rawDb.run(
        `INSERT INTO suscripciones_servicios (
          nombre, categoria_servicio, coste_recurrente, periodicidad, fecha_proxima_renovacion,
          estado, compartido_con, icono, color, notas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.nombre, s.categoria_servicio, s.coste_recurrente, s.periodicidad, s.fecha_proxima_renovacion, s.estado, s.compartido_con, s.icono, s.color, s.notas]
      );
    }
  }

  // Semillas de Personas del Hogar
  const personasCountRes = rawDb.exec('SELECT COUNT(*) as count FROM personas_hogar');
  const personasCount = personasCountRes[0]?.values[0][0] || 0;

  if (personasCount === 0) {
    const defaultPersonas = [
      { nombre: 'Julio', rol: 'Adulto', factor_consumo: 1.0, activo: 1, notas: 'Padre' },
      { nombre: 'Yolanda', rol: 'Adulto', factor_consumo: 1.0, activo: 1, notas: 'Madre' },
      { nombre: 'Amaia', rol: 'Hija/Hijo', factor_consumo: 0.85, activo: 1, notas: 'Hija' },
      { nombre: 'Olatz', rol: 'Hija/Hijo', factor_consumo: 0.85, activo: 1, notas: 'Hija' }
    ];

    for (const pers of defaultPersonas) {
      rawDb.run(
        'INSERT INTO personas_hogar (nombre, rol, factor_consumo, activo, notas) VALUES (?, ?, ?, ?, ?)',
        [pers.nombre, pers.rol, pers.factor_consumo, pers.activo, pers.notas]
      );
    }
  }

  // Semillas de Productos de Alimentación y Precios por Comercio
  const prodCountRes = rawDb.exec('SELECT COUNT(*) as count FROM productos_alimentacion');
  const prodCount = prodCountRes[0]?.values[0][0] || 0;

  if (prodCount === 0) {
    const defaultProds = [
      { nombre: 'Leche Entera 1L', categoria: 'Lácteos y Huevos', unidad_medida: 'L', precio_referencia_actual: 0.98, comercio_habitual: 'Eroski', notas: 'Brik 1L' },
      { nombre: 'Huevos Camperos (Docena)', categoria: 'Lácteos y Huevos', unidad_medida: 'docena', precio_referencia_actual: 2.45, comercio_habitual: 'Mercadona', notas: 'Clase L' },
      { nombre: 'Pechuga de Pollo Fileteada 1kg', categoria: 'Carnicería', unidad_medida: 'kg', precio_referencia_actual: 7.60, comercio_habitual: 'Carnicería Local', notas: 'Corte limpio' },
      { nombre: 'Filetes de Ternera 1kg', categoria: 'Carnicería', unidad_medida: 'kg', precio_referencia_actual: 14.50, comercio_habitual: 'Carnicería Local', notas: 'Cadera / Babilla' },
      { nombre: 'Salmón Fresco 1kg', categoria: 'Pescadería', unidad_medida: 'kg', precio_referencia_actual: 12.95, comercio_habitual: 'Eroski', notas: 'Lomos limpios' },
      { nombre: 'Aceite de Oliva V. Extra 1L', categoria: 'Despensa y Básicos', unidad_medida: 'L', precio_referencia_actual: 8.85, comercio_habitual: 'Mercadona', notas: 'Garrafa / Botella 1L' },
      { nombre: 'Arroz Redondo 1kg', categoria: 'Despensa y Básicos', unidad_medida: 'kg', precio_referencia_actual: 1.35, comercio_habitual: 'Lidl', notas: 'Paquete 1kg' },
      { nombre: 'Pasta Macarrones 1kg', categoria: 'Despensa y Básicos', unidad_medida: 'kg', precio_referencia_actual: 1.29, comercio_habitual: 'Mercadona', notas: 'Trigo duro' },
      { nombre: 'Plátano de Canarias 1kg', categoria: 'Frutería y Verdura', unidad_medida: 'kg', precio_referencia_actual: 2.10, comercio_habitual: 'Frutería Local', notas: 'IGP Canarias' },
      { nombre: 'Tomate Ensalada 1kg', categoria: 'Frutería y Verdura', unidad_medida: 'kg', precio_referencia_actual: 2.30, comercio_habitual: 'Frutería Local', notas: 'Tomate de rama' },
      { nombre: 'Pan Rústico Barra', categoria: 'Panadería', unidad_medida: 'unidad', precio_referencia_actual: 1.10, comercio_habitual: 'Panadería Local', notas: 'Masa madre' },
      { nombre: 'Yogur Natural Pack 8', categoria: 'Lácteos y Huevos', unidad_medida: 'pack', precio_referencia_actual: 1.65, comercio_habitual: 'Lidl', notas: 'Sin azúcar' }
    ];

    for (const prod of defaultProds) {
      rawDb.run(
        'INSERT INTO productos_alimentacion (nombre, categoria, unidad_medida, precio_referencia_actual, comercio_habitual, notas) VALUES (?, ?, ?, ?, ?, ?)',
        [prod.nombre, prod.categoria, prod.unidad_medida, prod.precio_referencia_actual, prod.comercio_habitual, prod.notas]
      );
      const prodId = rawDb.exec('SELECT last_insert_rowid() as id')[0].values[0][0];

      // Insertar histórico de precios para comparativa y evolución temporal
      const preciosSample = [
        { comercio: 'Eroski', precio: Number((prod.precio_referencia_actual * 1.02).toFixed(2)), fecha: '2025-10-01' },
        { comercio: 'Eroski', precio: Number((prod.precio_referencia_actual * 1.05).toFixed(2)), fecha: '2026-01-15' },
        { comercio: 'Eroski', precio: prod.precio_referencia_actual, fecha: '2026-02-20' },
        { comercio: 'Mercadona', precio: Number((prod.precio_referencia_actual * 0.98).toFixed(2)), fecha: '2026-02-18' },
        { comercio: 'Lidl', precio: Number((prod.precio_referencia_actual * 0.95).toFixed(2)), fecha: '2026-02-15' }
      ];

      for (const pr of preciosSample) {
        rawDb.run(
          'INSERT INTO precios_historico_comercios (producto_id, comercio, precio, fecha_registro) VALUES (?, ?, ?, ?)',
          [prodId, pr.comercio, pr.precio, pr.fecha]
        );
      }
    }
  }

  // Semillas de Menús Planificados
  const menusCountRes = rawDb.exec('SELECT COUNT(*) as count FROM menus_planificados');
  const menusCount = menusCountRes[0]?.values[0][0] || 0;

  if (menusCount === 0) {
    const menuDetalles = {
      lunes: { comida: 'Lentejas caseras con verdura', cena: 'Pechuga de pollo a la plancha con ensalada de tomate' },
      martes: { comida: 'Arroz con verduras y huevo frito', cena: 'Crema de calabacín y tortilla francesa' },
      miercoles: { comida: 'Macarrones boloñesa con tomate natural', cena: 'Salmón al horno con patatas panadera' },
      jueves: { comida: 'Alubias blancas con verduras', cena: 'Revuelto de champiñones y tostadas de pan rústico' },
      viernes: { comida: 'Filetes de ternera con puré de patata', cena: 'Pizza casera masa fina con jamón y queso' },
      sabado: { comida: 'Paella / Arroz marinero familiar', cena: 'Hamburguesas caseras completas' },
      domingo: { comida: 'Pollo asado al horno con limón', cena: 'Sopa de fideos y sándwiches mixtos' }
    };

    rawDb.run(
      `INSERT INTO menus_planificados (nombre, descripcion, temporada_o_tipo, personas_comensales, coste_estimado_semanal, detalles_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'Menú Semanal Mediterráneo Familiar',
        'Menú equilibrado de 7 días (comidas y cenas) para los 4 miembros del hogar',
        'Semanal',
        4,
        148.50,
        JSON.stringify(menuDetalles)
      ]
    );
  }

  saveToDisk();
}

const readyPromise = bootstrap();
dbWrapper.ready = readyPromise;

module.exports = dbWrapper;
