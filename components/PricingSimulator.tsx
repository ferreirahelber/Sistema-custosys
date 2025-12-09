import React, { useState } from 'react';
import { SimulationParams, Recipe } from '../types';
import { calculateSellingPrice } from '../utils/calculations';
import { Calculator, TrendingUp } from 'lucide-react';

interface Props {
  recipe: Recipe;
}

export const PricingSimulator: React.FC<Props> = ({ recipe }) => {
  const [params, setParams] = useState<SimulationParams>({
    tax_rate: 4.5, // Simples Nacional estimation
    card_fee: 3.99, // Common credit card fee
    desired_margin: 25 // Healthy net margin
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Handle empty string to prevent NaN error while typing
    const val = e.target.value;
    setParams(prev => ({ 
        ...prev, 
        [e.target.name]: val === '' ? 0 : parseFloat(val) 
    }));
  };

  const suggestedPrice = calculateSellingPrice(
    recipe.unit_cost,
    params.tax_rate,
    params.card_fee,
    params.desired_margin
  );

  // Breakdown of the suggested price
  const taxValue = suggestedPrice * (params.tax_rate / 100);
  const cardValue = suggestedPrice * (params.card_fee / 100);
  const profitValue = suggestedPrice * (params.desired_margin / 100);
  const costValue = recipe.unit_cost; 

  // Cost component breakdown (Per Unit)
  const unitMaterial = recipe.yield_units > 0 ? recipe.total_cost_material / recipe.yield_units : 0;
  const unitLabor = recipe.yield_units > 0 ? recipe.total_cost_labor / recipe.yield_units : 0;
  const unitFixed = recipe.yield_units > 0 ? recipe.total_cost_overhead / recipe.yield_units : 0;

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-6">
      <div className="flex items-center gap-2 mb-4 text-amber-700">
        <Calculator className="w-5 h-5" />
        <h3 className="font-bold text-lg">Simulador de Preço de Venda</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="flex justify-between text-sm font-medium text-slate-700 mb-1">
              <span>Margem de Lucro Líquida</span>
              <span className="text-amber-600">{params.desired_margin}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="60"
              name="desired_margin"
              value={params.desired_margin}
              onChange={handleChange}
              className="w-full accent-amber-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase">Impostos (%)</label>
              <input
                type="number"
                name="tax_rate"
                value={params.tax_rate}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 bg-white border rounded shadow-sm outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase">Taxa Cartão (%)</label>
              <input
                type="number"
                name="card_fee"
                value={params.card_fee}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 bg-white border rounded shadow-sm outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
           <div>
             <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Preço Sugerido de Venda</span>
             <div className="flex items-baseline gap-1">
               <span className="text-3xl font-bold text-slate-800">R$ {suggestedPrice.toFixed(2)}</span>
               <span className="text-sm text-slate-500">/unidade</span>
             </div>
           </div>

           <div className="mt-4 space-y-2 text-sm border-t pt-4">
             {/* Detailed Cost Breakdown */}
             <div className="pb-2 border-b border-dashed border-slate-200 mb-2">
                <div className="flex justify-between text-xs text-slate-500">
                    <span>- Matéria Prima:</span>
                    <span>R$ {unitMaterial.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                    <span>- Mão de Obra:</span>
                    <span>R$ {unitLabor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                    <span>- Custos Fixos:</span>
                    <span>R$ {unitFixed.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-semibold mt-1">
                    <span>Custo Total Prod.:</span>
                    <span>R$ {costValue.toFixed(2)}</span>
                </div>
             </div>

             <div className="flex justify-between text-slate-500">
               <span>Taxas + Impostos:</span>
               <span>- R$ {(taxValue + cardValue).toFixed(2)}</span>
             </div>
             <div className="flex justify-between font-bold text-green-600 text-base pt-2">
               <span className="flex items-center gap-1"><TrendingUp size={14}/> Lucro Real (no bolso):</span>
               <span>R$ {profitValue.toFixed(2)}</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};