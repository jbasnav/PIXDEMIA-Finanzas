# Finanzas Personales & Tesorería Familiar 2026

Aplicación web local full-stack diseñada para la gestión financiera integral y tesorería familiar, reemplazando el libro Excel 'Balance 2026' y eliminando los problemas de doble contabilidad y fragmentación de datos.

---

## 🚀 Inicio Rápido

### 1. Requisitos Previos
- **Node.js:** v18 o superior.
- **NPM:** Incluido con Node.js.

### 2. Iniciar el Servidor y la Aplicación

Para ejecutar la aplicación en modo desarrollo (Backend Express + Frontend React Vite):
```bash
npm run dev
```

O si deseas arrancar el servidor backend en producción (sirviendo el frontend compilado):
```bash
npm start
```

La aplicación estará disponible inmediatamente en tu navegador en:
👉 **`http://localhost:5173`** (modo desarrollo) o **`http://localhost:5000`** (servidor completo)

---

## 📊 Módulos y Funcionalidades

### 1. Dashboard Principal (Resumen Ejecutivo)
- **KPIs Financieros en Tiempo Real:** Ingresos Netos, Gastos Reales de Consumo, Tasa de Ahorro Real (%), Saldo Líquido Disponible (Santander + Kutxa + N26), Patrimonio Invertido (EPSVs + Indexa) y Patrimonio Neto Familiar.
- **Gráfico Mensual:** Ingresos vs. Gastos vs. Asignación Inversión de los 12 meses.
- **Gráfico Donut:** Desglose del gasto por categorías de consumo.
- **Control de Presupuestos:** Alertas visuales de sobregasto por categoría.

### 2. Contabilidad Estricta (Cero Doble Contabilización)
- **Aislamiento de Transferencias Internas:** Cualquier traspaso entre cuentas propias (ej. Santander a N26 o Kutxa) actualiza los saldos de ambas cuentas pero tiene un impacto neto de exactamente **0,00 €** en la cuenta de resultados anual y P&L familiar.
- **Separación de Consumo vs. Creación de Patrimonio:** Amortizaciones de pasivos y aportaciones a EPSV/Indexa se calculan de manera diferenciada respecto al consumo corriente a fondo perdido.

### 3. Registro Rápido de Movimientos
- Formulario modal optimizado para móvil y PC.
- Selector ágil de tipo: **Gasto / Ingreso / Traspaso Interno**.
- Autocompletado de establecimientos habituales (*Eroski, Lidl, Leroy Merlin, Reonor, Repsol...*).
- Asignación de proyectos especiales (*Obra Local, Viaje Londres, Furgoneta...*).

### 4. Monitor de Obras y Proyectos Especiales
- Seguimiento presupuestario de grandes hitos y reformas (ej. *Reforma Local / Riff / Reonor*).
- Visualización de costes acumulados, total invertido y lista cronológica de facturas y materiales.

### 5. Simulador de Pasivos & Furgoneta Camper
- **Curva de Extinción:** Visualización de la amortización progresiva de la Hipoteca Santander y el Préstamo Local Juancar hasta su extinción en 2029-2030.
- **Calculadora Furgoneta:** Ajuste dinámico de importe (20k - 50k €), plazo (5 - 8 años) y tipo de interés, calculando automáticamente la cuota resultante y el **Ratio de Endeudamiento Familiar (DTI)** comparado contra el umbral bancario del 35%.

### 6. Migración e Importación desde '00. Balance 2026 IA.xlsx'
- **Desde la Web:** Modal integrado con soporte drag & drop para subir directamente el archivo `.xlsx`.
- **Desde Línea de Comandos:**
  ```bash
  node server/scripts/importExcel.js "00. Balance 2026 IA.xlsx"
  ```
- Parseo automatizado de:
  - Hoja `AÑO 2026`: Saldos iniciales, nóminas mensuales y recibos domiciliados.
  - Hoja `GASTOS `: Columnas bancarias y compras detalladas con tarjeta.
  - Detección idempotente para evitar movimientos duplicados.

---

## 🗄️ Persistencia y Portabilidad

- **Base de Datos:** SQLite local almacenada en `data/finanzas.db`.
- **Portabilidad Total:** No requiere servidores externos ni bases de datos en la nube. Copiando la carpeta tienes una copia de seguridad íntegra de todos tus datos financieros.
