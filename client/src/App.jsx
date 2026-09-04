import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import QuickTransactionModal from './components/QuickTransactionModal';
import ImportModal from './components/ImportModal';
import UsersManagerModal from './components/UsersManagerModal';
import AccountsManagerModal from './components/AccountsManagerModal';
import BackupManagerModal from './components/BackupManagerModal';
import DashboardView from './views/DashboardView';
import TransactionsView from './views/TransactionsView';
import ProjectsView from './views/ProjectsView';
import SimulatorView from './views/SimulatorView';
import BudgetsAndFoodView from './views/BudgetsAndFoodView';
import AccountsView from './views/AccountsView';
import ErrorBoundary from './components/ErrorBoundary';
import { api, getGlobalUser, setGlobalUser } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [currentUser, setCurrentUser] = useState(null);
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

  // Cargar usuario actual y catálogos globales
  const loadGlobalCatalogs = async () => {
    try {
      const [usersList, cRes, catRes] = await Promise.all([
        api.getUsuarios().catch(() => []),
        api.getCuentas().catch(() => []),
        api.getCategorias().catch(() => [])
      ]);

      const activeId = getGlobalUser();
      const current = usersList.find(u => u.id === activeId) || usersList[0] || null;
      if (current && (!activeId || current.id !== activeId)) {
        setGlobalUser(current.id);
      }
      setCurrentUser(current);
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

  const handleUserSwitched = (user) => {
    setCurrentUser(user);
    handleDataChanged();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Barra de Navegación Superior */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        currentUser={currentUser}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenAccountsManager={() => setIsAccountsModalOpen(true)}
        onOpenUsersManager={() => setIsUsersModalOpen(true)}
        onOpenBackupManager={() => setIsBackupModalOpen(true)}
      />

      {/* Contenido Principal de la SPA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <ErrorBoundary>
          {currentTab === 'dashboard' && (
            <DashboardView 
              key={`dash-${refreshTrigger}`}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)} 
              onOpenImport={() => setIsImportOpen(true)}
              onOpenAccountsManager={() => setIsAccountsModalOpen(true)}
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
        </ErrorBoundary>
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

      {/* Modal de Gestión de Usuarios / Entornos de Gestión */}
      <UsersManagerModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        onUserSwitched={handleUserSwitched}
      />

      {/* Modal de Gestión de Cuentas Bancarias y Calibración de Saldos */}
      <AccountsManagerModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        onAccountsUpdated={handleDataChanged}
      />

      {/* Modal de Copias de Seguridad (Backup & Restore) */}
      <BackupManagerModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onDataRestored={handleDataChanged}
      />

      {/* Pie de Página */}
      <footer className="mt-auto py-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
        <p>Finanzas Personales & Tesorería Familiar — Persistencia local SQLite en <code>/data/finanzas.db</code></p>
      </footer>

    </div>
  );
}
