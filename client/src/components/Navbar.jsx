import React from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  FolderKanban, 
  Calculator, 
  WalletCards, 
  Landmark, 
  FileSpreadsheet, 
  Plus, 
  Moon, 
  Sun,
  ShieldCheck,
  Users,
  ChevronDown,
  Database
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  darkMode, 
  setDarkMode, 
  onOpenQuickAdd, 
  onOpenImport,
  onOpenAccountsManager,
  onOpenUsersManager,
  onOpenBackupManager,
  currentUser
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Movimientos', icon: ReceiptText },
    { id: 'projects', label: 'Proyectos & Obras', icon: FolderKanban },
    { id: 'simulator', label: 'Simulador Pasivos', icon: Calculator },
    { id: 'budgets_food', label: 'Partidas & Menús', icon: WalletCards },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Título */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-slate-900 via-brand-800 to-emerald-600 dark:from-white dark:via-emerald-400 dark:to-brand-300 bg-clip-text text-transparent">
                Finanzas & Tesorería
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
                2026
              </span>
            </div>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-400 font-bold shadow-xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Botones de Acción */}
          <div className="flex items-center space-x-2">
            
            {/* Selector de Gestión / Usuario Activo */}
            <button
              onClick={onOpenUsersManager}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Cambiar de gestión / usuario"
            >
              <div 
                className="w-5 h-5 rounded-lg flex items-center justify-center text-white text-[10px] font-black"
                style={{ backgroundColor: currentUser?.color_hex || '#4f46e5' }}
              >
                <Users className="w-3 h-3" />
              </div>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                {currentUser?.nombre || 'Familia'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Botón Gestión de Cuentas */}
            <button
              onClick={onOpenAccountsManager}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
              title="Administrar cuentas y calibrar saldos"
            >
              <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Cuentas</span>
            </button>

            {/* Botón Copias de Seguridad */}
            <button
              onClick={onOpenBackupManager}
              className="hidden xl:flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
              title="Copias de Seguridad (Backup & Restore)"
            >
              <Database className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>Backup</span>
            </button>

            {/* Botón Importar Excel */}
            <button
              onClick={onOpenImport}
              className="hidden xl:flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
              title="Importar libro Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Importar Excel</span>
            </button>

            {/* Botón Registro Rápido */}
            <button
              onClick={onOpenQuickAdd}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 rounded-xl shadow-md shadow-brand-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Movimiento</span>
            </button>

            {/* Toggle Modo Oscuro */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Alternar tema"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

          </div>
        </div>

        {/* Navegación Mobile inferior / tabs */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-slate-200 dark:border-slate-800">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-brand-500 text-white font-semibold shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
