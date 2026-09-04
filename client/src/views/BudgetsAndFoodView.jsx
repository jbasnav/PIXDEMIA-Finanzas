import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tv, 
  Film, 
  ShoppingBag, 
  GraduationCap, 
  Palette, 
  Music, 
  Bot, 
  Cloud, 
  Utensils, 
  Users, 
  TrendingUp, 
  Store, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  PauseCircle, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  DollarSign, 
  Calendar, 
  Scale, 
  ChefHat, 
  Tag,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShoppingBasket,
  ShoppingCart,
  Image as ImageIcon,
  Check,
  CheckSquare,
  Square,
  Search,
  ChevronRight,
  Info,
  Copy,
  RotateCcw,
  Percent,
  Award,
  ExternalLink
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val || 0);
};

const LOGOS_PREDEFINIDOS = [
  { nombre: 'Netflix', url: '/logos/netflix.svg', color: '#e50914' },
  { nombre: 'Amazon Prime', url: '/logos/amazon-prime.svg', color: '#00a8e1' },
  { nombre: 'HBO Max', url: '/logos/hbo-max.svg', color: '#002be7' },
  { nombre: 'Spotify', url: '/logos/spotify.svg', color: '#1db954' },
  { nombre: 'Coursera', url: '/logos/coursera.svg', color: '#0056d2' },
  { nombre: 'Domestika', url: '/logos/domestika.svg', color: '#ff4c5a' },
  { nombre: 'ChatGPT', url: '/logos/chatgpt.svg', color: '#10a37f' },
  { nombre: 'Google One', url: '/logos/google-one.svg', color: '#4285f4' },
  { nombre: 'Disney+', url: '/logos/disney-plus.svg', color: '#113ccf' },
  { nombre: 'Apple', url: '/logos/apple.svg', color: '#000000' },
  { nombre: 'YouTube', url: '/logos/youtube.svg', color: '#ff0000' }
];

const DEFAULT_SUPERMERCADOS = ['Eroski', 'Mercadona', 'Lidl', 'BM', 'DIA', 'ALDI', 'Comercio Local'];

