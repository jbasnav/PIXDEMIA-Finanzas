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
