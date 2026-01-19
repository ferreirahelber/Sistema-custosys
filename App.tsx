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
import {
  Settings as SettingsIcon,
  ChefHat,
  Package,
  Box, // Ícone de Produtos
  LayoutDashboard,
  DollarSign,
  Loader2,
  LucideIcon,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Calculator,
  Tags
} from 'lucide-react';
import { Toaster } from 'sonner';
import './index.css';

export function AppContent() {
  const { session, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isConfigured, setIsConfigured] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(true);

  useEffect(() => {
    const checkSettings = async () => {
      if (session) {
        try {
          const settings = await SettingsService.get();
          if (settings.labor_monthly_cost > 0) {
            setIsConfigured(true);
          }
        } catch (error) {
          console.error('Erro ao verificar configs', error);
        } finally {
          setCheckingConfig(false);
        }
      } else if (!loading) {
        setCheckingConfig(false);
      }
    };

    checkSettings();
  }, [session, loading]);

  if (loading || checkingConfig) {
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
    if (path === '/products') return 'products';
    if (path.startsWith('/recipes')) return 'recipes';
    if (path === '/costs') return 'costs';
    if (path === '/sales') return 'sales';
    if (path === '/expenses') return 'expenses';
    return 'dashboard';
  };

  const currentView = getCurrentView();

  const NavItem = ({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left transition-all ${isActive || (to !== '/' && location.pathname.startsWith(to))
          ? 'bg-amber-100 text-amber-900 font-medium'
          : 'text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={20} className={isActive || (to !== '/' && location.pathname.startsWith(to)) ? 'text-amber-700' : 'text-slate-400'} />
          {label}
        </>
      )}
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
        </div>

        <nav className="space-y-1 flex-1">
          <NavItem to="/" label="Visão Geral" icon={LayoutDashboard} />
          <NavItem to="/recipes" label="Minhas Receitas" icon={ChefHat} />
          <div className="pt-2 pb-2">
            <p className="px-4 text-xs font-bold text-slate-400 uppercase mb-1">Financeiro</p>
            <NavItem to="/sales" label="Receitas (Vendas)" icon={TrendingUp} />
            <NavItem to="/expenses" label="Despesas" icon={TrendingDown} />
          </div>

          <div className="pt-2 pb-2">
            <p className="px-4 text-xs font-bold text-slate-400 uppercase mb-1">Estoques</p>
            <NavItem to="/ingredients" label="Meus Ingredientes" icon={Package} />
            <NavItem to="/products" label="Produtos & Emb." icon={ShoppingBag} />
          </div>

          {/* --- MÓDULO FERRAMENTAS --- */}
          <div className="pt-2 pb-2">
            <p className="px-4 text-xs font-bold text-slate-400 uppercase mb-1">Ferramentas</p>
            <NavItem to="/costs" label="Simulador & Custos" icon={DollarSign} />
            {/* Link correto para o PricingSimulator */}
            <NavItem to="/resale" label="Cálculo de Revenda" icon={Tags} />
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <NavItem to="/settings" label="Configurações" icon={SettingsIcon} />
          </div>
        </nav>

        {!isConfigured && currentView !== 'settings' && (
          <div className="mt-auto bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-800 mb-4 animate-pulse">
            <p className="font-bold mb-1">Atenção:</p>
            <p>Configure seus custos fixos e mão de obra para os cálculos funcionarem.</p>
          </div>
        )}

        <div className="mt-auto px-2 space-y-3">
          <button
            onClick={signOut}
            className="w-full text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg py-2 transition hover:bg-red-50"
          >
            Sair
          </button>
          <p className="text-xs text-slate-400 text-center">Versão 2.2.0 • Effitech</p>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen bg-slate-50/50">
        <div className="max-w-6xl mx-auto">
          {currentView !== 'dashboard' && (
            <header className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                {currentView === 'settings' && <><SettingsIcon className="text-amber-600" /> Configurações Globais</>}
                {currentView === 'ingredients' && <><Package className="text-amber-600" /> Gestão de Ingredientes</>}
                {/* --- ADICIONADO AQUI: Título para Produtos --- */}
                {currentView === 'products' && <><Box className="text-purple-600" /> Produtos & Embalagens</>}

                {currentView === 'recipes' && <><ChefHat className="text-amber-600" /> Gerenciamento de Receitas</>}
                {currentView === 'costs' && <><DollarSign className="text-amber-600" /> Simulador de Preços</>}
                {/* NOVOS TÍTULOS */}
                {currentView === 'sales' && <><TrendingUp className="text-emerald-600" /> Controle de Vendas</>}
                {currentView === 'expenses' && <><TrendingDown className="text-rose-600" /> Controle de Despesas</>}
              </h2>
              <p className="text-slate-500 mt-1">
                {currentView === 'settings' && 'Defina os parâmetros financeiros base para o cálculo da sua mão de obra.'}
                {currentView === 'ingredients' && 'Cadastre seus insumos com conversão automática de medidas.'}
                {currentView === 'products' && 'Cadastre embalagens, caixas, laços e etiquetas.'}
                {currentView === 'recipes' && 'Crie fichas técnicas detalhadas com custos automáticos.'}
                {currentView === 'costs' && 'Analise custos, simule margens e defina preços de venda.'}
                {/* NOVAS DESCRIÇÕES */}
                {currentView === 'sales' && 'Registe as entradas de dinheiro das suas encomendas.'}
                {currentView === 'expenses' && 'Gerencie os gastos com compras, contas e pessoal.'}
              </p>
            </header>
          )}

          <div className="animate-fade-in">
            <Routes>
              <Route path="/" element={<Dashboard onNavigate={(view) => {
                const routes: Record<string, string> = {
                  'settings': '/settings',
                  'ingredients': '/ingredients',
                  'products': '/products', // Adicionado ao Dashboard
                  'recipes': '/recipes',
                  'costs': '/costs',
                  'sales': '/sales',
                  'expenses': '/expenses'
                };
                if (routes[view]) navigate(routes[view]);
              }} />} />
              <Route path="/settings" element={<SettingsForm onSave={handleSettingsSaved} />} />
              <Route path="/ingredients" element={<IngredientForm type="ingredient" />} />
              <Route path="/products" element={<IngredientForm type="product" />} />
              <Route path="/recipes" element={<RecipeList />} />
              <Route path="/recipes/new" element={<RecipeForm />} />
              <Route path="/recipes/:id" element={<RecipeForm />} />
              <Route path="/costs" element={<CostingView />} />
              {/* NOVAS ROTAS DE FERRAMENTAS */}
              <Route path="/calculator" element={<PricingSimulator />} /> 
              <Route path="/resale" element={<ResaleCalculator />} />

              {/* NOVAS ROTAS FINANCEIRAS */}
              <Route path="/sales" element={<SalesView />} />
              <Route path="/expenses" element={<ExpensesView />} />

              {/* IMPORTANTE: Esta rota deve ser sempre a ÚLTIMA */}
              <Route path="*" element={<Navigate to="/" replace />} />

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