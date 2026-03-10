import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
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
import { UserManagement } from './components/UserManagement';
import { PublicReceiptView } from './components/PublicReceiptView';
import { ProductionStockPage } from './components/ProductionStockPage'; // Recarregando componente
import { supabase } from './services/supabase';
import { MainLayout } from './components/layout/MainLayout';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';
import './index.css';

export function AppContent() {
  const { session, loading } = useAuth();

  // Estados de Configuração
  const [isConfigured, setIsConfigured] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(true);

  // Estados de Permissão
  const [userRole, setUserRole] = useState<'admin' | 'cashier' | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const initApp = async () => {
      if (session?.user?.id) {
        setLoadingRole(true); // START LOADING to prevent improper redirect
        setCheckingConfig(true);

        let roleToSet: 'admin' | 'cashier' = 'cashier';

        // 1. Fetch Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (profile?.role) {
          roleToSet = profile.role as 'admin' | 'cashier';
        }

        setUserRole(roleToSet);

        // 2. Configurações (Apenas se for Admin precisa checar)
        if (roleToSet === 'admin') {
          try {
            const settings = await SettingsService.get();
            if (settings?.labor_monthly_cost > 0) {
              setIsConfigured(true);
            }
          } catch (settingsError) {
            console.warn('Erro ao carregar configurações:', settingsError);
          }
        }

      } else {
        setUserRole(null);
      }
      setCheckingConfig(false);
      setLoadingRole(false);
    };

    if (!loading) {
      initApp();
    }
  }, [session, loading]);


  if (loading || checkingConfig || loadingRole || (session && userRole === null)) {
    // Se a rota for o comprovante público, não exibimos o loader bloqueante se não houver sessão ativa
    if (!session && location.pathname.startsWith('/comprovante')) {
      // prosseguimos para baixo para renderizar a rota livremente
    } else {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-amber-600 w-8 h-8" />
        </div>
      );
    }
  }

  if (!session && !location.pathname.startsWith('/comprovante')) {
    return <Login />;
  }

  const handleSettingsSaved = () => {
    setIsConfigured(true);
  };

  return (
    <>
      <Toaster position="top-right" richColors expand={true} />
      <Routes>
        {/* ROTA TOTALMENTE PÚBLICA (Sem Layout, Sem Login) */}
        <Route path="/comprovante/:id" element={<PublicReceiptView />} />

        {/* ROTAS AUTENTICADAS */}
        {session && (
          <Route element={<MainLayout userRole={userRole} isConfigured={isConfigured} />}>
            {/* Rota Interna Compartilhada (Admin e Caixa) */}
            <Route path="/pos" element={<PosView />} />

            {/* Rotas de Admin - Bloqueadas para Caixa */}
            {userRole === 'admin' ? (
              <>
                <Route path="/" element={<Dashboard onNavigate={(view) => {
                  const routes: Record<string, string> = {
                    'settings': '/settings',
                    'ingredients': '/ingredients',
                    'production-bases': '/production-bases',
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

                {/* Rotas de Produção (Bases) */}
                <Route path="/production-bases" element={<RecipeList isBaseFilter={true} />} />
                <Route path="/production-bases/new" element={<RecipeForm />} />
                <Route path="/production-bases/edit/:id" element={<RecipeForm />} />
                
                <Route path="/estoque-producao" element={<ProductionStockPage />} />

                {/* Gestão de Usuários */}
                <Route path="/team" element={<UserManagement />} />
              </>
            ) : (
              // Fallback para Caixa
              <Route path="*" element={<Navigate to="/pos" replace />} />
            )}

            {/* Redirecionamento padrão global */}
            <Route path="*" element={<Navigate to={userRole === 'admin' ? "/" : "/pos"} replace />} />
          </Route>
        )}
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}