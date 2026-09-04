# 🎨 Guía de Patrones de Diseño y UI - Finanzas

Este documento establece las reglas visuales, de maquetación y de tipografía para toda la aplicación.

---

## 1. 📏 Principio Fundamental: Cero Barras de Desplazamiento Horizontal
* **Regla estricta**: En ningún caso deben aparecer barras de desplazamiento horizontal (`overflow-x: scroll` o `overflow-x: auto`) en pantallas de escritorio o tabletas.
* Todas las tablas matriciales, tarjetas de KPIs y paneles deben ajustarse al 100% del ancho del contenedor (`w-full`).
* **Columnas de matriz anual (12 meses + Concepto + Total)**:
  * Utilizar `table-fixed` con anchos proporcionales en porcentaje:
    * `Concepto`: `16%` (alineado a la izquierda)
    * `12 Meses (Ene..Dic)`: `6.4%` cada uno (**alineados al centro**)
    * `Total Año`: `7.2%` (**alineado al centro**)
  * Las cifras en la matriz se formatean de forma compacta (sin decimales innecesarios en la vista compacta, p. ej. `4.281 €`) y con tooltip para ver el detalle con decimales al pasar el ratón.

---

## 2. 🏷️ Tarjetas de KPIs (Cero Puntos Suspensivos)
* **Prohibición de truncado**: Ningún número o métrica financiera puede mostrarse cortado con puntos suspensivos (`...` / `text-ellipsis`).
* **Jerarquía tipográfica fluida**:
  * **Título del KPI**: `text-[10px] sm:text-[11px] font-bold uppercase tracking-tight text-slate-500 line-clamp-2` (permite 2 líneas limpias si el texto es largo).
  * **Cifra / Importe**: `text-sm sm:text-base lg:text-sm xl:text-base 2xl:text-lg font-black whitespace-nowrap`.
  * **Icono**: `p-1.5 sm:p-2 rounded-xl shrink-0` con tamaño `w-3.5 h-3.5 sm:w-4 sm:h-4`.
  * **Subtítulo**: `text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-200/50`.

---

## 3. 📊 Tablas de Movimientos y Saldos
* **Columnas siempre visibles**:
  1. `Fecha` (formato legible `DD/MM/YYYY` o `DD MMM`).
  2. `Estado`: Píldora interactiva 🟢 `✓ Real` (Verde esmeralda) vs 🟡 `⏳ Previsto` (Amarillo punteado).
  3. `Cuenta`: Punto de color del banco + Nombre de cuenta (+ flecha si es traspaso).
  4. `Concepto / Tienda`: En negrita con subcategoría debajo.
  5. `Categoría`: Píldora con fondo al 15% de opacidad y color semántico.
  6. `Importe`: Verde `+` para ingresos, Rojo `-` para gastos, Azul `➔` para traspasos.
  7. `Saldo Cuenta`: Saldo particular resultante en esa cuenta tras la operación.
  8. `Saldo Global`: Saldo total acumulado líquido (destacado en tono índigo).
  9. `Acciones`: Iconos de editar (lápiz) y eliminar (papelera).

---

## 4. 🎨 Paleta de Colores y Tokens
* **Verde Éxito / Ingresos / Real**:
  * Fondo: `bg-emerald-50 dark:bg-emerald-950/30`
  * Borde: `border-emerald-200 dark:border-emerald-800/60`
  * Texto: `text-emerald-600 dark:text-emerald-400`
* **Rojo Alerta / Gastos**:
  * Fondo: `bg-rose-50 dark:bg-rose-950/30`
  * Borde: `border-rose-200 dark:border-rose-800/60`
  * Texto: `text-rose-600 dark:text-rose-400`
* **Amarillo Previsto / Simulación**:
  * Fondo: `bg-amber-50 dark:bg-amber-950/30`
  * Borde: `border-amber-300 dark:border-amber-700/80 border-dashed`
  * Texto: `text-amber-700 dark:text-amber-300`
* **Índigo / Saldos Globales / Destacados**:
  * Fondo: `bg-indigo-50 dark:bg-indigo-950/30`
  * Borde: `border-indigo-200 dark:border-indigo-800/60`
  * Texto: `text-indigo-700 dark:text-indigo-300`

---

## 5. 📈 Reglas de Gráficos (Recharts)
* **Ejes Verticales (`YAxis`)**:
  * Establecer `width={75}` y margen izquierdo positivo (`margin={{ left: 15 }}`) para garantizar que cifras de 5 o más dígitos (ej. `10.000 €`, `12.500 €`) se lean en una **única línea** sin saltos ni cortes.
  * Formateador de etiquetas: `Math.round(val).toLocaleString('es-ES') + ' €'`.
* **Gráfico Mixto (ComposedChart)**:
  * Barras: Ingresos Netos (verde), Gastos Consumo (rojo), Inversión (azul añil).
  * Línea continua azul (`#2563eb`): **Saldo Real Líquido** (meses consolidados).
  * Línea punteada morada (`#a855f7`): **Saldo Proyectado / Simulación** (meses futuros).
* **Interacción**:
  * La selección de mes se realiza directamente haciendo clic en las barras interactivas del gráfico.

---

