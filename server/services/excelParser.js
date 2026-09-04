const XLSX = require('xlsx');
const db = require('../db');

/**
 * Normaliza nombres de cuentas bancarias
 */
function mapAccountName(rawName) {
  if (!rawName) return 'Santander';
  const lower = String(rawName).toLowerCase().trim();
  if (lower.includes('tarjeta') || lower.includes('visa') || lower.includes('mastercard')) return 'Tarjeta Kutxa';
  if (lower === 's' || lower.includes('santander')) return 'Santander';
  if (lower === 'k' || lower.includes('kutxa')) return 'Kutxa';
  if (lower === 'n' || lower.includes('n26')) return 'N26';
  if (lower.includes('indexa')) return 'Indexa Capital';
  if (lower.includes('julio') && lower.includes('epsv')) return 'EPSV Julio';
  if (lower.includes('yolanda') && lower.includes('epsv')) return 'EPSV Yolanda';
  return String(rawName).trim();
}

/**
 * Asigna una categoría adecuada a partir del concepto y subcategoría
 */
function inferCategory(concepto = '', subcategoria = '') {
  const text = `${concepto} ${subcategoria}`.toLowerCase().replace(/\s+/g, ' ');

  // Transferencias y traspasos internos
  if (text.includes('traspaso') || text.includes('transf') || text.includes('trasfer') || text.includes('fondo imprevistos') || text.includes('envio a') || text.includes('revolut')) {
    return 'Movimiento Interno';
  }

  // Ingresos de trabajo
  if (text.includes('nomina') || text.includes('nómina') || text.includes('sueldo') || text.includes('paga julio') || text.includes('ingreso trabajo') || text.includes('irpf') || text.includes('declaracion') || text.includes('devolucion hacienda') || text.includes('ingreso otros')) {
    return 'Ingresos Trabajo';
  }

  // Inversión / Patrimonio
  if (text.includes('indexa') || text.includes('epsv') || text.includes('fondos') || text.includes('aportacion') || text.includes('inversion') || text.includes('fondo pension')) {
    return 'Aportación Inversión / Patrimonio';
  }

  // Préstamos familiares y pasivos
  if (text.includes('juancar') || text.includes('ubitxa') || text.includes('local ubitxa') || text.includes('prestamo') || text.includes('préstamo')) {
    return 'Préstamos y Pasivos';
  }

  // Obras y reformas / Proyectos especiales
  if (text.includes('reonor') || text.includes('reforma') || text.includes('riff') || text.includes('leroy') || text.includes('brico') || text.includes('pintura') || text.includes('azulejo') || text.includes('obra') || text.includes('griferia') || text.includes('baño') || text.includes('derrama')) {
    return 'Obras y Reformas';
  }

  // Alimentación y Supermercados
  if (text.includes('eroski') || text.includes('lidl') || text.includes('mercadona') || text.includes('carrefour') || text.includes('bm') || text.includes('simply') || text.includes('supermercado') || text.includes('fruteria') || text.includes('carniceria') || text.includes('panaderia') || text.includes('dia') || text.includes('alimentacion') || text.includes('galletas') || text.includes('toogoogtogo') || text.includes('arenal')) {
    return 'Alimentación';
  }

  // Movilidad y vehículos
  if (text.includes('gasolina') || text.includes('repsol') || text.includes('cepsa') || text.includes('taller') || text.includes('coche') || text.includes('leon') || text.includes('peaje') || text.includes('aparcamiento') || text.includes('parking') || text.includes('furgoneta') || text.includes('itv') || text.includes('abiatu') || text.includes('bidegi') || text.includes('mugi') || text.includes('barik') || text.includes('transporte') || text.includes('seguro coche')) {
    return 'Movilidad y Vehículos';
  }

  // Suscripciones y digital
  if (text.includes('netflix') || text.includes('spotify') || text.includes('prime') || text.includes('icloud') || text.includes('google') || text.includes('chatgpt') || text.includes('claude') || text.includes('hbo') || text.includes('movistar') || text.includes('disney') || text.includes('wikiloc') || text.includes('suscripcion') || text.includes('office 365') || text.includes('1&1') || text.includes('pixdemia') || text.includes('amazon premium')) {
    return 'Suscripciones y Digital';
  }

  // Familia y estudios (incluye pagas, gastos hijas, alquiler piso estudiante)
  if (text.includes('colegio') || text.includes('instituto') || text.includes('estudios') || text.includes('amaia') || text.includes('olatz') || text.includes('paga olatz') || text.includes('paga amaia') || text.includes('alquiler piso vitoria') || text.includes('ropa') || text.includes('zapatos') || text.includes('hijas') || text.includes('libros') || text.includes('extraescolar') || text.includes('temu') || text.includes('amazon') || text.includes('aliexpress') || text.includes('zara') || text.includes('minerva') || text.includes('merceria')) {
    return 'Familia y Estudios';
  }

  // Ocio, hostelería, viajes y efectivo
  if (text.includes('viaje') || text.includes('hotel') || text.includes('vuelo') || text.includes('restaurante') || text.includes('bar ') || text.includes('taberna') || text.includes('cine') || text.includes('londres') || text.includes('justeat') || text.includes('just-eat') || text.includes('just eat') || text.includes('polideportivo') || text.includes('eibar') || text.includes('sociedad') || text.includes('burguer') || text.includes('burger') || text.includes('pret a manger') || text.includes('arkupe') || text.includes('manger') || text.includes('pierre') || text.includes('asador') || text.includes('peluqueria') || text.includes('federado') || text.includes('cajero') || text.includes('pago cajero') || text.includes('bizum')) {
    return 'Ocio y Viajes';
  }

  // Salud y bienestar
  if (text.includes('farmacia') || text.includes('dentista') || text.includes('optica') || text.includes('medico') || text.includes('fisioterapia') || text.includes('gimnasio') || text.includes('deporte')) {
    return 'Salud y Bienestar';
  }

  // Vivienda y suministros del hogar
  if (text.includes('hipoteca') || text.includes('totalenergies') || text.includes('iberdrola') || text.includes('euskaltel') || text.includes('digi') || text.includes('gas ') || text.includes('gas(') || text.includes('luz') || text.includes('agua') || text.includes('urak') || text.includes('basuras') || text.includes('comunidad') || text.includes('ibi') || text.includes('hogar') || text.includes('garaje') || text.includes('seguro') || text.includes('ekiluz') || text.includes('urki bajo')) {
    return 'Vivienda y Suministros';
  }

  return 'Vivienda y Suministros';
}

