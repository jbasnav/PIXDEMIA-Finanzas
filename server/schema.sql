-- Esquema Relacional de Base de Datos para Finanzas Personales & Tesorería Familiar

CREATE TABLE IF NOT EXISTS usuarios_gestion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email_o_alias TEXT,
    color_hex TEXT DEFAULT '#4f46e5',
    icono TEXT DEFAULT 'Users',
    es_defecto INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cuentas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER DEFAULT 1 REFERENCES usuarios_gestion(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('corriente', 'ahorro_emergencia', 'inversion', 'epsv', 'tarjeta', 'prestamo')),
    saldo_inicial_2026 REAL DEFAULT 0.0,
    color_hex TEXT DEFAULT '#3b82f6',
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'gasto_fijo', 'gasto_variable', 'inversion', 'transferencia_interna')),
    icono TEXT DEFAULT 'Tag',
    color TEXT DEFAULT '#64748b',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subcategorias_o_tiendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(categoria_id, nombre)
);

CREATE TABLE IF NOT EXISTS movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER DEFAULT 1 REFERENCES usuarios_gestion(id) ON DELETE CASCADE,
    fecha TEXT NOT NULL, -- Formato ISO: YYYY-MM-DD
    cuenta_id INTEGER NOT NULL REFERENCES cuentas(id),
    cuenta_imputada_id INTEGER REFERENCES cuentas(id), -- Cuenta/banco al que se asigna o imputa contablemente el gasto si difiere de cuenta_id
    categoria_id INTEGER NOT NULL REFERENCES categorias(id),
    subcategoria TEXT,
    concepto TEXT NOT NULL,
    importe REAL NOT NULL, -- Positivo para ingresos/abonos, Negativo para gastos/cargos
    es_transferencia_interna INTEGER DEFAULT 0 CHECK (es_transferencia_interna IN (0, 1)),
    cuenta_destino_id INTEGER REFERENCES cuentas(id),
    es_consolidado INTEGER DEFAULT 1 CHECK (es_consolidado IN (0, 1)), -- 1 = Consolidado (Real), 0 = Previsto / Sin Consolidar (Simulación)
    etiqueta_especial TEXT, -- 'Obra Local', 'Viaje Londres', 'Furgoneta', etc.
    notas TEXT,
    origen_importacion TEXT DEFAULT 'Manual',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prestamos_y_pasivos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    capital_inicial REAL NOT NULL,
    capital_pendiente REAL NOT NULL,
    cuota_mensual REAL NOT NULL,
    interes_nominal_anual REAL NOT NULL DEFAULT 0.0,
    tipo_interes_modalidad TEXT DEFAULT 'variable', -- 'fijo', 'variable', 'cero'
    diferencial_euribor REAL DEFAULT 0.0,
    historial_intereses_json TEXT DEFAULT '[]', -- Historial de tipos de interés por año
    mes_revision TEXT DEFAULT 'Julio', -- Mes en el que se aplica la revisión de la hipoteca
    frecuencia_revision TEXT DEFAULT 'Anual', -- 'Anual', 'Semestral', 'Trimestral'
    proxima_revision_fecha TEXT, -- Próxima fecha exacta de revisión
    fecha_inicio TEXT,
    fecha_fin_prevista TEXT,
    fecha_actualizacion_saldo TEXT,
    tipo TEXT DEFAULT 'prestamo' CHECK (tipo IN ('hipoteca', 'personal', 'familiar', 'simulacion')),
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS presupuestos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER REFERENCES categorias(id),
    cuenta_id INTEGER REFERENCES cuentas(id),
    mes INTEGER NOT NULL DEFAULT 0,
    ano INTEGER NOT NULL DEFAULT 2026,
    limite_mensual REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(categoria_id, cuenta_id, mes, ano)
);

CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_cuenta ON movimientos(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_categoria ON movimientos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_transferencia ON movimientos(es_transferencia_interna);
CREATE INDEX IF NOT EXISTS idx_movimientos_etiqueta ON movimientos(etiqueta_especial);

-- Tablas para Control de Partidas: Suscripciones y Servicios Digitales
CREATE TABLE IF NOT EXISTS suscripciones_servicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    categoria_servicio TEXT NOT NULL DEFAULT 'Streaming', -- 'Streaming', 'Formación', 'Cloud / IA', 'Software / Trabajo', 'Gimnasio / Ocio'
    coste_recurrente REAL NOT NULL,
    periodicidad TEXT NOT NULL DEFAULT 'mensual', -- 'mensual', 'trimestral', 'semestral', 'anual'
    fecha_proxima_renovacion TEXT,
    cuenta_pago_id INTEGER REFERENCES cuentas(id),
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado', 'cancelado')),
    compartido_con TEXT,
    icono TEXT DEFAULT 'Tv',
    color TEXT DEFAULT '#6366f1',
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tablas para Control de Partidas: Alimentación, Menús y Precios
CREATE TABLE IF NOT EXISTS personas_hogar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    rol TEXT DEFAULT 'Adulto', -- 'Adulto', 'Hija/Hijo', 'Invitado'
    factor_consumo REAL DEFAULT 1.0,
    activo INTEGER DEFAULT 1,
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productos_alimentacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Despensa', -- 'Lácteos y Huevos', 'Carnicería', 'Pescadería', 'Frutería y Verdura', 'Despensa y Básicos', 'Panadería', 'Bebidas', 'Limpieza e Higiene'
    unidad_medida TEXT DEFAULT 'kg', -- 'kg', 'L', 'unidad', 'docena', 'pack', 'g'
    precio_referencia_actual REAL DEFAULT 0.0,
    comercio_habitual TEXT DEFAULT 'Eroski',
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS precios_historico_comercios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL REFERENCES productos_alimentacion(id) ON DELETE CASCADE,
    comercio TEXT NOT NULL, -- 'Eroski', 'Mercadona', 'Lidl', 'BM', 'Carnicería Local', 'Frutería Local', etc.
    precio REAL NOT NULL,
    fecha_registro TEXT NOT NULL,
    es_oferta INTEGER DEFAULT 0,
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menus_planificados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    temporada_o_tipo TEXT DEFAULT 'Semanal', -- 'Semanal', 'Mensual', 'Especial', 'Invierno', 'Verano'
    personas_comensales INTEGER DEFAULT 4,
    coste_estimado_semanal REAL DEFAULT 0.0,
    detalles_json TEXT DEFAULT '{}', -- Estructura de días, comidas, cenas y productos asociados
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