## 6. 💬 Mensajes de Confirmación y Notificaciones (Cero Alertas Nativas del Sistema)
* **Prohibición estricta**: Queda terminantemente prohibido utilizar las ventanas modales nativas del navegador (`window.alert()` y `window.confirm()`).
* **Línea de diseño obligatoria**:
  * **Notificaciones Flotantes (Toasts)**: Usar el hook `useToast()` (`toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`). Toasts con bordes redondeados (`rounded-2xl`), efecto cristal (`backdrop-blur-md`), colores semánticos con badges, temporizador de auto-cierre y botón de descartar.
  * **Modales de Confirmación**: Usar `confirmDialog({ title, message, confirmText, cancelText, type: 'danger' | 'warning' | 'info' })`. Modal centrado con fondo desenfocado (`backdrop-blur-sm`), tarjeta blanca/oscura (`dark:bg-slate-900`), icono descriptivo de gran tamaño y botones estilizados acordes a la acción.

---

## 7. 🎛️ Modales y Formularios de Creación / Edición
* **No solapamiento**: Los selectores de color identificativo, iconos o campos complementarios nunca deben montarse sobre otros elementos ni etiquetas. Deben colocarse en su propia línea con una separación visual adecuada (`space-y-4` o grid responsive).
* **Accesibilidad y ergonomía**:
  * Todos los inputs deben contar con labels claras, contrastadas y formateadas con `text-xs font-bold uppercase tracking-wider`.
  * Los botones principales de acción deben destacar con sombras de color (`shadow-lg shadow-indigo-600/25`) y transiciones suaves (`transition-all`).

---

## 8. 💳 Movimientos de Tarjeta vs Cuenta
* **Diferenciación conceptual**: Los movimientos propios de una tarjeta de crédito/débito deben poder consultarse de forma desglosada haciendo clic en el apunte bancario correspondiente de la cuenta corriente.
* **Modal de desglose interactivo**: Un modal estilizado (`CardBreakdownModal`) muestra la lista de compras individuales vinculadas a ese cargo agrupado, permitiendo añadir, editar y eliminar gastos de tarjeta con cálculo automático del importe total.

---

## 9. 🏛️ Estructura y Jerarquía del Dashboard
* **Orden de bloques**:
  1. **Cabecera y Resumen Patrimonial Global** (Saldo total actual, desglose por bancos a primeros de mes y a fecha actual).
  2. **Evolución de Saldos y Previsiones Anuales** (Gráfico y KPIs de evolución temporal).
  3. **Detalle de Movimientos del Mes** (con filtros, ordenación por estado Real/Previsto y sin duplicar KPIs redundantes de ingresos/gastos).
  4. **Matriz Anual Financiera y Gráfica de Distribución de Gastos** (al final de la vista para consulta analítica profunda).

---

## 10. 🧮 Simulador de Préstamos y Pasivos
* **Consistencia matemática trilateral**: En todo momento deben mantenerse sincronizados la **Fecha Fin Prevista**, el **Plazo Restante** y la **Cuota Mensual** mediante amortización francesa ($PMT = C \cdot \frac{r(1+r)^n}{(1+r)^n-1}$).
* **Multíndice de Referencia**: Soporte para *Euríbor 12M, Euríbor 6M, Euríbor 3M, IRPH Entidades, Míbor y Personalizado*.
* **Cuota Teórica Estimada vs Real Bancaria**: La tabla histórica anual debe mostrar la cuota calculada teóricamente según el índice oficial de ese año, permitiendo introducir la cuota real cobrada por el banco y restablecer la teórica con un botón de reseteo.

---

## 11. 💾 Respaldo y Continuidad de Datos (Backups)
* **Acceso global**: Botón en la barra de navegación con icono de base de datos.
* **Formatos**: Descarga directa de base de datos SQLite `.db`, exportación completa en formato JSON y gestión de snapshots locales en el servidor.
* **Seguridad pre-restauración**: Antes de restaurar cualquier copia, se genera automáticamente una instantánea de seguridad previa de respaldo.

---

## 12. 📑 Optimización Fiscal de Hipotecas y Cotitularidad (Deducción IRPF)
* **Tope computable por titular**:
  * **País Vasco (Gipuzkoa, Bizkaia, Araba)**: 18% general hasta **8.500 €/año por titular** (máximo 1.530 € de deducción en cuota IRPF).
  * **Régimen Estatal (AEAT)**: 15% general hasta **9.040 €/año por titular** (máximo 1.356 € de deducción en cuota IRPF).
* **Multiplicador por Cotitulares (1 vs 2)**:
  * Al indicar **2 cotitulares** (tributación individual), la base anual computable máxima deducible de la hipoteca se multiplica por 2:
    * **País Vasco**: **17.000 €/año** (hasta **3.060 €** de devolución).
    * **Régimen Estatal**: **18.080 €/año** (hasta **2.712 €** de devolución).
* **Cálculo del Tope Óptimo de Amortización**:
  * Descuenta de forma exacta las 12 cuotas anuales ordinarias ya abonadas:
    $$\text{Tope Óptimo Extraordinario} = \max\Big(0, (\text{Base Límite} \times \text{Nº Titulares}) - (\text{Cuota Mensual} \times 12)\Big)$$
  * Esto garantiza que los botones rápidos de amortización nunca recomienden aportar más dinero del que realmente desgrava en la declaración de la Renta.