/**
 * Detecta etiquetas de proyectos especiales
 */
function inferSpecialTag(concepto = '', subcategoria = '') {
  const text = `${concepto} ${subcategoria}`.toLowerCase();
  if (text.includes('juancar') || text.includes('ubitxa') || text.includes('local ubitxa')) {
    return 'Préstamo Juancar';
  }
  if (text.includes('reonor') || text.includes('riff') || text.includes('obra local') || text.includes('obras local')) {
    return 'Obra Local';
  }
  if (text.includes('londres') || text.includes('viaje londres')) {
    return 'Viaje Londres';
  }
  if (text.includes('furgoneta') || text.includes('camper')) {
    return 'Furgoneta';
  }
  return null;
}

/**
 * Convierte valores de fecha en YYYY-MM-DD
 */
function parseDateString(val, defaultMonth = 1, defaultYear = 2026) {
  const mStr = String(defaultMonth).padStart(2, '0');
  if (!val) {
    return `${defaultYear}-${mStr}-15`;
  }

  if (val instanceof Date) {
    let y = val.getFullYear();
    let m = val.getMonth() + 1;
    let d = val.getDate();
    if (y < 2000) {
      y = defaultYear;
      m = defaultMonth;
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  if (typeof val === 'number') {
    if (val > 40000) {
      const dObj = XLSX.SSF.parse_date_code(val);
      if (dObj) {
        return `${dObj.y}-${String(dObj.m).padStart(2, '0')}-${String(dObj.d).padStart(2, '0')}`;
      }
    } else if (val >= 1 && val <= 31) {
      const dStr = String(Math.floor(val)).padStart(2, '0');
      return `${defaultYear}-${mStr}-${dStr}`;
    }
  }

  const str = String(val).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;

  // Si es un número en formato texto simple (ej. "10", "21")
  const numDay = parseInt(str, 10);
  if (!isNaN(numDay) && numDay >= 1 && numDay <= 31 && !str.includes('/') && !str.includes('-') && !str.includes('.')) {
    return `${defaultYear}-${mStr}-${String(numDay).padStart(2, '0')}`;
  }

  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else {
      let y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${y}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  return `${defaultYear}-${mStr}-15`;
}

/**
 * Procesa e importa un archivo Excel o CSV (Balance 2026 multicolección o Listado tabular plano)
 */
function parseExcelFile(filePathOrBuffer, defaultAccountName = 'Santander') {
  const workbook = typeof filePathOrBuffer === 'string'
    ? XLSX.readFile(filePathOrBuffer, { cellDates: true, cellStyles: true, cellHTML: true, cellNF: true })
    : XLSX.read(filePathOrBuffer, { type: 'buffer', cellDates: true, cellStyles: true, cellHTML: true, cellNF: true });

  const sheetNames = workbook.SheetNames;
  const results = {
    saldosActualizados: 0,
    movimientosImportados: 0,
    movimientosDuplicadosIgnorados: 0,
    errores: []
  };

  // Pre-cargar cuentas y categorías existentes
  const cuentasList = db.prepare('SELECT id, nombre FROM cuentas').all();
  const cuentasMap = new Map(cuentasList.map(c => [c.nombre.toLowerCase(), c.id]));

  const categoriasList = db.prepare('SELECT id, nombre, tipo FROM categorias').all();
  const categoriasMap = new Map(categoriasList.map(c => [c.nombre.toLowerCase(), c.id]));

  const getOrCreateAccountId = (name, defaultType = 'corriente') => {
    const canonical = mapAccountName(name || defaultAccountName);
    let id = cuentasMap.get(canonical.toLowerCase());
    if (!id) {
      const isCard = canonical.toLowerCase().includes('tarjeta');
      const tipo = isCard ? 'tarjeta' : defaultType;
      const color = isCard ? '#008080' : '#4f46e5';
      const res = db.prepare('INSERT INTO cuentas (nombre, tipo, saldo_inicial_2026, color_hex, usuario_id) VALUES (?, ?, 0, ?, 1)')
        .run(canonical, tipo, color);
      id = res.lastInsertRowid;
      cuentasMap.set(canonical.toLowerCase(), id);
    }
    return id;
  };

  const getCategoryId = (catName) => {
    const id = categoriasMap.get(catName.toLowerCase());
    if (id) return id;
    const defaultId = categoriasMap.get('vivienda y suministros') || (categoriasList[0]?.id || 1);
    return defaultId;
  };

  const insertMovStmt = db.prepare(`
    INSERT INTO movimientos (
      fecha, cuenta_id, cuenta_imputada_id, categoria_id, subcategoria, concepto, importe,
      es_transferencia_interna, cuenta_destino_id, es_consolidado, etiqueta_especial, notas, usuario_id, origen_importacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Importacion_Balance_2026')
  `);

  const checkDuplicateStmt = db.prepare(`
    SELECT id FROM movimientos
    WHERE fecha = ? AND cuenta_id = ? AND concepto = ? AND ABS(importe - ?) < 0.001
  `);

  const importedMovements = [];

  // Detectar hojas del libro Balance 2026
  const anoSheetName = sheetNames.find(s => s.trim().toUpperCase().includes('2026') || s.trim().toUpperCase().includes('AÑO'));
  const gastosSheetName = sheetNames.find(s => s.trim().toUpperCase().includes('GASTO'));
  const isBalance2026Workbook = Boolean(anoSheetName || gastosSheetName);

  if (isBalance2026Workbook) {
    // ==========================================
    // 1. PROCESAR HOJA 'AÑO 2026' (Saldos Iniciales + Ingresos y Gastos Fijos)
    // ==========================================
    if (anoSheetName) {
      const anoSheet = workbook.Sheets[anoSheetName];
      const dataAno = XLSX.utils.sheet_to_json(anoSheet, { header: 1, defval: null });

      // 1.1 Saldos Iniciales a 1 de Enero 2026
      if (dataAno.length > 1) {
        const rowSaldos = dataAno[1];
        const santanderIni = typeof rowSaldos[6] === 'number' ? rowSaldos[6] : 6070.02;
        const kutxaIni = typeof rowSaldos[7] === 'number' ? rowSaldos[7] : 3232.92;
        const n26Ini = typeof rowSaldos[8] === 'number' ? rowSaldos[8] : 15.31;
        const epsvJulioIni = typeof rowSaldos[12] === 'number' ? rowSaldos[12] : 1705.37;
        const epsvYoliIni = typeof rowSaldos[13] === 'number' ? rowSaldos[13] : 1905.37;

        db.prepare('UPDATE cuentas SET saldo_inicial_2026 = ? WHERE LOWER(nombre) = ?').run(santanderIni, 'santander');
        db.prepare('UPDATE cuentas SET saldo_inicial_2026 = ? WHERE LOWER(nombre) = ?').run(kutxaIni, 'kutxa');
        db.prepare('UPDATE cuentas SET saldo_inicial_2026 = ? WHERE LOWER(nombre) = ?').run(n26Ini, 'n26');
        db.prepare('UPDATE cuentas SET saldo_inicial_2026 = ? WHERE LOWER(nombre) = ?').run(epsvJulioIni, 'epsv julio');
        db.prepare('UPDATE cuentas SET saldo_inicial_2026 = ? WHERE LOWER(nombre) = ?').run(epsvYoliIni, 'epsv yolanda');
        results.saldosActualizados += 5;
      }

      // 1.2 Movimientos recurrentes y nóminas (desde fila 24 hasta 120)
      for (let r = 23; r < Math.min(dataAno.length, 120); r++) {
        const row = dataAno[r];
        if (!row) continue;

        const bancoRaw = row[0];
        const conceptoRaw = row[1];
        if (!conceptoRaw || typeof conceptoRaw !== 'string') continue;

        const concepto = String(conceptoRaw).trim();
        const cNormalized = concepto.toLowerCase().replace(/\s+/g, ' ');

        // Ignorar totales, balances y filas agregadas de gastos de tarjeta (cuyo detalle viene en la hoja GASTOS)
        if (
          !concepto ||
          cNormalized.startsWith('total') ||
          cNormalized.startsWith('saldo') ||
          cNormalized.startsWith('gastos mes') ||
          cNormalized.startsWith('balance') ||
          cNormalized.startsWith('gastos tipo') ||
          cNormalized.startsWith('gastos tarjeta') ||
          cNormalized.includes('gastos santander') ||
          cNormalized.includes('gastos kutxa')
        ) {
          continue;
        }

        const catName = inferCategory(concepto);
        const catId = getCategoryId(catName);
        const isIngreso = catName === 'Ingresos Trabajo';
        const isTransfer = catName === 'Movimiento Interno';
        const cuentaId = getOrCreateAccountId(bancoRaw || 'Santander');

        let cuentaDestinoId = null;
        if (isTransfer) {
          if (cNormalized.includes('kutxa')) cuentaDestinoId = getOrCreateAccountId('Kutxa');
          else if (cNormalized.includes('n26')) cuentaDestinoId = getOrCreateAccountId('N26');
          else if (cNormalized.includes('santander')) cuentaDestinoId = getOrCreateAccountId('Santander');
        }

        // Columnas 5 a 16 corresponden a Ene (5) hasta Dic (16)
        const blueColors = new Set(['00B0F0', '558ED5', '31859C', '4F81BD', '95B3D7', '2E75B6', '1F4E79', '0070C0', '1B365D', '418AB3', '244062']);

        for (let m = 1; m <= 12; m++) {
          const colIdx = 4 + m;
          const val = row[colIdx];

          if (typeof val === 'number' && Math.abs(val) > 0.01) {
            const mStr = String(m).padStart(2, '0');
            const fecha = `2026-${mStr}-05`;
            const importe = isIngreso ? Math.abs(val) : -Math.abs(val);

            // En el Excel, los valores con celda / texto azul (00B0F0, etc.) son los costes reales ya consolidados
            const colLetter = XLSX.utils.encode_col(colIdx);
            const cellRef = `${colLetter}${r + 1}`;
            const cellObj = anoSheet[cellRef];
            const fgRgb = cellObj?.s?.fgColor?.rgb || '';
            const bgRgb = cellObj?.s?.bgColor?.rgb || '';

            const isBlue = blueColors.has(fgRgb.toUpperCase()) || blueColors.has(bgRgb.toUpperCase()) || fgRgb.toUpperCase() === '00B0F0' || bgRgb.toUpperCase() === '00B0F0';
            const esConsolidado = isBlue ? 1 : 0;

            importedMovements.push({
              fecha,
              cuenta_id: cuentaId,
              categoria_id: catId,
              subcategoria: concepto,
              concepto: concepto,
              importe,
              es_transferencia_interna: isTransfer ? 1 : 0,
              cuenta_destino_id: cuentaDestinoId,
              es_consolidado: esConsolidado,
              etiqueta_especial: inferSpecialTag(concepto),
              notas: `Balance 2026 Matriz Fila ${r + 1}`
            });
          }
        }
      }
    }

    // ==========================================
    // 2. PROCESAR HOJA 'GASTOS ' (Bloques por Entidad: Santander, Kutxa, N26, Tarjeta Kutxa)
    // ==========================================
    if (gastosSheetName) {
      const gastosSheet = workbook.Sheets[gastosSheetName];
      const dataGastos = XLSX.utils.sheet_to_json(gastosSheet, { header: 1, defval: null });

      const bankSections = [
        { name: 'Santander', bank: 'Santander', defaultType: 'corriente', isCardBreakdown: false, startRow: 2, endRow: 16 },
        { name: 'Kutxa', bank: 'Kutxa', defaultType: 'corriente', isCardBreakdown: false, startRow: 21, endRow: 53 },
        { name: 'N26', bank: 'N26', defaultType: 'ahorro_emergencia', isCardBreakdown: false, startRow: 57, endRow: 75 },
        { name: 'Tarjeta Kutxa', bank: 'Tarjeta Kutxa', defaultType: 'tarjeta', isCardBreakdown: true, startRow: 80, endRow: 118 }
      ];

      for (const sec of bankSections) {
        const defaultSecAccountId = getOrCreateAccountId(sec.bank, sec.defaultType);

        for (let m = 0; m < 12; m++) {
          const colStart = 1 + (m * 6);
          const mesNumero = m + 1;

          for (let r = sec.startRow; r <= sec.endRow && r < dataGastos.length; r++) {
            const row = dataGastos[r];
            if (!row) continue;

            const rawDia = row[colStart];
            const rawTienda = row[colStart + 1];
            const rawConcepto = row[colStart + 2];
            const rawCantidad = row[colStart + 4];
            const rawBanco = row[colStart + 5];

            // Solo filas con día válido o concepto/tienda real (evita totales vacíos)
            if (rawDia !== null && rawDia !== undefined && (rawTienda || rawConcepto) && rawCantidad !== null && rawCantidad !== undefined && rawCantidad !== '') {
              const numAmount = typeof rawCantidad === 'number' 
                ? rawCantidad 
                : parseFloat(String(rawCantidad).replace('€', '').replace(/\s/g, '').replace(',', '.'));

              if (!isNaN(numAmount) && Math.abs(numAmount) > 0.001) {
                const tienda = String(rawTienda || '').trim();
                const concepto = String(rawConcepto || tienda).trim();
                const cLower = (concepto + ' ' + tienda).toLowerCase();

                if (cLower.startsWith('total') || cLower.startsWith('gastos mes')) {
                  continue;
                }

                const fecha = parseDateString(rawDia, mesNumero, 2026);
                
                // En la sección Kutxa, GASTOS TARJETA es el cargo bancario real en la cuenta Kutxa
                // En la sección Desglose Tarjeta Kutxa, cuentaId es Tarjeta Kutxa y cuentaImputadaId es el banco asignado (K, S, N)
                const cuentaId = sec.isCardBreakdown
                  ? defaultSecAccountId
                  : (rawBanco ? getOrCreateAccountId(rawBanco) : defaultSecAccountId);

                const cuentaImputadaId = sec.isCardBreakdown
                  ? (rawBanco ? getOrCreateAccountId(rawBanco) : getOrCreateAccountId('Kutxa'))
                  : null;

                const catName = inferCategory(concepto, tienda);
                const catId = getCategoryId(catName);
                const isTransfer = catName === 'Movimiento Interno';

                let cuentaDestinoId = null;
                if (isTransfer) {
                  if (cLower.includes('kutxa')) cuentaDestinoId = getOrCreateAccountId('Kutxa');
                  else if (cLower.includes('n26')) cuentaDestinoId = getOrCreateAccountId('N26');
                  else if (cLower.includes('santander')) cuentaDestinoId = getOrCreateAccountId('Santander');
                  else if (cLower.includes('revolut')) cuentaDestinoId = getOrCreateAccountId('N26');
                }

                const finalConcepto = sec.isCardBreakdown
                  ? (concepto || tienda)
                  : (cLower.includes('gastos tarjeta') ? 'GASTOS TARJETA' : concepto);

                importedMovements.push({
                  fecha,
                  cuenta_id: cuentaId,
                  cuenta_imputada_id: cuentaImputadaId,
                  categoria_id: catId,
                  subcategoria: tienda || concepto,
                  concepto: finalConcepto,
                  importe: numAmount < 0 ? numAmount : -Math.abs(numAmount),
                  es_transferencia_interna: isTransfer ? 1 : 0,
                  cuenta_destino_id: cuentaDestinoId,
                  es_consolidado: 1, // Tickets reales registrados
                  etiqueta_especial: sec.isCardBreakdown ? (inferSpecialTag(concepto, tienda) || 'Tarjeta Kutxa') : inferSpecialTag(concepto, tienda),
                  notas: `Hoja GASTOS ${sec.name} Mes ${mesNumero} Fila ${r + 1}`
                });
              }
            }
          }
        }
      }
    }
  } else {
    // ==========================================
    // 3. PROCESAR TABLA PLANA / LISTADO CSV O EXCEL DIRECTO DE MOVIMIENTOS
    // ==========================================
    const firstSheet = workbook.Sheets[sheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

    for (const row of rawRows) {
      const keys = Object.keys(row);
      const getVal = (...aliases) => {
        for (const alias of aliases) {
          const foundKey = keys.find(k => k.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === alias.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
          if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
            return row[foundKey];
          }
        }
        return null;
      };

      const rawFecha = getVal('fecha', 'date', 'f. valor', 'f. operacion', 'dia');
      const rawCuenta = getVal('cuenta', 'account', 'banco', 'origen') || defaultAccountName;
      const rawConcepto = getVal('concepto', 'description', 'detalle', 'descripcion', 'movimiento', 'tienda');
      const rawSubcat = getVal('subcategoria', 'tienda', 'comercio', 'establecimiento') || '';
      const rawCategoria = getVal('categoria', 'category', 'tipo gasto');
      const rawImporte = getVal('importe', 'amount', 'cantidad', 'valor', 'total');
      const rawTransfer = getVal('transferencia interna', 'transferencia', 'es_transferencia', 'traspaso');
      const rawDestino = getVal('cuenta destino', 'destino', 'cuenta_destino');
      const rawEtiqueta = getVal('etiqueta especial', 'etiqueta', 'proyecto', 'tag');
      const rawNotas = getVal('notas', 'comentarios', 'observaciones') || '';

      if (!rawFecha && !rawImporte && !rawConcepto) continue;

      const fecha = parseDateString(rawFecha);
      const cuentaId = getOrCreateAccountId(rawCuenta);
      const concepto = String(rawConcepto || rawSubcat || 'Movimiento importado').trim();
      const subcategoria = String(rawSubcat || '').trim();

      let numImporte = 0;
      if (typeof rawImporte === 'number') {
        numImporte = rawImporte;
      } else if (typeof rawImporte === 'string') {
        numImporte = parseFloat(rawImporte.replace('€', '').replace(/\s/g, '').replace(',', '.'));
      }

      if (isNaN(numImporte) || numImporte === 0) continue;

      let catId = null;
      if (rawCategoria) {
        const found = categoriasList.find(c => c.nombre.toLowerCase() === String(rawCategoria).toLowerCase().trim());
        if (found) catId = found.id;
      }
      if (!catId) {
        const inferred = inferCategory(concepto, subcategoria);
        catId = getCategoryId(inferred);
      }

      let isTransfer = 0;
      let cuentaDestinoId = null;
      if (rawTransfer && (String(rawTransfer).toLowerCase() === '1' || String(rawTransfer).toLowerCase() === 'si' || String(rawTransfer).toLowerCase() === 'true')) {
        isTransfer = 1;
        if (rawDestino) {
          cuentaDestinoId = getOrCreateAccountId(rawDestino);
        }
      } else if (inferCategory(concepto, subcategoria) === 'Movimiento Interno') {
        isTransfer = 1;
        if (rawDestino) {
          cuentaDestinoId = getOrCreateAccountId(rawDestino);
        }
      }

      const etiqueta = rawEtiqueta ? String(rawEtiqueta).trim() : inferSpecialTag(concepto, subcategoria);

      importedMovements.push({
        fecha,
        cuenta_id: cuentaId,
        categoria_id: catId,
        subcategoria,
        concepto,
        importe: numImporte,
        es_transferencia_interna: isTransfer,
        cuenta_destino_id: cuentaDestinoId,
        es_consolidado: 1,
        etiqueta_especial: etiqueta,
        notas: String(rawNotas)
      });
    }
  }

  // ==========================================
  // INSERCIÓN DE MOVIMIENTOS EN BASE DE DATOS
  // ==========================================
  for (const mov of importedMovements) {
    try {
      const duplicate = checkDuplicateStmt.get(mov.fecha, mov.cuenta_id, mov.concepto, mov.importe);
      if (duplicate) {
        results.movimientosDuplicadosIgnorados++;
        continue;
      }

      insertMovStmt.run(
        mov.fecha,
        mov.cuenta_id,
        mov.cuenta_imputada_id || null,
        mov.categoria_id,
        mov.subcategoria || null,
        mov.concepto,
        mov.importe,
        mov.es_transferencia_interna ? 1 : 0,
        mov.cuenta_destino_id || null,
        mov.es_consolidado !== undefined ? mov.es_consolidado : 1,
        mov.etiqueta_especial || null,
        mov.notas || null,
        mov.usuario_id || 1
      );

      results.movimientosImportados++;
    } catch (err) {
      results.errores.push(err.message);
    }
  }

  return results;
}

module.exports = {
  parseExcelFile,
  inferCategory,
  inferSpecialTag,
  mapAccountName
};
