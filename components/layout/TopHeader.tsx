import React from 'react';
import { useLocation } from 'react-router-dom';
import { Settings as SettingsIcon, ChefHat, Package, Box, Layers, DollarSign, TrendingUp, TrendingDown, Store, History, ShoppingBag } from 'lucide-react';

export const TopHeader: React.FC = () => {
    const location = useLocation();

    const getCurrentView = () => {
        const path = location.pathname;
        if (path === '/settings') return 'settings';
        if (path === '/ingredients') return 'ingredients';
        if (path === '/production-bases') return 'bases';
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

    if (currentView === 'dashboard' || currentView === 'reports') return null;

    return (
        <header className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                {currentView === 'settings' && <><SettingsIcon className="text-amber-600" /> Configurações Globais</>}
                {currentView === 'ingredients' && <><Package className="text-amber-600" /> Gestão de Ingredientes</>}
                {currentView === 'packaging' && <><Box className="text-blue-600" /> Embalagens</>}
                {currentView === 'resale_products' && <><ShoppingBag className="text-emerald-600" /> Produtos de Revenda</>}
                {currentView === 'bases' && <><Layers className="text-blue-600" /> Insumos Produzidos (Bases)</>}
                {currentView === 'recipes' && <><ChefHat className="text-amber-600" /> Gerenciamento de Receitas</>}
                {currentView === 'costs' && <><DollarSign className="text-amber-600" /> Simulador de Preços</>}
                {currentView === 'sales' && <><TrendingUp className="text-emerald-600" /> Controle de Vendas</>}
                {currentView === 'expenses' && <><TrendingDown className="text-rose-600" /> Controle de Despesas</>}
                {currentView === 'pos' && <><Store className="text-amber-600" /> Frente de Caixa</>}
                {currentView === 'history' && <><History className="text-slate-600" /> Histórico de Caixas</>}
            </h2>
        </header>
    );
};
