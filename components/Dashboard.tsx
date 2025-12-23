import React, { useState, useEffect } from 'react';
import { IngredientService } from '../services/ingredientService';
import { RecipeService } from '../services/recipeService';
import { SettingsService } from '../services/settingsService';
import { ChefHat, Package, DollarSign, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { Recipe, Ingredient, Settings } from '../types';

interface Props {
  onNavigate?: (view: 'recipes' | 'ingredients' | 'costs' | 'settings') => void;
}

export const Dashboard: React.FC<Props> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    recipeCount: 0,
    ingredientCount: 0,
    monthlyCost: 0
  });
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Busca tudo do Supabase em paralelo
      const [ingredients, recipes, settings] = await Promise.all([
        IngredientService.getAll(),
        RecipeService.getAll(),
        SettingsService.get()
      ]);

      setMetrics({
        recipeCount: recipes.length,
        ingredientCount: ingredients.length,
        monthlyCost: settings.labor_monthly_cost
      });

      // Pega as 3 últimas receitas (assumindo que a ordem vem do banco)
      setRecentRecipes(recipes.slice(0, 3));

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-amber-600 w-8 h-8"/></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
           <p className="text-slate-500">Acompanhe os indicadores principais da sua produção.</p>
        </div>
        <div className="text-xs font-medium bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
           {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Receitas */}
        <div onClick={() => onNavigate?.('recipes')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition">
              <ChefHat size={24} />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">+ Ativo</span>
          </div>
          <div className="text-3xl font-bold text-slate-800 mb-1">{metrics.recipeCount}</div>
          <div className="text-sm text-slate-500">Receitas Cadastradas</div>
        </div>

        {/* Card Ingredientes */}
        <div onClick={() => onNavigate?.('ingredients')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition">
              <Package size={24} />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">Total</span>
          </div>
          <div className="text-3xl font-bold text-slate-800 mb-1">{metrics.ingredientCount}</div>
          <div className="text-sm text-slate-500">Insumos no Estoque</div>
        </div>

        {/* Card Custos */}
        <div onClick={() => onNavigate?.('settings')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition">
              <DollarSign size={24} />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">Mensal</span>
          </div>
          <div className="text-3xl font-bold text-slate-800 mb-1">R$ {metrics.monthlyCost.toFixed(2)}</div>
          <div className="text-sm text-slate-500">Custo Operacional Base</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LISTA DE RECEITAS RECENTES */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500"/> Últimas Receitas
            </h3>
            <button onClick={() => onNavigate?.('recipes')} className="text-sm text-amber-600 font-medium hover:underline">Ver todas</button>
          </div>
          <div className="divide-y divide-slate-50">
            {recentRecipes.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">Nenhuma receita cadastrada ainda.</div>
            ) : (
              recentRecipes.map(recipe => (
                <div key={recipe.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 font-bold">
                      {recipe.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{recipe.name}</div>
                      <div className="text-xs text-slate-400">Rendimento: {recipe.yield_units} un</div>
                    </div>
                  </div>
                  <div className="text-right">
                     <div className="font-bold text-slate-700">R$ {recipe.unit_cost.toFixed(2)}</div>
                     <div className="text-xs text-slate-400">Custo Unit.</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CARD DE AÇÃO RÁPIDA */}
        <div className="bg-amber-600 rounded-xl shadow-lg shadow-amber-900/20 p-6 text-white flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Criar Nova Receita</h3>
            <p className="text-amber-100 text-sm mb-6">Calcule custos e defina preços de venda em segundos com nossa ficha técnica inteligente.</p>
          </div>
          <button 
            onClick={() => onNavigate?.('recipes')}
            className="w-full py-3 bg-white text-amber-700 font-bold rounded-lg hover:bg-amber-50 transition flex items-center justify-center gap-2 shadow-sm"
          >
            <ChefHat size={18} /> Começar Agora
          </button>
        </div>

      </div>
    </div>
  );
};