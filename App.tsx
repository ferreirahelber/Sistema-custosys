import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { SettingsForm } from './components/SettingsForm';
import { IngredientForm } from './components/IngredientForm';
import { RecipeList } from './components/RecipeList';
import { RecipeForm } from './components/RecipeForm';
import { CostingView } from './components/CostingView';
import { Dashboard } from './components/Dashboard';
import { SettingsService } from './services/settingsService';
import { ResaleCalculator } from './components/ResaleCalculator';
import { SalesView } from './components/SalesView';
import { ExpensesView } from './components/ExpensesView';
import { PricingSimulator } from './components/PricingSimulator';
import { PosView } from './components/PosView';
import { CashHistory } from './components/CashHistory';
import { PosReports } from './components/PosReports';
import { PackagingView } from './components/PackagingView';
import { ResaleProductsView } from './components/ResaleProductsView';
import { supabase } from './services/supabase'; // Importante para checar a role
import {
  Settings as SettingsIcon,
  ChefHat,
  Package,
  Box,
  LayoutDashboard,
  DollarSign,
  Loader2,
  LucideIcon,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Tags,
  History,
  Store,
  PieChart,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { Toaster } from 'sonner';
import './index.css';

export function AppContent() {
  const { session, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Estados de Configuração
  const [isConfigured, setIsConfigured] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(true);
  
  // Estados de Permissão (Novo)
  const [userRole, setUserRole] = useState<'admin' | 'cashier' | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // 1. Verifica Configurações e Role do Usuário
  useEffect(() => {
    const initApp = async () => {
      if (session?.user?.id) {
        try {
          // A. Verifica Configuração (Mantido do seu código)
          const settings = await SettingsService.get();
          if (settings.labor_monthly_cost > 0) {
            setIsConfigured(true);
          }

          // B. Busca Role do Usuário (Novo)
          const { data: roleData } = await supabase
            .from('user_settings')
            .select('role')
            .eq('user_id', session.user.id)
            .single();

          if (roleData?.role) {
            setUserRole(roleData.role as 'admin' | 'cashier');
          } else {
            setUserRole('admin'); // Padrão seguro para o dono
          }

        } catch (error) {
          console.error('Erro na inicialização:', error);
          setUserRole('admin'); // Fallback
        } finally {
          setCheckingConfig(false);
          setLoadingRole(false);
        }
      } else if (!loading) {
        setCheckingConfig(false);
        setLoadingRole(false);
      }
    };

    initApp();
  }, [session, loading]);

  if (loading || checkingConfig || loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-amber-600 w-8 h-8" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  const handleSettingsSaved = () => {
    setIsConfigured(true);
  };

  const getCurrentView = () => {
    const path = location.pathname;
    if (path === '/settings') return 'settings';
    if (path === '/ingredients') return 'ingredients';
    if (path === '/packaging') return 'packaging';
    if (path === '/resale-products') return 'resale_products';
    if (path.startsWith('/recipes')) return 'recipes';
    if (path === '/costs') return 'costs';
    if (path === '/sales') return 'sales';
    if (path === '/expenses') return 'expenses';
    if (path === '/pos') return 'pos';
    if (path === '/reports') return 'reports';
    if (path === '/cash-history') return 'history';
    return 'dashboard';
  };

  const currentView = getCurrentView();

  const NavItem = ({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) => (
    <NavLink
      to={to}
      className={({ isActive }) => {
        const isPathActive = isActive || (to !== '/' && location.pathname.startsWith(`${to}/`));
        return `flex items-center gap-3 px-4 py-2 rounded-lg w-full text-left transition-all ${
          isPathActive
          ? 'bg-amber-100 text-amber-900 font-medium'
          : 'text-slate-600 hover:bg-slate-100'
        }`;
      }}
    >
      {({ isActive }) => {
         const isPathActive = isActive || (to !== '/' && location.pathname.startsWith(`${to}/`));
         return (
          <>
            <Icon size={20} className={isPathActive ? 'text-amber-700' : 'text-slate-400'} />
            {label}
          </>
        );
      }}
    </NavLink>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      <Toaster position="top-right" richColors expand={true} />

      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col h-screen sticky top-0 z-20">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-amber-600/20">
            C
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Custosys</h1>
          {userRole === 'cashier' && (
            <span className="ml-auto text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-200">
              PDV
            </span>
          )}
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto">
          {/* MENU: Dashboard (Só Admin) */}
          {userRole === 'admin' && (
            <NavItem to="/" label="Visão Geral" icon={LayoutDashboard} />
          )}
          
          <div className="pt-2 pb-2">
            <p className="px-4 text-xs font-bold text-slate-400 uppercase mb-1">Vendas & Caixa</p>
            {/* O PDV é o único acesso do Caixa */}
            <NavItem to="/pos" label="PDV | Frente de Caixa" icon={Store} />
            
            {/* Históricos e Relatórios (Só Admin) */}
            {userRole === 'admin' && (
              <>
                <NavItem to="/cash-history" label="Histórico de Caixa" icon={History} />
                <NavItem to="/reports" label="Relatórios de Vendas" icon={PieChart} />
                <NavItem to="/sales" label="Financeiro (Entradas)" icon={TrendingUp} />
                <NavItem to="/expenses" label="Despesas (Saídas)" icon={TrendingDown} />
              </>
            )}
          </div>

          {/* Seções exclusivas de Admin */}
          {userRole === 'admin' && (
            <>
              <div className="pt-2 pb-2">
                <p className="px-4 text-xs font-bold text-slate-400 uppercase mb-1">Produção</p>
                <NavItem to="/recipes" label="Minhas Receitas" icon={ChefHat} />
                <NavItem to="/ingredients" label="Meus Ingredientes" icon={Package} />
                <NavItem to="/packaging" label="Embalagens" icon={Box} />
                <NavItem to="/resale-products" label="Revenda" icon={ShoppingBag} />
              </div>

              <div className="pt-2 pb-2">
                <p className="px-4 text-xs font-bold text-slate-400 uppercase mb-1">Ferramentas</p>
                <NavItem to="/costs" label="Simulador & Custos" icon={DollarSign} />
                <NavItem to="/resale" label="Cálculo de Revenda" icon={Tags} />
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100">
                <NavItem to="/settings" label="Configurações" icon={SettingsIcon} />
              </div>
            </>
          )}
        </nav>

        {/* Aviso de Configuração (Só Admin precisa ver isso) */}
        {!isConfigured && currentView !== 'settings' && userRole === 'admin' && (
          <div className="mt-auto bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-800 mb-4 animate-pulse">
            <p className="font-bold mb-1 flex items-center gap-2"><ShieldAlert size={16}/> Atenção:</p>
            <p>Configure seus custos fixos e mão de obra para os cálculos funcionarem.</p>
          </div>
        )}

        <div className="mt-auto px-2 space-y-3">
          <button
            onClick={signOut}
            className="w-full text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg py-2 transition hover:bg-red-50 flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Sair
          </button>
          <p className="text-xs text-slate-400 text-center">Versão 2.4.0 (RBAC) • Effitech</p>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen bg-slate-50/50">
        <div className="max-w-6xl mx-auto">
          {/* Header dinâmico - Esconde para Dashboard e Relatórios, mostra para o resto */}
          {currentView !== 'dashboard' && currentView !== 'reports' && (
            <header className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                {currentView === 'settings' && <><SettingsIcon className="text-amber-600" /> Configurações Globais</>}
                {currentView === 'ingredients' && <><Package className="text-amber-600" /> Gestão de Ingredientes</>}
                {currentView === 'packaging' && <><Box className="text-blue-600" /> Embalagens</>}
                {currentView === 'resale_products' && <><ShoppingBag className="text-emerald-600" /> Produtos de Revenda</>}
                {currentView === 'recipes' && <><ChefHat className="text-amber-600" /> Gerenciamento de Receitas</>}
                {currentView === 'costs' && <><DollarSign className="text-amber-600" /> Simulador de Preços</>}
                {currentView === 'sales' && <><TrendingUp className="text-emerald-600" /> Controle de Vendas</>}
                {currentView === 'expenses' && <><TrendingDown className="text-rose-600" /> Controle de Despesas</>}
                {currentView === 'pos' && <><Store className="text-amber-600" /> Frente de Caixa</>}
                {currentView === 'history' && <><History className="text-slate-600" /> Histórico de Caixas</>}
              </h2>
            </header>
          )}

          <div className="animate-fade-in">
            <Routes>
              {/* Rota Pública (Acessível a Todos) */}
              <Route path="/pos" element={<PosView />} />

              {/* Rotas de Admin - Bloqueadas para Caixa */}
              {userRole === 'admin' ? (
                <>
                  <Route path="/" element={<Dashboard onNavigate={(view) => {
                    const routes: Record<string, string> = {
                      'settings': '/settings',
                      'ingredients': '/ingredients',
                      'products': '/resale-products',
                      'recipes': '/recipes',
                      'costs': '/costs',
                      'sales': '/sales',
                      'expenses': '/expenses'
                    };
                    if (routes[view]) navigate(routes[view]);
                  }} />} />
                  <Route path="/settings" element={<SettingsForm onSave={handleSettingsSaved} />} />
                  <Route path="/ingredients" element={<IngredientForm />} />
                  <Route path="/packaging" element={<PackagingView />} />
                  <Route path="/resale-products" element={<ResaleProductsView />} />
                  <Route path="/recipes" element={<RecipeList />} />
                  <Route path="/recipes/new" element={<RecipeForm />} />
                  <Route path="/recipes/:id" element={<RecipeForm />} />
                  <Route path="/costs" element={<CostingView />} />
                  <Route path="/calculator" element={<PricingSimulator />} /> 
                  <Route path="/resale" element={<ResaleCalculator />} />
                  <Route path="/sales" element={<SalesView />} />
                  <Route path="/expenses" element={<ExpensesView />} />
                  <Route path="/cash-history" element={<CashHistory />} />
                  <Route path="/reports" element={<PosReports />} />
                </>
              ) : (
                // Se for Caixa e tentar acessar qualquer outra rota, joga pro PDV
                <Route path="*" element={<Navigate to="/pos" replace />} />
              )}

              {/* Redirecionamento padrão para rota inválida */}
              <Route path="*" element={<Navigate to={userRole === 'admin' ? "/" : "/pos"} replace />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}