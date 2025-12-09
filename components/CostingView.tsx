import React, { useState, useEffect } from 'react';
import { Recipe, Settings, Ingredient } from '../types';
import { StorageService } from '../services/storage';
import { calculateRecipeFinancials } from '../utils/calculations';
import { PricingSimulator } from './PricingSimulator';
import { Calculator, ArrowRight, PieChart } from 'lucide-react';

export const CostingView: React.FC = () => {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [selectedRecipeId, setSelectedRecipeId] = useState('');
    const [settings, setSettings] = useState<Settings>(StorageService.getSettings());

    useEffect(() => {
        setRecipes(StorageService.getRecipes());
        setIngredients(StorageService.getIngredients());
        setSettings(StorageService.getSettings());
    }, []);

    // We recalculate the recipe here to ensure we are using the LATEST settings 
    // (e.g., if user updated salary, the old recipe object might still have old labor cost)
    const getRecalculatedRecipe = (recipe: Recipe): Recipe => {
        const financials = calculateRecipeFinancials(
            recipe.items,
            ingredients,
            recipe.preparation_time_minutes,
            recipe.yield_units,
            settings
        );

        return {
            ...recipe,
            ...financials as any // Merge recalculated costs
        };
    };

    const rawRecipe = recipes.find(r => r.id === selectedRecipeId);
    const selectedRecipe = rawRecipe ? getRecalculatedRecipe(rawRecipe) : null;

    return (
        <div className="space-y-8">
            {/* Selection Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Calculator className="text-amber-600"/> Simulador de Preços
                </h2>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Selecione uma Receita para Analisar</label>
                        <select 
                            value={selectedRecipeId}
                            onChange={(e) => setSelectedRecipeId(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-slate-800"
                        >
                            <option value="">Selecione...</option>
                            {recipes.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {selectedRecipe ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cost Breakdown */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-slate-800 text-white p-6 rounded-xl shadow-sm">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <PieChart size={18} className="text-amber-400"/> Raio-X do Custo (Atualizado)
                            </h3>
                            
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between pb-2 border-b border-slate-700">
                                    <span className="opacity-80">Matéria Prima</span>
                                    <span>R$ {selectedRecipe.total_cost_material.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between pb-2 border-b border-slate-700">
                                    <span className="opacity-80">Mão de Obra</span>
                                    <span>R$ {selectedRecipe.total_cost_labor.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between pb-2 border-b border-slate-700">
                                    <span className="opacity-80">Custos Fixos</span>
                                    <span>R$ {selectedRecipe.total_cost_overhead.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between pt-2 text-lg font-bold text-amber-400">
                                    <span>Total Lote</span>
                                    <span>R$ {selectedRecipe.total_cost_final.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                             <div className="text-center">
                                <span className="text-xs uppercase tracking-widest text-slate-500">Custo Unitário Base</span>
                                <div className="text-4xl font-bold text-slate-800 my-2">
                                    R$ {selectedRecipe.unit_cost.toFixed(2)}
                                </div>
                                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                    Rendimento: {selectedRecipe.yield_units} un
                                </span>
                             </div>
                        </div>
                    </div>

                    {/* Simulator */}
                    <div className="lg:col-span-2">
                         <PricingSimulator recipe={selectedRecipe} />
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <ArrowRight className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">Nenhuma receita selecionada</h3>
                    <p className="text-slate-500">Escolha uma receita acima para simular margens de lucro e preço de venda.</p>
                </div>
            )}
        </div>
    );
};