import React, { useState, useEffect } from 'react';
import { IngredientService } from '../services/ingredientService';
import { RecipeService } from '../services/recipeService';
import { SettingsService } from '../services/settingsService';
import {
  ChefHat,
  Package,
  DollarSign,
  Loader2,
  AlertTriangle,
  TrendingUp,
  PieChart as IconPieChart,
  BarChart3
} from 'lucide-react';
import { Recipe, Ingredient } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface Props {
  onNavigate?: (view: 'recipes' | 'ingredients' | 'costs' | 'settings') => void;
}

// Cores para os gráficos
const COLORS = ['#d97706', '#2563eb', '#16a34a']; // Amber, Blue, Green

export const Dashboard: React.FC<Props> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    recipeCount: 0,
    ingredientCount: 0,
    monthlyCost: 0,
  });
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);
  
  // Estados para os Gráficos
  const [costDistribution, setCostDistribution] = useState<any[]>([]);
  const [topExpensiveRecipes, setTopExpensiveRecipes] = useState<any[]>([]);
  const [topExpensiveIngredients, setTopExpensiveIngredients] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [ingredients, recipes, settings] = await Promise.all([
        IngredientService.getAll(),
        RecipeService.getAll(),
        SettingsService.get(),
      ]);

      setMetrics({
        recipeCount: recipes.length,
        ingredientCount: ingredients.length,
        monthlyCost: settings.labor_monthly_cost,
      });

      // --- PROCESSAMENTO DE DADOS PARA GRÁFICOS ---

      // 1. Distribuição de Custos (Média de todas as receitas)
      if (recipes.length > 0) {
        const totalMat = recipes.reduce((acc, r) => acc + r.total_cost_material, 0);
        const totalLab = recipes.reduce((acc, r) => acc + r.total_cost_labor, 0);
        const totalOver = recipes.reduce((acc, r) => acc + r.total_cost_overhead, 0);
        const grandTotal = totalMat + totalLab + totalOver;

        setCostDistribution([
          { name: 'Materiais', value: grandTotal ? (totalMat / grandTotal) * 100 : 0 },
          { name: 'Mão de Obra', value: grandTotal ? (totalLab / grandTotal) * 100 : 0 },
          { name: 'Custos Fixos', value: grandTotal ? (totalOver / grandTotal) * 100 : 0 },
        ]);
      }

      // 2. Top 5 Receitas Mais Caras (Custo Unitário)
      const sortedRecipes = [...recipes].sort((a, b) => b.unit_cost - a.unit_cost).slice(0, 5);
      setTopExpensiveRecipes(sortedRecipes.map(r => ({
        name: r.name.length > 15 ? r.name.substring(0, 15) + '...' : r.name,
        custo: r.unit_cost
      })));

      // 3. Top 5 Ingredientes Mais Caros (Baseado no custo base normalizado)
      const sortedIngredients = [...ingredients].sort((a, b) => b.unit_cost_base - a.unit_cost_base).slice(0, 5);
      setTopExpensiveIngredients(sortedIngredients.map(i => ({
        name: i.name.length > 15 ? i.name.substring(0, 15) + '...' : i.name,
        custo: i.unit_cost_base, // Custo por g/ml/un
        unidade: i.base_unit
      })));

      setRecentRecipes(recipes.slice(0, 3));
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-amber-600 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-amber-600" /> Dashboard Gerencial
          </h2>
          <p className="text-slate-500">Indicadores estratégicos para sua confeitaria.</p>
        </div>
        <div className="text-xs font-medium bg-white border border-slate-200 text-slate-500 px-4 py-2 rounded-full shadow-sm">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div onClick={() => onNavigate?.('recipes')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer group">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition">
              <ChefHat size={20} />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+ Ativo</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{metrics.recipeCount}</div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Receitas Cadastradas</div>
        </div>

        <div onClick={() => onNavigate?.('ingredients')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer group">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition">
              <Package size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800">{metrics.ingredientCount}</div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Insumos no Estoque</div>
        </div>

        <div onClick={() => onNavigate?.('settings')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer group">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:scale-110 transition">
              <DollarSign size={20} />
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-full">Mensal</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">R$ {metrics.monthlyCost.toFixed(2)}</div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Custo Operacional Base</div>
        </div>
      </div>

      {/* ÁREA DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* GRÁFICO 1: Distribuição de Custos */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <IconPieChart size={18} className="text-amber-500"/> Estrutura de Custos Média
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {costDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Impacto']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-center text-slate-400 mt-2">
            Mostra onde seu dinheiro está sendo gasto na média das receitas.
          </p>
        </div>

        {/* GRÁFICO 2: Receitas Mais Caras */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-500"/> Top 5 Receitas (Custo Unitário)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topExpensiveRecipes} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Custo']}
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="custo" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* LISTA E CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LISTA DE RECEITAS RECENTES */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" /> Últimas Receitas Criadas
            </h3>
            <button
              onClick={() => onNavigate?.('recipes')}
              className="text-sm text-amber-600 font-bold hover:underline"
            >
              Ver todas
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentRecipes.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Nenhuma receita cadastrada ainda.
              </div>
            ) : (
              recentRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 transition group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center font-bold shadow-sm group-hover:bg-amber-200 transition">
                      {recipe.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-700">{recipe.name}</div>
                      <div className="text-xs text-slate-400">
                        Rendimento: {recipe.yield_units} un
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-700">R$ {recipe.unit_cost.toFixed(2)}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Custo Unit.</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CARD DE AÇÃO RÁPIDA (Mantido para UX) */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
            <ChefHat size={120} />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2 text-amber-400">Nova Receita</h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Precificação correta é a chave do lucro. Cadastre uma nova ficha técnica agora mesmo.
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('recipes')}
            className="relative z-10 w-full py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition flex items-center justify-center gap-2 shadow-lg"
          >
            <ChefHat size={18} /> Criar Ficha Técnica
          </button>
        </div>
      </div>
    </div>
  );
};