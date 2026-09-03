import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import QuickTransactionModal from './components/QuickTransactionModal';
import ImportModal from './components/ImportModal';
import DashboardView from './views/DashboardView';
import TransactionsView from './views/TransactionsView';
import ProjectsView from './views/ProjectsView';
import SimulatorView from './views/SimulatorView';
import BudgetsAndFoodView from './views/BudgetsAndFoodView';
import AccountsView from './views/AccountsView';
import { api } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [cuentas, setCuentas] = useState([]);
  const [categorias, setCategorias] = useState([]);

  // Sincronizar clase dark en el html
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Cargar catálogos globales
  const loadGlobalCatalogs = async () => {
    try {
      const [cRes, catRes] = await Promise.all([
        api.getCuentas(),
        api.getCategorias()
      ]);
      setCuentas(cRes);
      setCategorias(catRes);
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  };

  useEffect(() => {
    loadGlobalCatalogs();
  }, [refreshTrigger]);

  const handleDataChanged = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Barra de Navegación Superior */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
      />

      {/* Contenido Principal de la SPA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentTab === 'dashboard' && (
          <DashboardView 
            key={`dash-${refreshTrigger}`}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)} 
            onOpenImport={() => setIsImportOpen(true)} 
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsView 
            key={`trans-${refreshTrigger}`}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            onOpenImport={() => setIsImportOpen(true)}
            refreshTrigger={refreshTrigger}
          />
        )}

        {currentTab === 'projects' && (
          <ProjectsView 
            key={`proj-${refreshTrigger}`}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)} 
          />
        )}

        {currentTab === 'simulator' && (
          <SimulatorView key={`sim-${refreshTrigger}`} />
        )}

        {currentTab === 'budgets_food' && (
          <BudgetsAndFoodView key={`bf-${refreshTrigger}`} />
        )}

        {currentTab === 'accounts' && (
          <AccountsView 
            key={`acc-${refreshTrigger}`}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)} 
          />
        )}
      </main>

      {/* Modal de Registro Rápido de Movimientos */}
      <QuickTransactionModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onTransactionCreated={handleDataChanged}
        cuentas={cuentas}
        categorias={categorias}
      />

      {/* Modal de Importación Excel */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleDataChanged}
      />

      {/* Pie de Página */}
      <footer className="mt-auto py-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
        <p>Finanzas Personales & Tesorería Familiar — Persistencia local SQLite en <code>/data/finanzas.db</code></p>
      </footer>

    </div>
  );
}
