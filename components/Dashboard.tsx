import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Ingredient, Recipe, Settings } from '../types';
import { 
  AlertTriangle, 
  ChefHat, 
  Package, 
  TrendingUp, 
  ArrowRight, 
  Plus, 
  ShoppingCart,
  DollarSign
} from 'lucide-react';

interface Props {
  onNavigate: (view: any) => void;
}

export const Dashboard: React.FC<Props> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    recipesCount: 0,
    ingredientsCount: 0,
    lowStockCount: 0,
    missingSettings: false
  });
  
  const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([]);
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const recipes = StorageService.getRecipes();
    const ingredients = StorageService.getIngredients();
    const currentSettings = StorageService.getSettings();

    // Lógica de Estoque Baixo (Ex: menos de 200g/ml/un)
    const lowStock = ingredients.filter(i => (i.current_stock || 0) < 200);

    setStats({
      recipesCount: recipes.length,
      ingredientsCount: ingredients.length,
      lowStockCount: lowStock.length,
      missingSettings: currentSettings.cost_per_minute === 0
    });

    setLowStockItems(lowStock.slice(0, 5)); // Mostrar apenas os top 5 críticos
    setRecentRecipes(recipes.slice(-3).reverse()); // Últimas 3 criadas
    setSettings(currentSettings);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Cabeçalho de Boas Vindas */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
          <p className="text-slate-500">Acompanhe os indicadores principais da sua produção.</p>
        </div>
        <div className="text-sm text-slate-400 font-medium bg-slate-100 px-3 py-1 rounded-full">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Cartões de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Receitas */}
        <div 
            onClick={() => onNavigate('recipes')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer group"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition">
                    <ChefHat size={24} />
                </div>
                {stats.recipesCount > 0 && <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">+ Ativo</span>}
            </div>
            <h3 className="text-3xl font-bold text-slate-800 mb-1">{stats.recipesCount}</h3>
            <p className="text-sm text-slate-500 font-medium">Receitas Cadastradas</p>
        </div>

        {/* Card Ingredientes */}
        <div 
            onClick={() => onNavigate('ingredients')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer group"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition">
                    <Package size={24} />
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">Total</span>
            </div>
            <h3 className="text-3xl font-bold text-slate-800 mb-1">{stats.ingredientsCount}</h3>
            <p className="text-sm text-slate-500 font-medium">Insumos no Estoque</p>
        </div>

        {/* Card Financeiro (Mão de Obra) */}
        <div 
            onClick={() => onNavigate('settings')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer group"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition">
                    <DollarSign size={24} />
                </div>
                {stats.missingSettings ? (
                    <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full animate-pulse">Configurar!</span>
                ) : (
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">Hora/Mês</span>
                )}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">
                {stats.missingSettings ? 'R$ 0,00' : `R$ ${settings?.labor_monthly_cost.toFixed(2)}`}
            </h3>
            <p className="text-sm text-slate-500 font-medium">Custo Operacional Mensal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Alertas de Estoque (Esquerda - Maior) */}
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <AlertTriangle size={18} className="text-amber-500"/> Alertas de Reposição
                      </h3>
                      <button onClick={() => onNavigate('ingredients')} className="text-xs font-bold text-amber-600 hover:underline">
                          Ver Estoque Completo
                      </button>
                  </div>
                  
                  {lowStockItems.length === 0 ? (
                      <div className="p-8 text-center">
                          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                              <TrendingUp size={24}/>
                          </div>
                          <p className="text-slate-800 font-medium">Estoque Saudável!</p>
                          <p className="text-sm text-slate-400">Nenhum item abaixo do nível crítico.</p>
                      </div>
                  ) : (
                      <div className="divide-y divide-slate-100">
                          {lowStockItems.map(item => (
                              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-red-50/30 transition">
                                  <div className="flex items-center gap-3">
                                      <div className="p-2 bg-red-100 text-red-500 rounded-lg">
                                          <ShoppingCart size={16} />
                                      </div>
                                      <div>
                                          <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                                          <p className="text-xs text-red-500 font-medium">
                                              Resta apenas: {item.current_stock} {item.base_unit}
                                          </p>
                                      </div>
                                  </div>
                                  <button 
                                    onClick={() => onNavigate('ingredients')}
                                    className="px-3 py-1 text-xs border border-slate-200 rounded hover:bg-white hover:border-slate-300 text-slate-600"
                                  >
                                      Repor
                                  </button>
                              </div>
                          ))}
                          {stats.lowStockCount > 5 && (
                              <div className="p-3 text-center text-xs text-slate-500 bg-slate-50">
                                  E mais {stats.lowStockCount - 5} itens precisando de atenção...
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>

          {/* Atalhos Rápidos (Direita - Menor) */}
          <div className="space-y-6">
               <div className="bg-amber-600 rounded-xl p-6 text-white shadow-lg shadow-amber-600/20 relative overflow-hidden">
                   {/* Decorative Circle */}
                   <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                   
                   <h3 className="font-bold text-lg mb-2 relative z-10">Criar Nova Receita</h3>
                   <p className="text-amber-100 text-sm mb-4 relative z-10">
                       Calcule custos e defina preços de venda em segundos.
                   </p>
                   <button 
                     onClick={() => onNavigate('recipes')}
                     className="w-full bg-white text-amber-700 font-bold py-2 rounded-lg hover:bg-amber-50 transition relative z-10 flex items-center justify-center gap-2"
                   >
                       <Plus size={18}/> Começar Agora
                   </button>
               </div>

               <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                   <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">Últimas Receitas</h3>
                   <div className="space-y-3">
                       {recentRecipes.length === 0 ? (
                           <p className="text-sm text-slate-400 italic">Nenhuma receita recente.</p>
                       ) : (
                           recentRecipes.map(r => (
                               <div key={r.id} onClick={() => onNavigate('recipes')} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded cursor-pointer transition">
                                   <span className="text-slate-700 font-medium truncate w-32">{r.name}</span>
                                   <ArrowRight size={14} className="text-slate-300"/>
                               </div>
                           ))
                       )}
                   </div>
               </div>
          </div>
      </div>
    </div>
  );
};