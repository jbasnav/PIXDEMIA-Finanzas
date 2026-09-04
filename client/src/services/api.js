const API_BASE = '/api';

let activeUserId = localStorage.getItem('pixdemia_usuario_id') || 1;

export const setGlobalUser = (id) => {
  activeUserId = id;
  localStorage.setItem('pixdemia_usuario_id', id);
};

export const getGlobalUser = () => activeUserId;

const getHeaders = (extra = {}) => ({
  'Content-Type': 'application/json',
  'x-usuario-id': String(activeUserId),
  ...extra
});

export const api = {
  // Usuarios & Espacios de Gestión
  async getUsuarios() {
    const res = await fetch(`${API_BASE}/usuarios`);
    if (!res.ok) throw new Error('Error al cargar usuarios');
    return res.json();
  },

  async createUsuario(data) {
    const res = await fetch(`${API_BASE}/usuarios`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al crear usuario');
    }
    return res.json();
  },

  async updateUsuario(id, data) {
    const res = await fetch(`${API_BASE}/usuarios/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al actualizar usuario');
    }
    return res.json();
  },

  async deleteUsuario(id) {
    const res = await fetch(`${API_BASE}/usuarios/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al eliminar usuario');
    }
    return res.json();
  },

  // Analytics & Dashboard
  async getDashboard(year = 2026, month = null) {
    const params = new URLSearchParams({ year, usuario_id: activeUserId });
    if (month) params.append('month', month);
    const res = await fetch(`${API_BASE}/analytics/dashboard?${params}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al cargar dashboard');
    return res.json();
  },

  async getPresupuestos(year = 2026, month = null) {
    const params = new URLSearchParams({ year, usuario_id: activeUserId });
    if (month) params.append('month', month);
    const res = await fetch(`${API_BASE}/analytics/presupuestos?${params}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al cargar presupuestos');
    return res.json();
  },

  async savePresupuesto(data) {
    const res = await fetch(`${API_BASE}/analytics/presupuestos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...data, usuario_id: activeUserId })
    });
    if (!res.ok) throw new Error('Error al guardar presupuesto');
    return res.json();
  },

  // Cuentas
  async getCuentas() {
    const res = await fetch(`${API_BASE}/cuentas?usuario_id=${activeUserId}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al cargar cuentas');
    return res.json();
  },

  async createCuenta(data) {
    const res = await fetch(`${API_BASE}/cuentas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...data, usuario_id: activeUserId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al crear cuenta');
    }
    return res.json();
  },

  async updateCuenta(id, data) {
    const res = await fetch(`${API_BASE}/cuentas/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al actualizar cuenta');
    }
    return res.json();
  },

  async deleteCuenta(id, force = false) {
    const res = await fetch(`${API_BASE}/cuentas/${id}?force=${force ? 'true' : 'false'}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al eliminar cuenta');
    }
    return res.json();
  },

  // Categorías
  async getCategorias() {
    const res = await fetch(`${API_BASE}/categorias`);
    if (!res.ok) throw new Error('Error al cargar categorías');
    return res.json();
  },

  async getTiendasHabituales() {
    const res = await fetch(`${API_BASE}/categorias/tiendas-habituales`);
    if (!res.ok) throw new Error('Error al cargar tiendas');
    return res.json();
  },

  // Movimientos
  async getMovimientos(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, val);
      }
    });
    const res = await fetch(`${API_BASE}/movimientos?${params}`);
    if (!res.ok) throw new Error('Error al cargar movimientos');
    return res.json();
  },

  async createMovimiento(data) {
    const res = await fetch(`${API_BASE}/movimientos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al crear movimiento');
    }
    return res.json();
  },

  async updateMovimiento(id, data) {
    const res = await fetch(`${API_BASE}/movimientos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al actualizar movimiento');
    return res.json();
  },

  async toggleConsolidado(id) {
    const res = await fetch(`${API_BASE}/movimientos/${id}/toggle-consolidado`, {
      method: 'PATCH'
    });
    if (!res.ok) throw new Error('Error al cambiar estado de consolidación');
    return res.json();
  },

  async deleteMovimiento(id) {
    const res = await fetch(`${API_BASE}/movimientos/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar movimiento');
    return res.json();
  },

  async getProyectosResumen() {
    const res = await fetch(`${API_BASE}/movimientos/proyectos-resumen`);
    if (!res.ok) throw new Error('Error al cargar proyectos');
    return res.json();
  },

  // Pasivos y Préstamos
  async getPasivos() {
    const res = await fetch(`${API_BASE}/pasivos`);
    if (!res.ok) throw new Error('Error al cargar pasivos');
    return res.json();
  },

  async createPasivo(data) {
    const res = await fetch(`${API_BASE}/pasivos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al crear pasivo');
    }
    return res.json();
  },

  async updatePasivo(id, data) {
    const res = await fetch(`${API_BASE}/pasivos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al actualizar pasivo');
    }
    return res.json();
  },

  async deletePasivo(id) {
    const res = await fetch(`${API_BASE}/pasivos/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar pasivo');
    return res.json();
  },

  async simularEscenarioPasivo(data) {
    const res = await fetch(`${API_BASE}/pasivos/simular-escenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al simular escenario');
    return res.json();
  },

  async simularNuevoCredito(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    });
    const res = await fetch(`${API_BASE}/pasivos/simulador-nuevo-credito?${query.toString()}`);
    if (!res.ok) throw new Error('Error al calcular simulación de nuevo crédito');
    return res.json();
  },

  async simularFurgoneta(params = {}) {
    return this.simularNuevoCredito(params);
  },

  async consultarEuriborHistorico(params = {}) {
    const query = new URLSearchParams(params);
    const res = await fetch(`${API_BASE}/pasivos/consultar-euribor-historico?${query}`);
    if (!res.ok) throw new Error('Error al consultar Euríbor histórico');
    return res.json();
  },

  async getCuadroVida(id) {
    const res = await fetch(`${API_BASE}/pasivos/${id}/cuadro-vida`);
    if (!res.ok) throw new Error('Error al cargar cuadro de amortización');
    return res.json();
  },

  // Suscripciones y Servicios Digitales
  async getSuscripciones() {
    const res = await fetch(`${API_BASE}/suscripciones`);
    if (!res.ok) throw new Error('Error al cargar suscripciones');
    return res.json();
  },

  async createSuscripcion(data) {
    const res = await fetch(`${API_BASE}/suscripciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al crear suscripción');
    return res.json();
  },

  async updateSuscripcion(id, data) {
    const res = await fetch(`${API_BASE}/suscripciones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al actualizar suscripción');
    return res.json();
  },

  async deleteSuscripcion(id) {
    const res = await fetch(`${API_BASE}/suscripciones/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar suscripción');
    return res.json();
  },

  // Alimentación, Menús y Precios
  async getAlimentacionDashboard() {
    const res = await fetch(`${API_BASE}/alimentacion/dashboard`);
    if (!res.ok) throw new Error('Error al cargar datos de alimentación');
    return res.json();
  },

  async getProductosAlimentacion() {
    const res = await fetch(`${API_BASE}/alimentacion/productos`);
    if (!res.ok) throw new Error('Error al cargar productos de alimentación');
    return res.json();
  },

  async createProductoAlimentacion(data) {
    const res = await fetch(`${API_BASE}/alimentacion/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al crear producto');
    return res.json();
  },

  async registrarPrecioComercio(data) {
    const res = await fetch(`${API_BASE}/alimentacion/precios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al registrar precio');
    return res.json();
  },

  async getHistoricoPrecios(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const res = await fetch(`${API_BASE}/alimentacion/historico-precios?${query.toString()}`);
    if (!res.ok) throw new Error('Error al cargar histórico de precios');
    return res.json();
  },

  async getMenusPlanificados() {
    const res = await fetch(`${API_BASE}/alimentacion/menus`);
    if (!res.ok) throw new Error('Error al cargar menús planificados');
    return res.json();
  },

  async createMenuPlanificado(data) {
    const res = await fetch(`${API_BASE}/alimentacion/menus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al crear menú');
    return res.json();
  },

  async updateMenuPlanificado(id, data) {
    const res = await fetch(`${API_BASE}/alimentacion/menus/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al actualizar menú');
    return res.json();
  },

  async getPersonasHogar() {
    const res = await fetch(`${API_BASE}/alimentacion/personas`);
    if (!res.ok) throw new Error('Error al cargar personas del hogar');
    return res.json();
  },

  async createPersonaHogar(data) {
    const res = await fetch(`${API_BASE}/alimentacion/personas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al agregar persona');
    return res.json();
  },

  // Importación de Excel
  async uploadExcel(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/import-excel`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al importar archivo Excel');
    }
    return res.json();
  },

  // Copias de Seguridad y Restauración (Backups)
  async exportBackup() {
    const res = await fetch(`${API_BASE}/backup/export`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al exportar copia de seguridad');
    return res.json();
  },

  async restoreBackup(backupData) {
    const res = await fetch(`${API_BASE}/backup/restore`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backupData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al restaurar copia de seguridad');
    }
    return res.json();
  },

  async getBackupSnapshots() {
    const res = await fetch(`${API_BASE}/backup/snapshots`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al obtener instantáneas');
    return res.json();
  },

  async createBackupSnapshot() {
    const res = await fetch(`${API_BASE}/backup/create-snapshot`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al crear instantánea');
    return res.json();
  },

  async restoreBackupSnapshot(filename) {
    const res = await fetch(`${API_BASE}/backup/restore-snapshot`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al restaurar instantánea');
    }
    return res.json();
  }
};
