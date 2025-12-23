import React, { useState, useEffect } from 'react';
import { RecipeService } from '../services/recipeService';
import { SettingsService } from '../services/settingsService';
import { IngredientService } from '../services/ingredientService';
import { calculateRecipeFinancials } from '../utils/calculations';
import { PricingSimulator } from './PricingSimulator';
import { Recipe, Settings, Ingredient } from '../types';
import { Loader2, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

export const CostingView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Busca Receitas, Configurações e Ingredientes do Supabase
      const [allRecipes, mySettings, allIngredients] = await Promise.all([
        RecipeService.getAll(),
        SettingsService.get(),
        IngredientService.getAll()
      ]);
      
      setRecipes(allRecipes);
      setSettings(mySettings);
      setIngredients(allIngredients);
    } catch (error) {
      console.error("Erro ao carregar dados de custos:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-amber-600 w-8 h-8" />
      </div>
    );
  }

  // Se não tiver configurações, pede para configurar
  if (!settings || settings.labor_monthly_cost === 0) {
    return (
      <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 text-center">
        <AlertTriangle className="mx-auto text-amber-500 mb-2" size={32} />
        <h3 className="text-lg font-bold text-amber-900">Configuração Necessária</h3>
        <p className="text-amber-700">Para simular preços, você precisa primeiro definir seus custos fixos e mão de obra na aba Configurações.</p>
      </div>
    );
  }

  const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);

  // Recalcula os custos financeiros com os dados mais recentes
  const financials = selectedRecipe 
    ? calculateRecipeFinancials(
        selectedRecipe.items || [], 
        ingredients, 
        selectedRecipe.preparation_time_minutes, 
        selectedRecipe.yield_units, 
        settings
      )
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* SELEÇÃO DE RECEITA */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <label className="block text-sm font-bold text-slate-700 mb-2">Selecione uma Receita para Simular</label>
        <select 
          value={selectedRecipeId} 
          onChange={(e) => setSelectedRecipeId(e.target.value)}
          className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-slate-700 font-medium"
        >
          <option value="">-- Escolha uma receita --</option>
          {recipes.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {selectedRecipe && financials && settings ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* RESUMO DE CUSTOS ATUAIS */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="text-green-600" size={20}/> Estrutura de Custos
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Materiais (Ingredientes)</span>
                <span className="font-bold text-slate-800">R$ {financials.total_cost_material.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Mão de Obra</span>
                <span className="font-bold text-slate-800">R$ {financials.total_cost_labor.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Custos Fixos (Overhead)</span>
                <span className="font-bold text-slate-800">R$ {financials.total_cost_overhead.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-4 bg-slate-800 text-white rounded-lg mt-2">
                <span className="font-medium">Custo Total de Produção</span>
                <span className="font-bold text-lg">R$ {financials.total_cost_final.toFixed(2)}</span>
              </div>
              <div className="text-center text-sm text-slate-500 pt-2">
                Custo Unitário: <strong className="text-slate-800">R$ {financials.unit_cost.toFixed(2)}</strong> (Rende {selectedRecipe.yield_units})
              </div>
            </div>
          </div>

          {/* SIMULADOR DE PREÇO DE VENDA */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <TrendingUp className="text-blue-600" size={20}/> Simulador de Venda
            </h3>
            
            {/* Aqui carregamos o componente simulador, passando os dados reais */}
            <PricingSimulator 
              unitCost={financials.unit_cost} 
              settings={settings}
            />
          </div>

        </div>
      ) : (
        selectedRecipeId && (
          <div className="text-center py-12 text-slate-400">
             Calculando dados da receita...
          </div>
        )
      )}

      {!selectedRecipeId && (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
          <DollarSign size={48} className="mx-auto mb-4 opacity-20" />
          <p>Selecione uma receita acima para ver a análise de custos e definir seu preço de venda.</p>
        </div>
      )}

    </div>
  );
};