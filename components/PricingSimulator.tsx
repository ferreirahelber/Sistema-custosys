import React, { useState, useEffect } from 'react';
import { SimulationParams, Recipe } from '../types';
import { calculateSellingPrice, calculateMargin } from '../utils/calculations';
import { Calculator, TrendingUp, RefreshCw, AlertCircle, Lock } from 'lucide-react';

interface Props {
  recipe: Recipe;
}

export const PricingSimulator: React.FC<Props> = ({ recipe }) => {
  const [mode, setMode] = useState<'margin' | 'price'>('margin');
  
  const [params, setParams] = useState<SimulationParams>({
    tax_rate: 4.5,
    card_fee: 3.99,
    desired_margin: 25
  });

  const [manualPrice, setManualPrice] = useState<string | number>(0);

  // Calcula o Teto Matemático (Limite Seguro)
  // Deixamos uma folga de 1% para evitar arredondamentos que causem divisão por zero
  const totalTax = params.tax_rate + params.card_fee;
  const safeMarginLimit = Math.max(0, 99 - totalTax);

  useEffect(() => {
    const initialPrice = calculateSellingPrice(recipe.unit_cost, params.tax_rate, params.card_fee, params.desired_margin);
    setManualPrice(parseFloat(initialPrice.toFixed(2)));
  }, [recipe.unit_cost]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value === '' ? 0 : parseFloat(e.target.value);
    
    // TRAVA DE SEGURANÇA (Freio ABS)
    // Se o usuário tentar arrastar a margem além do que a matemática permite,
    // nós forçamos o valor para o limite seguro.
    if (e.target.name === 'desired_margin') {
        if (val > safeMarginLimit) {
            val = safeMarginLimit;
        }
    }

    setParams(prev => ({ 
        ...prev, 
        [e.target.name]: val 
    }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
        setManualPrice('');
    } else {
        setManualPrice(val);
    }
  };

  // --- LÓGICA CENTRAL ---
  let finalPrice = 0;
  let finalMargin = 0;

  if (mode === 'margin') {
      finalMargin = params.desired_margin;
      finalPrice = calculateSellingPrice(
        recipe.unit_cost,
        params.tax_rate,
        params.card_fee,
        params.desired_margin
      );
  } else {
      const priceNumber = typeof manualPrice === 'string' ? parseFloat(manualPrice) || 0 : manualPrice;
      finalPrice = priceNumber;
      finalMargin = calculateMargin(
        recipe.unit_cost,
        priceNumber,
        params.tax_rate,
        params.card_fee
      );
  }

  // Breakdown
  const taxValue = finalPrice * (params.tax_rate / 100);
  const cardValue = finalPrice * (params.card_fee / 100);
  const profitValue = finalPrice * (finalMargin / 100);
  
  const unitMaterial = recipe.yield_units > 0 ? recipe.total_cost_material / recipe.yield_units : 0;
  const unitLabor = recipe.yield_units > 0 ? recipe.total_cost_labor / recipe.yield_units : 0;
  const unitFixed = recipe.yield_units > 0 ? recipe.total_cost_overhead / recipe.yield_units : 0;

  const getProfitColor = (margin: number) => {
      if (margin < 0) return 'text-red-600';
      if (margin < 10) return 'text-orange-500';
      return 'text-green-600';
  };

  // Verifica se estamos no limite máximo para mostrar aviso
  const isAtLimit = params.desired_margin >= Math.floor(safeMarginLimit);

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-6 transition-all duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-2 text-amber-700">
            <Calculator className="w-5 h-5" />
            <h3 className="font-bold text-lg">Simulador de Preço</h3>
          </div>
          
          <div className="bg-slate-200 p-1 rounded-lg flex text-sm font-medium">
              <button 
                onClick={() => setMode('margin')}
                className={`px-4 py-1.5 rounded-md transition ${mode === 'margin' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  Definir Margem
              </button>
              <button 
                onClick={() => setMode('price')}
                className={`px-4 py-1.5 rounded-md transition ${mode === 'price' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  Definir Preço Final
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          
          {mode === 'margin' ? (
              <div className={`bg-white p-4 rounded-lg border shadow-sm transition ${isAtLimit ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}>
                <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                  <span>Margem de Lucro Desejada</span>
                  <span className={isAtLimit ? 'text-orange-600' : 'text-amber-600'}>
                      {params.desired_margin.toFixed(1)}%
                  </span>
                </div>
                
                <input
                  type="range"
                  min="0"
                  max={Math.floor(safeMarginLimit)} 
                  name="desired_margin"
                  value={params.desired_margin}
                  onChange={handleChange}
                  className={`w-full mb-2 ${isAtLimit ? 'accent-orange-500' : 'accent-amber-600'}`}
                />
                
                <p className="text-xs text-slate-400">
                   {isAtLimit 
                     ? <span className="text-orange-600 font-bold flex items-center gap-1">
                        <Lock size={12}/> Limite Técnico Atingido (Taxas ocupam {totalTax.toFixed(2)}%)
                       </span>
                     : "Quanto você quer ganhar limpo sobre a venda."
                   }
                </p>
              </div>
          ) : (
              <div className="bg-white p-4 rounded-lg border border-amber-200 shadow-sm ring-2 ring-amber-50">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <RefreshCw size={14} className="text-amber-600"/> Preço de Venda Meta (R$)
                </label>
                <input
                  type="number"
                  value={manualPrice}
                  onChange={handlePriceChange}
                  className="w-full text-2xl font-bold text-slate-800 border-b-2 border-slate-200 focus:border-amber-500 outline-none py-1"
                />
                <p className="text-xs text-slate-400 mt-2">Digite por quanto você quer vender este produto.</p>
              </div>
          )}

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
        <div className={`bg-white p-5 rounded-lg border shadow-sm flex flex-col justify-between transition-colors ${finalMargin < 0 ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
           
           <div>
             <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                 {mode === 'margin' ? 'Preço Sugerido de Venda' : 'Resultado da Margem de Lucro'}
             </span>
             
             {mode === 'margin' ? (
                 <div className="flex items-baseline gap-1">
                    {finalPrice > 0 ? (
                        <>
                            <span className="text-3xl font-bold text-slate-800">R$ {finalPrice.toFixed(2)}</span>
                            <span className="text-sm text-slate-500">/unidade</span>
                        </>
                    ) : (
                        <span className="text-xl font-bold text-red-500 mt-1 flex items-center gap-2">
                             <AlertCircle size={20}/> Preço Impraticável
                        </span>
                    )}
                 </div>
             ) : (
                 <div className="flex items-baseline gap-1 mt-1">
                    <span className={`text-3xl font-bold ${getProfitColor(finalMargin)}`}>
                        {finalMargin.toFixed(1)}%
                    </span>
                    {finalMargin < 0 && (
                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full flex items-center gap-1">
                            <AlertCircle size={12}/> PREJUÍZO
                        </span>
                    )}
                 </div>
             )}
           </div>

           <div className="mt-4 space-y-2 text-sm border-t pt-4 border-slate-100">
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
                    <span>R$ {recipe.unit_cost.toFixed(2)}</span>
                </div>
             </div>

             <div className="flex justify-between text-slate-500">
               <span>Taxas + Impostos:</span>
               <span>- R$ {(taxValue + cardValue).toFixed(2)}</span>
             </div>
             
             <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-100 mt-2">
               <span className={`flex items-center gap-1 ${getProfitColor(finalMargin)}`}>
                   <TrendingUp size={14}/> Lucro Real:
               </span>
               <span className={getProfitColor(finalMargin)}>
                   R$ {profitValue.toFixed(2)}
                   {mode === 'margin' && <span className="text-xs opacity-75 font-normal ml-1">({finalMargin.toFixed(1)}%)</span>}
               </span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};