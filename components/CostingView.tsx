import React, { useState, useEffect } from 'react';
import { Recipe } from '../types';
import { RecipeService } from '../services/recipeService';
import { SettingsService } from '../services/settingsService';
import { calculateSellingPrice, calculateMargin } from '../utils/calculations';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Save,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

export const CostingView: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Inputs do Simulador
  const [taxRate, setTaxRate] = useState(0); 
  const [cardFee, setCardFee] = useState(0);
  const [desiredMargin, setDesiredMargin] = useState(25);
  const [manualPrice, setManualPrice] = useState('');
  const [mode, setMode] = useState<'margin' | 'price'>('margin');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [recipesData, settingsData] = await Promise.all([
        RecipeService.getAll(),
        SettingsService.get(),
      ]);
      
      setRecipes(recipesData || []);

      if (settingsData) {
        setTaxRate(settingsData.default_tax_rate ?? 4.5);
        setCardFee(settingsData.default_card_fee ?? 3.99);
      } else {
        setTaxRate(4.5);
        setCardFee(3.99);
      }

    } catch (error) {
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);

  useEffect(() => {
    if (selectedRecipe) {
      if (selectedRecipe.selling_price && selectedRecipe.selling_price > 0) {
        setMode('price');
        setManualPrice(selectedRecipe.selling_price.toFixed(2));
      } else {
        setMode('margin');
        setDesiredMargin(25);
        setManualPrice('');
      }
    }
  }, [selectedRecipeId, recipes]); // Adicionado recipes para garantir atualização

  // Validações Matemáticas
  const totalTaxAndFees = taxRate + cardFee;
  const isImpossibleMath = mode === 'margin' && totalTaxAndFees + desiredMargin >= 100;
  const isNearLimit =
    mode === 'margin' && totalTaxAndFees + desiredMargin > 95 && !isImpossibleMath;

  // Cálculos Reativos
  let sellingPrice = 0;
  let realMargin = 0;
  let profitValue = 0;

  if (selectedRecipe) {
    if (mode === 'margin') {
      if (!isImpossibleMath) {
        sellingPrice = calculateSellingPrice(
          selectedRecipe.unit_cost,
          taxRate,
          cardFee,
          desiredMargin
        );
        realMargin = desiredMargin;
      }
    } else {
      const priceVal = manualPrice === '' ? 0 : parseFloat(manualPrice);
      sellingPrice = priceVal || 0;
      realMargin = calculateMargin(selectedRecipe.unit_cost, sellingPrice, taxRate, cardFee);
    }

    const totalDeductions = (sellingPrice * (taxRate + cardFee)) / 100;
    profitValue = sellingPrice - selectedRecipe.unit_cost - totalDeductions;
  }

  const handleSavePrice = async () => {
    if (!selectedRecipe || sellingPrice <= 0 || isImpossibleMath) return;

    try {
      setSaving(true);
      
      // --- CORREÇÃO AQUI ---
      // Usamos .save e passamos o objeto completo, pois o .update foi removido
      await RecipeService.save({
        ...selectedRecipe,
        selling_price: parseFloat(sellingPrice.toFixed(2)),
      });

      // Atualiza estado local
      const updatedRecipes = recipes.map((r) =>
        r.id === selectedRecipe.id
          ? { ...r, selling_price: parseFloat(sellingPrice.toFixed(2)) }
          : r
      );
      setRecipes(updatedRecipes);
      
      toast.success(`Preço de venda atualizado!`);
    } catch (error) {
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleNumberInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: number) => void
  ) => {
    const value = e.target.value;
    setter(value === '' ? 0 : parseFloat(value));
  };

  if (loading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-amber-600" />
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Seletor de Receita */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Selecione uma Receita para Simular
        </label>
        <select
          value={selectedRecipeId}
          onChange={(e) => setSelectedRecipeId(e.target.value)}
          className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-none"
        >
          <option value="">-- Selecione --</option>
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {selectedRecipe ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Esquerda: Estrutura de Custos */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6 border-b pb-2">
              <DollarSign className="text-green-600" /> Estrutura de Custos
            </h3>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-600">Materiais</span>
                <span className="font-bold text-slate-800">
                  R$ {selectedRecipe.total_cost_material.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-600">Mão de Obra</span>
                <span className="font-bold text-slate-800">
                  R$ {selectedRecipe.total_cost_labor.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-600">Custos Fixos</span>
                <span className="font-bold text-slate-800">
                  R$ {selectedRecipe.total_cost_overhead.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between py-3 mt-2 bg-slate-800 text-white px-4 rounded-lg">
                <span className="font-bold">Custo Total (Receita)</span>
                <span className="font-bold text-lg">
                  R$ {selectedRecipe.total_cost_final.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <span className="block text-xs font-bold text-slate-400 uppercase">
                    Rendimento
                  </span>
                  <span className="font-bold text-slate-800 text-lg">
                    {selectedRecipe.yield_units} <span className="text-xs font-normal">un</span>
                  </span>
                </div>
                <div className="text-center p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <span className="block text-xs font-bold text-amber-600 uppercase">
                    Custo Unitário
                  </span>
                  <span className="font-black text-amber-700 text-lg">
                    R$ {selectedRecipe.unit_cost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Direita: Simulador */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6 border-b pb-2">
              <TrendingUp className="text-blue-600" /> Simulador de Venda
            </h3>

            {/* Abas */}
            <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
              <button
                onClick={() => setMode('margin')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${mode === 'margin' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
              >
                Definir Margem
              </button>
              <button
                onClick={() => setMode('price')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${mode === 'price' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
              >
                Definir Preço Final
              </button>
            </div>

            <div className="space-y-6">
              {mode === 'margin' ? (
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="font-bold text-slate-700">Margem de Lucro</label>
                    <span
                      className={`font-bold ${isImpossibleMath ? 'text-red-600' : 'text-amber-600'}`}
                    >
                      {desiredMargin}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={desiredMargin}
                    onChange={(e) => setDesiredMargin(parseFloat(e.target.value))}
                    className={`w-full ${isImpossibleMath ? 'accent-red-500' : 'accent-amber-600'}`}
                  />
                  {isNearLimit && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} /> Atenção: margem muito alta deixa pouco espaço para
                      custos.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 mb-2 block">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-lg font-bold text-slate-800 outline-none focus:border-amber-500"
                    placeholder="0.00"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Impostos (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => handleNumberInput(e, setTaxRate)}
                    className="w-full mt-1 p-2 border rounded bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Taxa Cartão (%)
                  </label>
                  <input
                    type="number"
                    value={cardFee}
                    onChange={(e) => handleNumberInput(e, setCardFee)}
                    className="w-full mt-1 p-2 border rounded bg-slate-50"
                  />
                </div>
              </div>

              {isImpossibleMath ? (
                <div className="p-6 rounded-xl bg-red-50 border-2 border-red-100 text-center animate-pulse">
                  <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                  <h4 className="font-bold text-red-700 mb-1">Cálculo Impossível</h4>
                  <p className="text-sm text-red-600 mb-2">
                    Margem ({desiredMargin}%) + Taxas ({totalTaxAndFees.toFixed(2)}%) ={' '}
                    <b>{(desiredMargin + totalTaxAndFees).toFixed(2)}%</b>
                  </p>
                  <p className="text-xs text-red-500">
                    A soma ultrapassa 100% do preço de venda. <br />
                    Diminua a margem ou as taxas.
                  </p>
                </div>
              ) : (
                <div
                  className={`p-6 rounded-xl border-2 transition-all ${realMargin < 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-xs font-bold uppercase text-slate-500 mb-1">
                        {mode === 'margin' ? 'Preço Sugerido' : 'Margem Resultante'}
                      </div>
                      <div className="text-4xl font-black text-slate-800 tracking-tight">
                        R$ {sellingPrice.toFixed(2)}
                        <span className="text-sm font-normal text-slate-500 ml-2">/ un</span>
                      </div>

                      {(selectedRecipe.selling_price || 0) > 0 && (
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Info size={12} /> Salvo anteriormente: R${' '}
                          {selectedRecipe.selling_price?.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm border-t border-slate-200/50 pt-4">
                    <div className="flex justify-between text-slate-600">
                      <span>Custo Unitário:</span>
                      <span>R$ {selectedRecipe.unit_cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Taxas ({totalTaxAndFees.toFixed(2)}%):</span>
                      <span>- R$ {((sellingPrice * totalTaxAndFees) / 100).toFixed(2)}</span>
                    </div>
                    <div
                      className={`flex justify-between font-bold text-lg pt-2 ${profitValue > 0 ? 'text-green-600' : 'text-red-500'}`}
                    >
                      <span>Lucro Real:</span>
                      <span>R$ {profitValue.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSavePrice}
                    disabled={saving || sellingPrice <= 0}
                    className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-slate-900/10 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Salvar este Preço
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-600 font-medium">Nenhuma receita selecionada</h3>
          <p className="text-slate-400 text-sm">Escolha uma receita para começar.</p>
        </div>
      )}
    </div>
  );
};