export default function BudgetsAndFoodView() {
  const { toast, confirmDialog } = useToast();
  const [activeTab, setActiveTab] = useState('catalogo'); // 'suscripciones', 'menus', 'catalogo', 'cesta', 'evolucion'

  // Estados Suscripciones
  const [suscripciones, setSuscripciones] = useState([]);
  const [subsKpis, setSubsKpis] = useState({ costeMensualizadoTotal: 0, costeAnualTotal: 0, totalActivas: 0, totalPausadas: 0, porCategoria: {} });
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [subForm, setSubForm] = useState({
    nombre: '',
    categoria_servicio: 'Streaming',
    coste_recurrente: 9.99,
    periodicidad: 'mensual',
    fecha_proxima_renovacion: new Date().toISOString().split('T')[0],
    estado: 'activo',
    compartido_con: '',
    icono: 'Tv',
    logo_url: '',
    color: '#6366f1',
    notas: ''
  });

  // Estados Alimentación
  const [foodDashboard, setFoodDashboard] = useState(null);
  const [productos, setProductos] = useState([]);
  const [menus, setMenus] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [comercioFiltroMenu, setComercioFiltroMenu] = useState('mejor_precio'); // 'mejor_precio', 'Eroski', 'Mercadona', 'Lidl', 'BM', 'DIA', 'ALDI', 'Carnicería Local'
  const [personas, setPersonas] = useState([]);
  const [historicoPrecios, setHistoricoPrecios] = useState({ registros: [], timeline: [] });
  const [selectedProductoGrafica, setSelectedProductoGrafica] = useState('');

  // Supermercados y Comercios
  const [comerciosList, setComerciosList] = useState(() => {
    try {
      const saved = localStorage.getItem('pixdemia_supermercados_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_SUPERMERCADOS;
  });
  const [isAddComercioModalOpen, setIsAddComercioModalOpen] = useState(false);
  const [newComercioName, setNewComercioName] = useState('');

  // Ordenación y Filtros de la Tabla de Catálogo & Comparador
  const [sortKey, setSortKey] = useState('nombre');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [busquedaProd, setBusquedaProd] = useState('');
  const [categoriaFiltroProd, setCategoriaFiltroProd] = useState('');

  // Estados del Carrito de la Compra Inteligente
  const [carrito, setCarrito] = useState(() => {
    try {
      const saved = localStorage.getItem('pixdemia_carrito_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [quickAddSearch, setQuickAddSearch] = useState('');

  // Guardar cambios en el carrito y lista de comercios en localStorage
  useEffect(() => {
    localStorage.setItem('pixdemia_carrito_v2', JSON.stringify(carrito));
  }, [carrito]);

  useEffect(() => {
    localStorage.setItem('pixdemia_supermercados_v1', JSON.stringify(comerciosList));
  }, [comerciosList]);

  // Modales y Editores de Menú
  const [isEditDayModalOpen, setIsEditDayModalOpen] = useState(false);
  const [editingDayKey, setEditingDayKey] = useState('lunes');
  const [editingDayData, setEditingDayData] = useState({
    comida: '',
    cena: '',
    ingredientesComida: [], // [{ producto_id, cantidad, unidad }]
    ingredientesCena: []
  });

  // Modales de Productos y Precios
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [prodForm, setProdForm] = useState({
    nombre: '',
    categoria: 'Despensa y Básicos',
    unidad_medida: 'kg',
    precio_referencia_actual: 1.50,
    comercio_habitual: 'Eroski',
    notas: ''
  });

  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [priceForm, setPriceForm] = useState({
    producto_id: '',
    comercio: 'Eroski',
    precio: 1.50,
    fecha_registro: new Date().toISOString().split('T')[0],
    es_oferta: false,
    notas: ''
  });

  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [personaForm, setPersonaForm] = useState({
    nombre: '',
    rol: 'Adulto',
    factor_consumo: 1.0,
    activo: true,
    notas: ''
  });

  const [loading, setLoading] = useState(true);

  // Carga de datos
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [subsRes, foodDashRes, prodsRes, menusRes, personasRes, histRes] = await Promise.all([
        api.getSuscripciones(),
        api.getAlimentacionDashboard(),
        api.getProductosAlimentacion(),
        api.getMenusPlanificados(),
        api.getPersonasHogar(),
        api.getHistoricoPrecios({ productoId: selectedProductoGrafica || undefined })
      ]);

      setSuscripciones(subsRes.suscripciones || []);
      setSubsKpis(subsRes.kpis || {});
      setFoodDashboard(foodDashRes);
      setProductos(prodsRes || []);
      setMenus(menusRes || []);
      if (menusRes && menusRes.length > 0 && !selectedMenu) {
        setSelectedMenu(menusRes[0]);
      } else if (selectedMenu && menusRes) {
        const found = menusRes.find(m => m.id === selectedMenu.id);
        if (found) setSelectedMenu(found);
      }
      setPersonas(personasRes || []);
      setHistoricoPrecios(histRes || { registros: [], timeline: [] });
    } catch (err) {
      console.error('Error cargando datos de partidas y alimentación:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedProductoGrafica]);

  // Obtener precio de un producto según comercio seleccionado
  const getProductPrice = (productoId, comercioPref = comercioFiltroMenu) => {
    const prod = productos.find(p => p.id === Number(productoId));
    if (!prod) return 0;
    
    if (comercioPref !== 'mejor_precio') {
      if (prod.preciosPorComercio && prod.preciosPorComercio[comercioPref] !== undefined) {
        return prod.preciosPorComercio[comercioPref];
      }
    }

    // Si es mejor precio o no está en ese comercio, buscar el mínimo disponible o precio referencia
    if (prod.preciosPorComercio) {
      const vals = Object.values(prod.preciosPorComercio).filter(v => typeof v === 'number' && v > 0);
      if (vals.length > 0) return Math.min(...vals);
    }
    return prod.precio_referencia_actual || 0;
  };

  // Calcular coste de una lista de ingredientes
  const computeIngredientsCost = (ingredientes = [], comercioPref = comercioFiltroMenu) => {
    return ingredientes.reduce((acc, item) => {
      const unitPrice = getProductPrice(item.producto_id, comercioPref);
      const cant = Number(item.cantidad) || 0;
      return acc + (unitPrice * cant);
    }, 0);
  };

  // Calcular coste semanal total de un menú
  const computeMenuTotalCost = (menu, comercioPref = comercioFiltroMenu) => {
    if (!menu || !menu.detalles) return menu?.coste_estimado_semanal || 140;
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    let total = 0;
    let hasDetailedIngredients = false;

    dias.forEach(d => {
      const diaObj = menu.detalles[d];
      if (diaObj) {
        const c1 = computeIngredientsCost(diaObj.ingredientesComida || [], comercioPref);
        const c2 = computeIngredientsCost(diaObj.ingredientesCena || [], comercioPref);
        if (c1 > 0 || c2 > 0) hasDetailedIngredients = true;
        total += (c1 + c2);
      }
    });

    if (!hasDetailedIngredients) {
      return menu.coste_estimado_semanal || 148.50;
    }
    return Number(total.toFixed(2));
  };

  // Manejo de Suscripciones
  const handleSaveSub = async (e) => {
    e.preventDefault();
    try {
      if (editingSub) {
        await api.updateSuscripcion(editingSub.id, subForm);
      } else {
        await api.createSuscripcion(subForm);
      }
      setIsSubModalOpen(false);
      setEditingSub(null);
      loadAllData();
      toast.success('Suscripción guardada correctamente', 'Suscripciones');
    } catch (err) {
      toast.error(err.message, 'Error en Suscripción');
    }
  };

  const handleToggleSubState = async (sub) => {
    const nuevoEstado = sub.estado === 'activo' ? 'pausado' : 'activo';
    await api.updateSuscripcion(sub.id, { estado: nuevoEstado });
    loadAllData();
    toast.info(`Suscripción ${sub.nombre} ${nuevoEstado === 'activo' ? 'activada' : 'pausada'}.`);
  };

  const handleDeleteSub = async (id) => {
    const ok = await confirmDialog({
      title: 'Eliminar Suscripción',
      message: '¿Estás seguro de que deseas eliminar esta suscripción recurrente?',
      confirmText: 'Sí, Eliminar',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await api.deleteSuscripcion(id);
      loadAllData();
      toast.success('Suscripción eliminada', 'Suscripciones');
    } catch (err) {
      toast.error('Error al eliminar suscripción: ' + err.message);
    }
  };

  // Abrir editor de un día específico del menú
  const handleOpenEditDay = (diaKey) => {
    if (!selectedMenu) return;
    setEditingDayKey(diaKey);
    const existing = selectedMenu.detalles?.[diaKey] || {
      comida: '',
      comidaSegundo: '',
      cena: '',
      cenaSegundo: '',
      ingredientesComida: [],
      ingredientesCena: []
    };
    setEditingDayData({
      comida: existing.comida || '',
      comidaSegundo: existing.comidaSegundo || '',
      cena: existing.cena || '',
      cenaSegundo: existing.cenaSegundo || '',
      ingredientesComida: existing.ingredientesComida ? [...existing.ingredientesComida] : [],
      ingredientesCena: existing.ingredientesCena ? [...existing.ingredientesCena] : []
    });
    setIsEditDayModalOpen(true);
  };

  // Guardar día editado en el menú
  const handleSaveDayToMenu = async () => {
    if (!selectedMenu) return;
    const newDetalles = {
      ...(selectedMenu.detalles || {}),
      [editingDayKey]: {
        comida: editingDayData.comida,
        comidaSegundo: editingDayData.comidaSegundo || '',
        cena: editingDayData.cena,
        cenaSegundo: editingDayData.cenaSegundo || '',
        ingredientesComida: editingDayData.ingredientesComida,
        ingredientesCena: editingDayData.ingredientesCena
      }
    };

    const newMenuObj = {
      ...selectedMenu,
      detalles: newDetalles
    };

    const newTotalCost = computeMenuTotalCost(newMenuObj, comercioFiltroMenu);

    try {
      await api.updateMenuPlanificado(selectedMenu.id, {
        detalles: newDetalles,
        coste_estimado_semanal: newTotalCost
      });
      setIsEditDayModalOpen(false);
      loadAllData();
      toast.success('Menú del día actualizado con éxito', 'Planificador Semanal');
    } catch (err) {
      toast.error('Error al guardar día del menú: ' + err.message);
    }
  };

  // Añadir ingrediente a un plato en el editor de día
  const handleAddIngredient = (tipo) => {
    if (productos.length === 0) return;
    const firstProd = productos[0];
    const item = { producto_id: firstProd.id, cantidad: 1, unidad: firstProd.unidad_medida };
    if (tipo === 'comida') {
      setEditingDayData(prev => ({ ...prev, ingredientesComida: [...prev.ingredientesComida, item] }));
    } else {
      setEditingDayData(prev => ({ ...prev, ingredientesCena: [...prev.ingredientesCena, item] }));
    }
  };

  const handleUpdateIngredient = (tipo, idx, field, val) => {
    const listKey = tipo === 'comida' ? 'ingredientesComida' : 'ingredientesCena';
    const list = [...editingDayData[listKey]];
    list[idx] = { ...list[idx], [field]: val };
    
    // Si cambia el producto, actualizar unidad
    if (field === 'producto_id') {
      const prod = productos.find(p => p.id === Number(val));
      if (prod) list[idx].unidad = prod.unidad_medida;
    }

    setEditingDayData(prev => ({ ...prev, [listKey]: list }));
  };

  const handleRemoveIngredient = (tipo, idx) => {
    const listKey = tipo === 'comida' ? 'ingredientesComida' : 'ingredientesCena';
    const list = [...editingDayData[listKey]];
    list.splice(idx, 1);
    setEditingDayData(prev => ({ ...prev, [listKey]: list }));
  };

  // Ordenación de la tabla
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Añadir nuevo supermercado dinámico
  const handleAddComercio = (e) => {
    if (e) e.preventDefault();
    const clean = newComercioName.trim();
    if (!clean) return;
    if (comerciosList.some(c => c.toLowerCase() === clean.toLowerCase())) {
      toast.warning('Este supermercado ya está en la lista', 'Supermercados');
      return;
    }
    const updated = [...comerciosList, clean];
    setComerciosList(updated);
    setNewComercioName('');
    setIsAddComercioModalOpen(false);
    toast.success(`Supermercado "${clean}" añadido al comparador`, 'Supermercados');
  };

  // Carrito: Añadir producto individual
  const handleAgregarProductoACarrito = (prod, cantidad = 1) => {
    if (!prod) return;
    setCarrito(prev => {
      const idx = prev.findIndex(item => item.producto_id === prod.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].cantidad = Number((copy[idx].cantidad + cantidad).toFixed(2));
        return copy;
      } else {
        return [
          ...prev,
          {
            id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            producto_id: prod.id,
            nombre: prod.nombre,
            categoria: prod.categoria,
            unidad_medida: prod.unidad_medida,
            cantidad: Number(cantidad),
            comprado: false
          }
        ];
      }
    });
    toast.success(`"${prod.nombre}" añadido a la cesta`, 'Carrito');
  };

  // Carrito: Pasar todos los ingredientes del menú semanal a la Cesta
  const handlePasarMenuACarrito = (menu) => {
    if (!menu) return;
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const itemsToAddMap = new Map();

    // 1. Extraer ingredientes explícitos
    dias.forEach(d => {
      const diaObj = menu.detalles?.[d];
      if (diaObj) {
        const allIngs = [...(diaObj.ingredientesComida || []), ...(diaObj.ingredientesCena || [])];
        allIngs.forEach(ing => {
          const prod = productos.find(p => p.id === Number(ing.producto_id));
          if (prod) {
            const currentQty = itemsToAddMap.get(prod.id)?.cantidad || 0;
            itemsToAddMap.set(prod.id, {
              producto_id: prod.id,
              nombre: prod.nombre,
              categoria: prod.categoria,
              unidad_medida: prod.unidad_medida,
              cantidad: currentQty + (Number(ing.cantidad) || 1)
            });
          }
        });
      }
    });

    // 2. Si el menú tiene recetas escritas pero no ingredientes con ID enlazados, emparejar automáticamente
    if (itemsToAddMap.size === 0) {
      const keywordMap = [
        { kw: 'pollo', prodName: 'Pechuga de Pollo Fileteada 1kg', qty: 2 },
        { kw: 'ternera', prodName: 'Filetes de Ternera 1kg', qty: 1.5 },
        { kw: 'salmón', prodName: 'Salmón Fresco 1kg', qty: 1 },
        { kw: 'salmon', prodName: 'Salmón Fresco 1kg', qty: 1 },
        { kw: 'lenteja', prodName: 'Arroz Redondo 1kg', qty: 1 },
        { kw: 'alubia', prodName: 'Arroz Redondo 1kg', qty: 1 },
        { kw: 'arroz', prodName: 'Arroz Redondo 1kg', qty: 2 },
        { kw: 'huevo', prodName: 'Huevos Camperos (Docena)', qty: 2 },
        { kw: 'tortilla', prodName: 'Huevos Camperos (Docena)', qty: 1 },
        { kw: 'macarron', prodName: 'Pasta Macarrones 1kg', qty: 2 },
        { kw: 'pasta', prodName: 'Pasta Macarrones 1kg', qty: 1 },
        { kw: 'tomate', prodName: 'Tomate Ensalada 1kg', qty: 2 },
        { kw: 'plátano', prodName: 'Plátano de Canarias 1kg', qty: 2 },
        { kw: 'platano', prodName: 'Plátano de Canarias 1kg', qty: 2 },
        { kw: 'pan', prodName: 'Pan Rústico Barra', qty: 5 },
        { kw: 'leche', prodName: 'Leche Entera 1L', qty: 6 },
        { kw: 'yogur', prodName: 'Yogur Natural Pack 8', qty: 2 },
        { kw: 'aceite', prodName: 'Aceite de Oliva V. Extra 1L', qty: 1 }
      ];

      // Analizar todo el texto del menú
      const fullText = JSON.stringify(menu.detalles || '').toLowerCase();
      keywordMap.forEach(({ kw, prodName, qty }) => {
        if (fullText.includes(kw)) {
          const prod = productos.find(p => p.nombre.toLowerCase().includes(prodName.toLowerCase()) || prodName.toLowerCase().includes(p.nombre.toLowerCase()));
          if (prod) {
            itemsToAddMap.set(prod.id, {
              producto_id: prod.id,
              nombre: prod.nombre,
              categoria: prod.categoria,
              unidad_medida: prod.unidad_medida,
              cantidad: qty
            });
          }
        }
      });

      // Si aún estuviera vacío, añadir cesta básica semanal familiar
      if (itemsToAddMap.size === 0 && productos.length > 0) {
        productos.slice(0, 8).forEach(p => {
          itemsToAddMap.set(p.id, {
            producto_id: p.id,
            nombre: p.nombre,
            categoria: p.categoria,
            unidad_medida: p.unidad_medida,
            cantidad: 1
          });
        });
      }
    }

    const newItems = Array.from(itemsToAddMap.values()).map(it => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...it,
      comprado: false
    }));

    setCarrito(newItems);
    setActiveTab('cesta');
    toast.success(`🛒 ${newItems.length} productos del menú transferidos al Carrito de la Compra`, 'Cesta Inteligente');
  };

  // Carrito: Modificar cantidad
  const handleUpdateCantidadCarrito = (itemId, delta) => {
    setCarrito(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Number((item.cantidad + delta).toFixed(2));
        return newQty > 0 ? { ...item, cantidad: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  // Carrito: Toggle Comprado
  const handleToggleComprado = (itemId) => {
    setCarrito(prev => prev.map(item => item.id === itemId ? { ...item, comprado: !item.comprado } : item));
  };

  // Carrito: Eliminar item
  const handleEliminarItemCarrito = (itemId) => {
    setCarrito(prev => prev.filter(item => item.id !== itemId));
  };

  // Carrito: Vaciar
  const handleVaciarCarrito = async () => {
    const ok = await confirmDialog({
      title: 'Vaciar Carrito de la Compra',
      message: '¿Deseas eliminar todos los productos de la lista de la compra?',
      confirmText: 'Sí, Vaciar',
      type: 'warning'
    });
    if (ok) {
      setCarrito([]);
      toast.info('Carrito de la compra vaciado');
    }
  };

  // Carrito: Copiar lista al portapapeles
  const handleCopiarLista = (cestaOptima) => {
    if (carrito.length === 0) return;
    let txt = `🛒 LISTA DE LA COMPRA - FINANZAS\n`;
    txt += `Total artículos: ${carrito.length}\n\n`;

    if (cestaOptima && Object.keys(cestaOptima.porComercio).length > 0) {
      txt += `✨ DÓNDE COMPRAR CADA COSA (Cesta Óptima - Total: ${formatCurrency(cestaOptima.totalOptimo)}):\n`;
      Object.entries(cestaOptima.porComercio).forEach(([comercio, items]) => {
        txt += `\n🏪 ${comercio.toUpperCase()}:\n`;
        items.forEach(it => {
          txt += `  [ ] ${it.nombre} x ${it.cantidad} ${it.unidad_medida} (${formatCurrency(it.subtotal)})\n`;
        });
      });
    } else {
      txt += `📋 ARTÍCULOS:\n`;
      carrito.forEach(it => {
        txt += `  [${it.comprado ? 'X' : ' '}] ${it.nombre}: ${it.cantidad} ${it.unidad_medida}\n`;
      });
    }

    navigator.clipboard.writeText(txt);
    toast.success('Lista de la compra copiada al portapapeles. ¡Lista para WhatsApp o tu móvil!', 'Portapapeles');
  };

  // Análisis y comparativa inteligente de la cesta
  const analisisCarrito = useMemo(() => {
    if (carrito.length === 0) {
      return { totalesPorComercio: {}, ganadorMonotienda: null, masCaroMonotienda: null, ahorroMonotienda: 0, cestaOptima: { totalOptimo: 0, porComercio: {}, ahorroMaximo: 0 } };
    }

    // 1. Coste total por cada supermercado
    const totalesPorComercio = {};

    comerciosList.forEach(comercio => {
      let total = 0;
      let count = 0;
      carrito.forEach(item => {
        const prod = productos.find(p => p.id === item.producto_id);
        const precio = prod?.preciosPorComercio?.[comercio] || prod?.precio_referencia_actual || 0;
        total += (precio * (item.cantidad || 1));
        if (prod?.preciosPorComercio?.[comercio]) count++;
      });
      totalesPorComercio[comercio] = {
        comercio,
        total: Number(total.toFixed(2)),
        itemsConPrecio: count
      };
    });

    const listaOrdenada = Object.values(totalesPorComercio).sort((a, b) => a.total - b.total);
    const ganadorMonotienda = listaOrdenada[0] || null;
    const masCaroMonotienda = listaOrdenada[listaOrdenada.length - 1] || null;
    const ahorroMonotienda = (masCaroMonotienda && ganadorMonotienda) ? Number((masCaroMonotienda.total - ganadorMonotienda.total).toFixed(2)) : 0;

    // 2. Cesta Óptima Multitienda («Dónde comprar cada cosa»)
    const porComercio = {};
    let totalOptimo = 0;

    carrito.forEach(item => {
      const prod = productos.find(p => p.id === item.producto_id);
      let bestComercio = 'Eroski';
      let minPrice = Infinity;

      if (prod && prod.preciosPorComercio) {
        comerciosList.forEach(c => {
          const pr = prod.preciosPorComercio[c];
          if (typeof pr === 'number' && pr > 0 && pr < minPrice) {
            minPrice = pr;
            bestComercio = c;
          }
        });
      }

      if (minPrice === Infinity) {
        minPrice = prod?.precio_referencia_actual || 1.0;
        bestComercio = prod?.comercio_habitual || 'Eroski';
      }

      const subtotal = Number((minPrice * (item.cantidad || 1)).toFixed(2));
      totalOptimo += subtotal;

      if (!porComercio[bestComercio]) {
        porComercio[bestComercio] = [];
      }
      porComercio[bestComercio].push({
        ...item,
        precioUnitario: minPrice,
        subtotal
      });
    });

    totalOptimo = Number(totalOptimo.toFixed(2));
    const maxTotal = masCaroMonotienda ? masCaroMonotienda.total : totalOptimo;
    const ahorroMaximo = Number((maxTotal - totalOptimo).toFixed(2));

    return {
      totalesPorComercio,
      ganadorMonotienda,
      masCaroMonotienda,
      ahorroMonotienda,
      cestaOptima: {
        totalOptimo,
        porComercio,
        ahorroMaximo
      }
    };
  }, [carrito, productos, comerciosList]);

  // Lista filtrada y ordenada de productos para el Catálogo & Comparador
  const sortedProductos = useMemo(() => {
    return [...productos].filter(p => {
      const matchesSearch = !busquedaProd || p.nombre.toLowerCase().includes(busquedaProd.toLowerCase()) || p.categoria.toLowerCase().includes(busquedaProd.toLowerCase());
      const matchesCat = !categoriaFiltroProd || p.categoria === categoriaFiltroProd;
      return matchesSearch && matchesCat;
    }).sort((a, b) => {
      let valA, valB;
      if (sortKey === 'nombre' || sortKey === 'categoria' || sortKey === 'unidad_medida') {
        valA = (a[sortKey] || '').toLowerCase();
        valB = (b[sortKey] || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortKey === 'precio_referencia_actual') {
        valA = a.precio_referencia_actual || 0;
        valB = b.precio_referencia_actual || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      } else {
        // Ordenar por precio de un supermercado concreto
        valA = a.preciosPorComercio?.[sortKey];
        valB = b.preciosPorComercio?.[sortKey];
        if (valA === undefined && valB === undefined) return 0;
        if (valA === undefined) return 1; // Poner precios ausentes al final
        if (valB === undefined) return -1;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });
  }, [productos, busquedaProd, categoriaFiltroProd, sortKey, sortOrder]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* CABECERA PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
              Control de Partidas & Consumo
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            Suscripciones, Menús & Cesta de la Compra
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Gestiona tus suscripciones digitales con logotipos oficiales, planifica recetas con ingredientes reales y supervisa el coste por comensal e inflación en supermercados.
          </p>
        </div>

        {/* NAVEGACIÓN ENTRE SUB-MÓDULOS */}
        <div className="flex flex-wrap gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10">
          <button
            onClick={() => setActiveTab('suscripciones')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'suscripciones'
                ? 'bg-white text-slate-900 shadow-md font-extrabold'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Tv className="w-4 h-4 text-rose-500" />
            <span>Suscripciones Digitales</span>
          </button>

          <button
            onClick={() => setActiveTab('menus')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'menus'
                ? 'bg-white text-slate-900 shadow-md font-extrabold'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <ChefHat className="w-4 h-4 text-amber-500" />
            <span>Menús & Recetas</span>
          </button>

          <button
            onClick={() => setActiveTab('catalogo')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'catalogo'
                ? 'bg-white text-slate-900 shadow-md font-extrabold'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Catálogo & Comparador</span>
          </button>

          <button
            onClick={() => setActiveTab('cesta')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeTab === 'cesta'
                ? 'bg-white text-slate-900 shadow-md font-extrabold'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-indigo-400" />
            <span>Carrito de la Compra</span>
            {carrito.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-sm">
                {carrito.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('evolucion')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'evolucion'
                ? 'bg-white text-slate-900 shadow-md font-extrabold'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <span>Evolución Precios</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: SUSCRIPCIONES Y SERVICIOS DIGITALES */}
      {/* ========================================================================= */}
      {activeTab === 'suscripciones' && (
        <div className="space-y-6">
          
          {/* KPIS DE SUSCRIPCIONES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Coste Mensualizado</span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {formatCurrency(subsKpis.costeMensualizadoTotal)}/mes
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Impacto fijo recurrente en presupuesto
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Coste Anual Proyectado</span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(subsKpis.costeAnualTotal)}/año
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Suma de cuotas anuales y mensuales
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Servicios Activos</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {subsKpis.totalActivas} servicios
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {subsKpis.totalPausadas} pausados / en revisión
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Añadir Suscripción</span>
                <p className="text-xs text-slate-400 mt-1">Registra nuevos servicios digitales</p>
              </div>
              <button
                onClick={() => {
                  setEditingSub(null);
                  setSubForm({ nombre: '', categoria_servicio: 'Streaming', coste_recurrente: 9.99, periodicidad: 'mensual', fecha_proxima_renovacion: new Date().toISOString().split('T')[0], estado: 'activo', compartido_con: '', icono: 'Tv', logo_url: '', color: '#6366f1', notas: '' });
                  setIsSubModalOpen(true);
                }}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition-transform active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* LISTADO DE TARJETAS DE SUSCRIPCIONES CON LOGOTIPO REAL */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {suscripciones.map((s) => {
              const costeMes = s.periodicidad === 'anual' ? (s.coste_recurrente / 12) : s.coste_recurrente;
              const isActivo = s.estado === 'activo';

              return (
                <div 
                  key={s.id} 
                  className={`p-5 rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 shadow-sm relative flex flex-col justify-between ${
                    isActivo 
                      ? 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md' 
                      : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50 dark:bg-slate-950'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {/* LOGOTIPO REAL */}
                        <div 
                          className="w-12 h-12 rounded-2xl p-1.5 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden"
                        >
                          {s.logo_url ? (
                            <img 
                              src={s.logo_url} 
                              alt={s.nombre} 
                              className="w-full h-full object-contain"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-full h-full rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                              {s.nombre.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                            {s.nombre}
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {s.categoria_servicio}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleSubState(s)}
                        title={isActivo ? 'Pausar suscripción' : 'Reactivar suscripción'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActivo ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40' : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        }`}
                      >
                        {isActivo ? <CheckCircle2 className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-baseline justify-between">
                        <span className="text-slate-500 font-medium">Coste:</span>
                        <div className="text-right">
                          <span className="font-extrabold text-base text-slate-900 dark:text-white">
                            {formatCurrency(s.coste_recurrente)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold ml-1">/{s.periodicidad}</span>
                        </div>
                      </div>

                      {s.periodicidad === 'anual' && (
                        <div className="flex items-center justify-between text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                          <span>Equivalente:</span>
                          <span>{formatCurrency(costeMes)}/mes</span>
                        </div>
                      )}

                      {s.compartido_con && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center space-x-1"><Users className="w-3 h-3" /> <span>Uso:</span></span>
                          <span className="font-medium truncate max-w-[140px]">{s.compartido_con}</span>
                        </div>
                      )}

                      {s.fecha_proxima_renovacion && (
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center space-x-1"><Calendar className="w-3 h-3" /> <span>Renovación:</span></span>
                          <span className="font-mono">{s.fecha_proxima_renovacion}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-2 flex items-center justify-end space-x-1 border-t border-slate-50 dark:border-slate-800/60">
                    <button
                      onClick={() => {
                        setEditingSub(s);
                        setSubForm({
                          nombre: s.nombre,
                          categoria_servicio: s.categoria_servicio,
                          coste_recurrente: s.coste_recurrente,
                          periodicidad: s.periodicidad,
                          fecha_proxima_renovacion: s.fecha_proxima_renovacion || '',
                          estado: s.estado,
                          compartido_con: s.compartido_con || '',
                          icono: s.icono || 'Tv',
                          logo_url: s.logo_url || '',
                          color: s.color || '#6366f1',
                          notas: s.notas || ''
                        });
                        setIsSubModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSub(s.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: MENÚS CERRADOS, RECETAS & PRODUCTOS CONCRETOS */}
      {/* ========================================================================= */}
      {activeTab === 'menus' && (
        <div className="space-y-6">
          
          {/* INDICADORES DE ALIMENTACIÓN Y COMENSALES */}
          {selectedMenu && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Coste por Persona y Día</span>
                  <span className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600">
                    <Scale className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(computeMenuTotalCost(selectedMenu, comercioFiltroMenu) / (7 * (personas.length || 4)))}/día
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Calculado para {personas.length || 4} comensales del hogar
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase">Coste Semanal del Menú</span>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {formatCurrency(computeMenuTotalCost(selectedMenu, comercioFiltroMenu))}/sem
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Proyección mensual: <strong>{formatCurrency(computeMenuTotalCost(selectedMenu, comercioFiltroMenu) * 4.33)}/mes</strong>
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase">Supermercado Base</span>
                <select
                  value={comercioFiltroMenu}
                  onChange={(e) => setComercioFiltroMenu(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 text-xs font-extrabold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400"
                >
                  <option value="mejor_precio">✨ Mejor Precio (Combinado Óptimo)</option>
                  <option value="Eroski">🛒 Solo Eroski</option>
                  <option value="Mercadona">🛒 Solo Mercadona</option>
                  <option value="Lidl">🛒 Solo Lidl</option>
                  <option value="Carnicería Local">🥩 Solo Comercio Local</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Cambia de supermercado para comparar el coste total
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Comensales Hogar</span>
                  <div className="flex -space-x-1.5 mt-1 overflow-hidden">
                    {personas.map(p => (
                      <span key={p.id} className="inline-block h-6 px-2 rounded-full ring-2 ring-white dark:ring-slate-900 bg-indigo-100 dark:bg-indigo-900/60 text-[10px] font-bold text-indigo-800 dark:text-indigo-200 flex items-center justify-center">
                        {p.nombre}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setIsPersonaModalOpen(true)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* MATRIZ DE PLANIFICACIÓN SEMANAL (LUNES A DOMINGO) */}
          {selectedMenu && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <ChefHat className="w-5 h-5 text-amber-500" />
                    <span>{selectedMenu.nombre}</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Haz clic en cualquier día para editar las recetas y añadir productos concretos de la compra con sus precios.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold">
                    {selectedMenu.temporada_o_tipo}
                  </span>
                  <button
                    onClick={() => handlePasarMenuACarrito(selectedMenu)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                    title="Transferir todos los ingredientes de este menú al Carrito de la Compra para comparar precios"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Pasar al Carrito</span>
                  </button>
                </div>
              </div>

              {/* 7 DÍAS INTERACTIVOS */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3 text-xs">
                {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => {
                  const d = selectedMenu.detalles?.[dia] || { comida: 'Sin definir', cena: 'Sin definir', ingredientesComida: [], ingredientesCena: [] };
                  const costeComida = computeIngredientsCost(d.ingredientesComida || [], comercioFiltroMenu);
                  const costeCena = computeIngredientsCost(d.ingredientesCena || [], comercioFiltroMenu);
                  const costeDia = costeComida + costeCena;

                  return (
                    <div 
                      key={dia} 
                      onClick={() => handleOpenEditDay(dia)}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer flex flex-col justify-between space-y-3 group shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                        <span className="font-black uppercase tracking-wider text-[11px] text-indigo-600 dark:text-indigo-400">
                          {dia}
                        </span>
                        {costeDia > 0 && (
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(costeDia)}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                            <span>🥘 COMIDA</span>
                            {costeComida > 0 && <span className="text-emerald-600 font-semibold">{formatCurrency(costeComida)}</span>}
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs leading-snug mt-0.5">
                            {d.comida || 'Sin planificar'}
                          </p>
                          {d.comidaSegundo && (
                            <p className="font-semibold text-amber-700 dark:text-amber-300 text-[11px] leading-snug mt-0.5 flex items-start space-x-1">
                              <span className="opacity-60 font-black">+</span>
                              <span>{d.comidaSegundo}</span>
                            </p>
                          )}
                          {d.ingredientesComida?.length > 0 && (
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              {d.ingredientesComida.length} producto(s) vinculado(s)
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                            <span>🥗 CENA</span>
                            {costeCena > 0 && <span className="text-emerald-600 font-semibold">{formatCurrency(costeCena)}</span>}
                          </div>
                          <p className="font-bold text-slate-700 dark:text-slate-300 text-xs leading-snug mt-0.5">
                            {d.cena || 'Sin planificar'}
                          </p>
                          {d.cenaSegundo && (
                            <p className="font-semibold text-indigo-700 dark:text-indigo-300 text-[11px] leading-snug mt-0.5 flex items-start space-x-1">
                              <span className="opacity-60 font-black">+</span>
                              <span>{d.cenaSegundo}</span>
                            </p>
                          )}
                          {d.ingredientesCena?.length > 0 && (
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              {d.ingredientesCena.length} producto(s) vinculado(s)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between group-hover:underline">
                        <span>Editar Recetas</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: CATÁLOGO DE PRODUCTOS & COMPARADOR DE SUPERMERCADOS */}
      {/* ========================================================================= */}
      {activeTab === 'catalogo' && (
        <div className="space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Store className="w-5 h-5 text-emerald-600" />
                <span>Catálogo de Productos & Comparador de Supermercados</span>
              </h2>
              <p className="text-xs text-slate-500">
                Haz clic en cualquier columna para ordenar. Mínimo más barato destacado en verde y máximo más caro en rojo.
              </p>
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <button
                onClick={() => setIsAddComercioModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                title="Añadir nuevo supermercado a la comparativa"
              >
                <Plus className="w-4 h-4" />
                <span>+ Supermercado</span>
              </button>

              <button
                onClick={() => setIsPriceModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>Registrar Precio</span>
              </button>

              <button
                onClick={() => setIsProdModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-transform active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Producto</span>
              </button>
            </div>
          </div>

          {/* FILTROS Y BÚSQUEDA DEL CATÁLOGO */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Buscar por nombre de producto..."
                value={busquedaProd}
                onChange={(e) => setBusquedaProd(e.target.value)}
                className="w-full sm:w-72 px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <select
                value={categoriaFiltroProd}
                onChange={(e) => setCategoriaFiltroProd(e.target.value)}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="">Todas las Categorías</option>
                {Array.from(new Set(productos.map(p => p.categoria))).filter(Boolean).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-3 text-xs text-slate-500">
              <span className="font-semibold">{sortedProductos.length} productos listados</span>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Mínimo más barato</span>
                </span>
                <span className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span>Máximo más caro</span>
                </span>
              </div>
            </div>
          </div>

          {/* TABLA COMPARATIVA DE PRODUCTOS POR COMERCIO CON ORDENACIÓN */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-800 select-none">
                  <tr>
                    <th 
                      onClick={() => handleSort('nombre')}
                      className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                      title="Ordenar por Nombre de Producto"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Producto & Categoría</span>
                        {sortKey === 'nombre' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />)}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('unidad_medida')}
                      className="px-3 py-3.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                      title="Ordenar por Unidad"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Unidad</span>
                        {sortKey === 'unidad_medida' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />)}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('precio_referencia_actual')}
                      className="px-3 py-3.5 text-right font-extrabold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                      title="Ordenar por Precio Referencia"
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Precio Ref.</span>
                        {sortKey === 'precio_referencia_actual' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />)}
                      </div>
                    </th>

                    {/* Columnas Dinámicas de Supermercados */}
                    {comerciosList.map(comercio => (
                      <th 
                        key={comercio}
                        onClick={() => handleSort(comercio)}
                        className="px-3 py-3.5 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                        title={`Ordenar por precio en ${comercio}`}
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span>{comercio}</span>
                          {sortKey === comercio && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />)}
                        </div>
                      </th>
                    ))}

                    <th className="px-4 py-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {sortedProductos.length === 0 ? (
                    <tr>
                      <td colSpan={comerciosList.length + 4} className="text-center py-10 text-slate-400 text-xs">
                        No se encontraron productos que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    sortedProductos.map(p => {
                      // Calcular min y max entre comercios disponibles
                      const availablePrices = comerciosList
                        .map(c => p.preciosPorComercio?.[c])
                        .filter(v => typeof v === 'number' && v > 0);
                      
                      const minPrice = availablePrices.length >= 2 ? Math.min(...availablePrices) : null;
                      const maxPrice = availablePrices.length >= 2 ? Math.max(...availablePrices) : null;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-white">{p.nombre}</div>
                            <span className="text-[10px] text-slate-400">{p.categoria}</span>
                          </td>
                          <td className="px-3 py-3 text-center text-slate-500 font-mono">
                            {p.unidad_medida}
                          </td>
                          <td className="px-3 py-3 text-right font-black text-indigo-600 dark:text-indigo-400 text-sm">
                            {formatCurrency(p.precio_referencia_actual)}
                          </td>

                          {/* Precios de cada Supermercado con Resaltado Mínimo / Máximo */}
                          {comerciosList.map(comercio => {
                            const val = p.preciosPorComercio?.[comercio];
                            const isMin = minPrice !== null && val === minPrice;
                            const isMax = maxPrice !== null && val === maxPrice && maxPrice > minPrice;

                            return (
                              <td key={comercio} className="px-3 py-3 text-right whitespace-nowrap">
                                {typeof val === 'number' && val > 0 ? (
                                  <span className={`inline-block px-1.5 py-0.5 rounded-lg text-xs transition-all ${
                                    isMin
                                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-black border border-emerald-300 dark:border-emerald-700 shadow-2xs'
                                      : isMax
                                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800'
                                      : 'text-slate-700 dark:text-slate-300 font-semibold'
                                  }`}>
                                    {formatCurrency(val)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 font-mono">-</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Acciones: Añadir a Cesta + Ver Histórico */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => handleAgregarProductoACarrito(p, 1)}
                                className="px-2.5 py-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                                title="Añadir a la Cesta de la Compra"
                              >
                                <Plus className="w-3 h-3" />
                                <ShoppingCart className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                onClick={() => {
                                  setSelectedProductoGrafica(p.id);
                                  setActiveTab('evolucion');
                                }}
                                className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors font-bold text-[11px]"
                                title="Ver Gráfica Histórica e Inflación"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 4: CARRITO DE LA COMPRA INTELIGENTE & RUTA ÓPTIMA */}
      {/* ========================================================================= */}
      {activeTab === 'cesta' && (
        <div className="space-y-6 animate-fadeIn">
          
          {carrito.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Tu Carrito de la Compra está vacío
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Puedes transferir todos los ingredientes de un menú semanal con un solo clic o añadir artículos directamente desde el catálogo de productos.
              </p>
              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  onClick={() => setActiveTab('menus')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  Ir a Menús & Recetas
                </button>
                <button
                  onClick={() => setActiveTab('catalogo')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  Explorar Catálogo
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* KPIS PRINCIPALES DE LA CESTA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* GANADOR MONOTIENDA */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-5 rounded-3xl text-white shadow-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-100">
                      🏆 Supermercado Más Barato
                    </span>
                    <Award className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <h3 className="text-2xl font-black">{analisisCarrito.ganadorMonotienda?.comercio || 'Eroski'}</h3>
                    <span className="text-lg font-bold text-emerald-100">
                      {formatCurrency(analisisCarrito.ganadorMonotienda?.total || 0)}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100 leading-tight">
                    Ahorro de <strong>{formatCurrency(analisisCarrito.ahorroMonotienda)}</strong> si compras toda la cesta en {analisisCarrito.ganadorMonotienda?.comercio} en lugar de la tienda más cara.
                  </p>
                </div>

                {/* CESTA ÓPTIMA COMBINADA */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-800 p-5 rounded-3xl text-white shadow-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-200">
                      ⚡ Cesta Óptima Multitienda
                    </span>
                    <Sparkles className="w-5 h-5 text-indigo-200" />
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <h3 className="text-2xl font-black">
                      {formatCurrency(analisisCarrito.cestaOptima.totalOptimo)}
                    </h3>
                    <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                      Mejor Precio Absoluto
                    </span>
                  </div>
                  <p className="text-xs text-indigo-100 leading-tight">
                    Ahorro máximo de <strong>{formatCurrency(analisisCarrito.cestaOptima.ahorroMaximo)}</strong> comprando cada producto en su supermercado más barato.
                  </p>
                </div>

                {/* ACCIONES Y RESUMEN */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Artículos en Cesta</span>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{carrito.length}</span>
                      <span className="text-xs text-slate-400 font-semibold">
                        ({carrito.filter(i => i.comprado).length} marcados como comprados)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-3">
                    <button
                      onClick={() => handleCopiarLista(analisisCarrito.cestaOptima)}
                      className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                      title="Copiar lista organizada con precios para WhatsApp"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Lista</span>
                    </button>
                    <button
                      onClick={handleVaciarCarrito}
                      className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
                      title="Vaciar toda la cesta de la compra"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>

              {/* COMPARATIVA DE PRECIOS POR SUPERMERCADO */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                      <Store className="w-5 h-5 text-indigo-600" />
                      <span>Comparativa de Coste de la Cesta por Supermercado</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Importe total que pagarías si realizas toda la compra en un único establecimiento.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {Object.values(analisisCarrito.totalesPorComercio).sort((a, b) => a.total - b.total).map((item, idx) => {
                    const isWinner = idx === 0;
                    const isMasCaro = idx === Object.keys(analisisCarrito.totalesPorComercio).length - 1;

                    return (
                      <div 
                        key={item.comercio}
                        className={`p-3.5 rounded-2xl border text-center space-y-1 transition-all ${
                          isWinner 
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 shadow-sm ring-1 ring-emerald-500/20' 
                            : isMasCaro
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase text-slate-500 block truncate">
                          {item.comercio}
                        </span>
                        <div className="text-base font-black text-slate-900 dark:text-white">
                          {formatCurrency(item.total)}
                        </div>
                        {isWinner && (
                          <span className="inline-block text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-2xs">
                            🏆 Más Barato
                          </span>
                        )}
                        {isMasCaro && (
                          <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                            🔴 Más Caro
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RUTA ÓPTIMA: «DÓNDE COMPRAR CADA COSA» */}
              <div className="bg-indigo-50/40 dark:bg-indigo-950/20 p-6 rounded-3xl border border-indigo-200 dark:border-indigo-800/60 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/40 pb-3">
                  <div>
                    <h3 className="text-base font-black text-indigo-950 dark:text-indigo-200 flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <span>Dónde Comprar Cada Cosa para Máximo Ahorro</span>
                    </h3>
                    <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80">
                      Ruta inteligente de compra con el mejor precio disponible para cada artículo de tu lista.
                    </p>
                  </div>
                  <span className="text-xs font-black px-3 py-1 bg-indigo-600 text-white rounded-xl shadow-xs self-start sm:self-auto">
                    Total Óptimo: {formatCurrency(analisisCarrito.cestaOptima.totalOptimo)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(analisisCarrito.cestaOptima.porComercio).map(([comercio, items]) => {
                    const subtotalComercio = items.reduce((acc, it) => acc + it.subtotal, 0);

                    return (
                      <div key={comercio} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase flex items-center space-x-1.5">
                            <span>🏪 {comercio}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {items.length}
                            </span>
                          </span>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(subtotalComercio)}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          {items.map(it => (
                            <div key={it.id} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                              <span className="truncate pr-2 font-medium">
                                • {it.nombre} <span className="text-[10px] text-slate-400">({it.cantidad} {it.unidad_medida})</span>
                              </span>
                              <span className="font-bold whitespace-nowrap text-slate-900 dark:text-white">
                                {formatCurrency(it.subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LISTA / CHECKLIST INTERACTIVO DE LA COMPRA */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                      <CheckSquare className="w-5 h-5 text-emerald-600" />
                      <span>Checklist de Artículos del Carrito</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Marca lo que ya has comprado en tienda y ajusta cantidades con facilidad.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {carrito.map(item => {
                    const prod = productos.find(p => p.id === item.producto_id);
                    const precioRef = prod?.precio_referencia_actual || 1.0;
                    const subtotal = Number((precioRef * (item.cantidad || 1)).toFixed(2));

                    return (
                      <div 
                        key={item.id} 
                        className={`p-4 flex items-center justify-between transition-colors ${
                          item.comprado ? 'bg-slate-50/80 dark:bg-slate-800/20 opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => handleToggleComprado(item.id)}
                            className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                          >
                            {item.comprado ? (
                              <CheckSquare className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>

                          <div>
                            <span className={`font-bold text-xs ${item.comprado ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                              {item.nombre}
                            </span>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                              <span>{item.categoria}</span>
                              <span>•</span>
                              <span>Ref: {formatCurrency(precioRef)}/{item.unidad_medida}</span>
                            </div>
                          </div>
                        </div>

                        {/* CONTROLES DE CANTIDAD Y SUBTOTAL */}
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => handleUpdateCantidadCarrito(item.id, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                              {item.cantidad} {item.unidad_medida}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCantidadCarrito(item.id, 1)}
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <span className="text-xs font-black text-slate-900 dark:text-white w-16 text-right font-mono">
                            {formatCurrency(subtotal)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleEliminarItemCarrito(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Quitar artículo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 4: EVOLUCIÓN HISTÓRICA DE PRECIOS E INFLACIÓN */}
      {/* ========================================================================= */}
      {activeTab === 'evolucion' && (
        <div className="space-y-6">
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span>Evolución de Costes e Inflación de Productos</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Comprueba cómo ha variado el precio de cada producto a lo largo del tiempo en los distintos comercios.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <label className="text-xs font-bold text-slate-500">Filtrar Producto:</label>
                <select
                  value={selectedProductoGrafica}
                  onChange={(e) => setSelectedProductoGrafica(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">Todos los Productos (Comparativa General)</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.categoria})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* GRÁFICA DE RECHARTS */}
            <div className="h-80 w-full pt-4">
              {historicoPrecios.timeline?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicoPrecios.timeline}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} unit="€" />
                    <Tooltip 
                      formatter={(val) => [formatCurrency(val), 'Precio']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="Eroski" stroke="#ec0000" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                    <Line type="monotone" dataKey="Mercadona" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                    <Line type="monotone" dataKey="Lidl" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                    <Line type="monotone" dataKey="Carnicería Local" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                    <Line type="monotone" dataKey="Frutería Local" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                  No hay suficientes registros históricos para este producto todavía.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL EDITAR DÍA / RECETAS CON PRODUCTOS CONCRETOS */}
      {/* ========================================================================= */}
      {isEditDayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Planificación Diaria
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white capitalize">
                  Editar Recetas del {editingDayKey}
                </h3>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-semibold">Coste Total del Día</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(computeIngredientsCost(editingDayData.ingredientesComida) + computeIngredientsCost(editingDayData.ingredientesCena))}
                </span>
              </div>
            </div>

            {/* SECCIÓN COMIDA */}
            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center space-x-1.5">
                  <span>🥘 Comida del Mediodía</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleAddIngredient('comida')}
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Producto</span>
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300 block mb-1">
                    1er Plato
                  </label>
                  <input
                    type="text"
                    placeholder="Primer plato (Ej: Lentejas caseras con verdura, Ensalada de pasta...)"
                    value={editingDayData.comida}
                    onChange={(e) => setEditingDayData({ ...editingDayData, comida: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300 block mb-1">
                    2º Plato / Acompañamiento / Postre
                  </label>
                  <input
                    type="text"
                    placeholder="Segundo plato opcional (Ej: Filete de ternera, Pescado a la plancha, Fruta...)"
                    value={editingDayData.comidaSegundo || ''}
                    onChange={(e) => setEditingDayData({ ...editingDayData, comidaSegundo: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* LISTA DE INGREDIENTES COMIDA */}
              {editingDayData.ingredientesComida?.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Ingredientes & Cantidades:</span>
                  {editingDayData.ingredientesComida.map((item, idx) => {
                    const unitP = getProductPrice(item.producto_id);
                    const subtotal = unitP * (Number(item.cantidad) || 0);

                    return (
                      <div key={idx} className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <select
                          value={item.producto_id}
                          onChange={(e) => handleUpdateIngredient('comida', idx, 'producto_id', e.target.value)}
                          className="flex-1 px-2 py-1 text-xs font-bold rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                          {productos.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} ({formatCurrency(getProductPrice(p.id))}/{p.unidad_medida})</option>
                          ))}
                        </select>

                        <div className="flex items-center space-x-1 w-28">
                          <input
                            type="number"
                            step="0.1"
                            min="0.05"
                            value={item.cantidad}
                            onChange={(e) => handleUpdateIngredient('comida', idx, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-xs font-bold rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-right"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">{item.unidad}</span>
                        </div>

                        <span className="w-16 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(subtotal)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient('comida', idx)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECCIÓN CENA */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center space-x-1.5">
                  <span>🥗 Cena de la Noche</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleAddIngredient('cena')}
                  className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Producto</span>
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-indigo-800 dark:text-indigo-300 block mb-1">
                    1er Plato
                  </label>
                  <input
                    type="text"
                    placeholder="Primer plato de cena (Ej: Crema de verduras, Sopa...)"
                    value={editingDayData.cena}
                    onChange={(e) => setEditingDayData({ ...editingDayData, cena: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-indigo-800 dark:text-indigo-300 block mb-1">
                    2º Plato / Acompañamiento / Postre
                  </label>
                  <input
                    type="text"
                    placeholder="Segundo plato de cena opcional (Ej: Pechuga de pollo a la plancha, Tortilla francesa...)"
                    value={editingDayData.cenaSegundo || ''}
                    onChange={(e) => setEditingDayData({ ...editingDayData, cenaSegundo: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* LISTA DE INGREDIENTES CENA */}
              {editingDayData.ingredientesCena?.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Ingredientes & Cantidades:</span>
                  {editingDayData.ingredientesCena.map((item, idx) => {
                    const unitP = getProductPrice(item.producto_id);
                    const subtotal = unitP * (Number(item.cantidad) || 0);

                    return (
                      <div key={idx} className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <select
                          value={item.producto_id}
                          onChange={(e) => handleUpdateIngredient('cena', idx, 'producto_id', e.target.value)}
                          className="flex-1 px-2 py-1 text-xs font-bold rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                          {productos.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} ({formatCurrency(getProductPrice(p.id))}/{p.unidad_medida})</option>
                          ))}
                        </select>

                        <div className="flex items-center space-x-1 w-28">
                          <input
                            type="number"
                            step="0.1"
                            min="0.05"
                            value={item.cantidad}
                            onChange={(e) => handleUpdateIngredient('cena', idx, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-xs font-bold rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-right"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">{item.unidad}</span>
                        </div>

                        <span className="w-16 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(subtotal)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient('cena', idx)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditDayModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveDayToMenu}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md shadow-amber-600/30 text-xs"
              >
                Guardar Recetas del Día
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SUSCRIPCIÓN CON SELECTOR DE LOGOTIPO REAL */}
      {/* ========================================================================= */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingSub ? 'Editar Suscripción' : 'Nueva Suscripción o Servicio'}
            </h3>

            <form onSubmit={handleSaveSub} className="space-y-4 text-xs">
              
              {/* SELECTOR RÁPIDO DE LOGOTIPO OFICIAL */}
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Seleccionar Logotipo Oficial
                </label>
                <div className="grid grid-cols-6 gap-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  {LOGOS_PREDEFINIDOS.map((logo, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSubForm({
                          ...subForm,
                          nombre: subForm.nombre || logo.nombre,
                          logo_url: logo.url,
                          color: logo.color
                        });
                      }}
                      className={`h-11 rounded-xl flex items-center justify-center p-1.5 border transition-all ${
                        subForm.logo_url === logo.url
                          ? 'border-indigo-600 bg-white dark:bg-slate-900 ring-2 ring-indigo-500/30 shadow-sm'
                          : 'border-transparent hover:bg-white/60 dark:hover:bg-slate-700'
                      }`}
                      title={logo.nombre}
                    >
                      <img src={logo.url} alt={logo.nombre} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Nombre del Servicio</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Netflix, Coursera, ChatGPT..."
                  value={subForm.nombre}
                  onChange={(e) => setSubForm({ ...subForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Ruta del Logo o URL</label>
                <input
                  type="text"
                  placeholder="/logos/netflix.svg o https://..."
                  value={subForm.logo_url}
                  onChange={(e) => setSubForm({ ...subForm, logo_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Categoría</label>
                  <select
                    value={subForm.categoria_servicio}
                    onChange={(e) => setSubForm({ ...subForm, categoria_servicio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Streaming">Streaming Cine/Música</option>
                    <option value="Formación">Formación & Cursos</option>
                    <option value="Cloud / IA">Cloud & IA</option>
                    <option value="Software / Trabajo">Software & Trabajo</option>
                    <option value="Gimnasio / Ocio">Gimnasio / Ocio</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Periodicidad</label>
                  <select
                    value={subForm.periodicidad}
                    onChange={(e) => setSubForm({ ...subForm, periodicidad: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="mensual">Mensual</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Coste Recurrente (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={subForm.coste_recurrente}
                    onChange={(e) => setSubForm({ ...subForm, coste_recurrente: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold text-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Próxima Renovación</label>
                  <input
                    type="date"
                    value={subForm.fecha_proxima_renovacion}
                    onChange={(e) => setSubForm({ ...subForm, fecha_proxima_renovacion: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Compartido con / Usuarios</label>
                <input
                  type="text"
                  placeholder="Ej: Familia (4 perfiles), Julio..."
                  value={subForm.compartido_con}
                  onChange={(e) => setSubForm({ ...subForm, compartido_con: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30"
                >
                  Guardar Suscripción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL NUEVO PRODUCTO */}
      {/* ========================================================================= */}
      {isProdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Nuevo Producto de Alimentación</h3>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Salmón Fresco, Leche Entera, Aceite..."
                  value={prodForm.nombre}
                  onChange={(e) => setProdForm({ ...prodForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Categoría</label>
                  <select
                    value={prodForm.categoria}
                    onChange={(e) => setProdForm({ ...prodForm, categoria: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Lácteos y Huevos">Lácteos y Huevos</option>
                    <option value="Carnicería">Carnicería</option>
                    <option value="Pescadería">Pescadería</option>
                    <option value="Frutería y Verdura">Frutería y Verdura</option>
                    <option value="Despensa y Básicos">Despensa y Básicos</option>
                    <option value="Panadería">Panadería</option>
                    <option value="Bebidas">Bebidas</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Unidad</label>
                  <select
                    value={prodForm.unidad_medida}
                    onChange={(e) => setProdForm({ ...prodForm, unidad_medida: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="unidad">unidad</option>
                    <option value="docena">docena</option>
                    <option value="pack">pack</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Precio Referencia (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodForm.precio_referencia_actual}
                    onChange={(e) => setProdForm({ ...prodForm, precio_referencia_actual: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Comercio Habitual</label>
                  <input
                    type="text"
                    placeholder="Ej: Eroski, Mercadona, Lidl..."
                    value={prodForm.comercio_habitual}
                    onChange={(e) => setProdForm({ ...prodForm, comercio_habitual: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProdModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30"
                >
                  Crear Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL REGISTRAR PRECIO */}
      {/* ========================================================================= */}
      {isPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Registrar Precio en Comercio</h3>

            <form onSubmit={handleSavePrice} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Seleccionar Producto</label>
                <select
                  required
                  value={priceForm.producto_id}
                  onChange={(e) => setPriceForm({ ...priceForm, producto_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                >
                  <option value="">-- Elige un producto --</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.unidad_medida})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Comercio / Tienda</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Eroski, Mercadona, Lidl..."
                    value={priceForm.comercio}
                    onChange={(e) => setPriceForm({ ...priceForm, comercio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Precio Observado (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={priceForm.precio}
                    onChange={(e) => setPriceForm({ ...priceForm, precio: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Fecha Observación</label>
                <input
                  type="date"
                  value={priceForm.fecha_registro}
                  onChange={(e) => setPriceForm({ ...priceForm, fecha_registro: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30"
                >
                  Guardar Precio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PERSONA HOGAR */}
      {/* ========================================================================= */}
      {isPersonaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Añadir Persona del Hogar</h3>

            <form onSubmit={handleSavePersona} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Julio, Yolanda, Amaia..."
                  value={personaForm.nombre}
                  onChange={(e) => setPersonaForm({ ...personaForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Rol</label>
                  <select
                    value={personaForm.rol}
                    onChange={(e) => setPersonaForm({ ...personaForm, rol: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Adulto">Adulto</option>
                    <option value="Hija/Hijo">Hija / Hijo</option>
                    <option value="Invitado">Invitado recurrente</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Factor Consumo</label>
                  <input
                    type="number"
                    step="0.05"
                    value={personaForm.factor_consumo}
                    onChange={(e) => setPersonaForm({ ...personaForm, factor_consumo: parseFloat(e.target.value) || 1.0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPersonaModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30"
                >
                  Añadir Persona
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL AÑADIR SUPERMERCADO */}
      {/* ========================================================================= */}
      {isAddComercioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <Store className="w-5 h-5 text-indigo-600" />
                <span>Añadir Supermercado</span>
              </h3>
              <button
                onClick={() => setIsAddComercioModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddComercio} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del Supermercado / Tienda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: BM, DIA, ALDI, Carrefour, Alcampo..."
                  value={newComercioName}
                  onChange={(e) => setNewComercioName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Se añadirá una nueva columna en el comparador de precios y en el análisis del carrito.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddComercioModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  Añadir Supermercado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
