import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { RecipeService } from '../services/recipeService';
import { IngredientService } from '../services/ingredientService';
import { Recipe, Ingredient, Settings } from '../types';
import { calculateRecipeFinancials } from '../utils/calculations';
import { PricingSimulator } from './PricingSimulator';
import { DollarSign, Loader2 } from 'lucide-react';

export const CostingView: React.FC = () => {
  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  
  // Guarda o ID da receita selecionada no Dropdown
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Busca dados do banco
      const { data: settingsData } = await supabase.from('settings').select('*').single();
      const ingredientsData = await IngredientService.getAll();
      const recipesData = await RecipeService.getAll();

      // Configura estados com fallback seguro
      setSettings(settingsData || { cost_per_minute: 0.5, fixed_overhead_rate: 10 });
      setIngredients(ingredientsData || []);
      setRecipes(recipesData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- O CÉREBRO DA TELA (Cálculo em Tempo Real) ---
  const calculatedRecipe = useMemo(() => {
    // Se não tiver nada selecionado ou faltando dados, retorna nulo
    if (!selectedRecipeId || !settings || recipes.length === 0) return null;

    const recipe = recipes.find(r => r.id === selectedRecipeId);
    if (!recipe) return null;

    // 1. Recalcula os custos financeiros baseados nos ingredientes atuais
    const financials = calculateRecipeFinancials(
      recipe.items || [],
      ingredients,
      recipe.preparation_time_minutes || 0,
      recipe.yield_units || 1,
      settings
    );

    // 2. Retorna um novo objeto Receita com os custos atualizados
    // Esse objeto é o que alimenta TANTO a esquerda QUANTO a direita
    return {
      ...recipe,
      total_cost_material: financials.total_cost_material || 0,
      total_cost_labor: financials.total_cost_labor || 0,
      total_cost_overhead: financials.total_cost_overhead || 0,
      total_cost_final: financials.total_cost_final || 0,
      unit_cost: financials.unit_cost || 0
    };
  }, [selectedRecipeId, recipes, ingredients, settings]);

  const formatMoney = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 gap-2">
        <Loader2 className="animate-spin" /> Carregando simulador...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* O título principal é exibido pelo layout em `App.tsx` — removido para evitar duplicação */}

      {/* 1. SELETOR DE RECEITA */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <label className="block text-sm font-bold text-slate-700 mb-2">Selecione uma Receita para Simular</label>
        <select
          value={selectedRecipeId}
          onChange={(e) => setSelectedRecipeId(e.target.value)}
          className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-700 font-medium"
        >
          <option value="">-- Escolha uma receita --</option>
          {recipes.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* 2. COLUNA ESQUERDA: ESTRUTURA DE CUSTOS (VISUALIZAÇÃO) */}
        {calculatedRecipe ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-green-700 mb-4 flex items-center gap-2">
              <DollarSign size={20}/> Estrutura de Custos
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-3 bg-slate-50 rounded-lg items-center">
                <span className="text-slate-600">Materiais (Ingredientes)</span>
                <span className="font-bold text-slate-800">{formatMoney(calculatedRecipe.total_cost_material)}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-lg items-center">
                <span className="text-slate-600">Mão de Obra</span>
                <span className="font-bold text-slate-800">{formatMoney(calculatedRecipe.total_cost_labor)}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-lg items-center">
                <span className="text-slate-600">Custos Fixos (Overhead)</span>
                <span className="font-bold text-slate-800">{formatMoney(calculatedRecipe.total_cost_overhead)}</span>
              </div>
              
              <div className="flex justify-between p-4 bg-slate-800 text-white rounded-lg mt-4 items-center">
                <span className="font-medium">Custo Total de Produção</span>
                <span className="font-bold text-lg">{formatMoney(calculatedRecipe.total_cost_final)}</span>
              </div>

              <div className="text-center pt-2 text-slate-500 text-xs">
                 Custo Unitário: <span className="font-bold text-slate-700">{formatMoney(calculatedRecipe.unit_cost)}</span> (Rende {calculatedRecipe.yield_units})
              </div>
            </div>
          </div>
        ) : (
          /* Placeholder quando não tem seleção */
          <div className="h-full min-h-[300px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-sm">
             Selecione uma receita acima.
          </div>
        )}

        {/* 3. COLUNA DIREITA: SIMULADOR DE VENDA (COMPONENTE FILHO) */}
        <div>
           <div className="flex items-center gap-2 mb-2 font-bold text-blue-900">
              <span className="text-blue-600">↗</span>
              <span className="ml-1 text-lg md:text-xl">Simulador de Venda</span>
           </div>
           
           {/* AQUI ESTAVA FALTANDO A LIGAÇÃO: Passamos o objeto calculatedRecipe */}
           <PricingSimulator recipe={calculatedRecipe} showHeader={false} />
        </div>

      </div>
    </div>
  );
};