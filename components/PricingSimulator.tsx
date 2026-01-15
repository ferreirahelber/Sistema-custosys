import React, { useState } from 'react';
import { SimulationParams, Recipe } from '../types';
import { calculateSellingPrice, calculateMargin } from '../utils/calculations';
import { Calculator, Lock, HelpCircle } from 'lucide-react';

interface Props {
  recipe: Recipe | null;
  showHeader?: boolean;
}

export const PricingSimulator: React.FC<Props> = ({ recipe, showHeader = true }) => {
  const [mode, setMode] = useState<'margin' | 'price'>('margin');

  const [params, setParams] = useState<SimulationParams>({
    tax_rate: 4.5,
    card_fee: 3.99,
    desired_margin: 25,
  });

  const [manualPrice, setManualPrice] = useState<string | number>(0);

  // Calcula o Teto Matemático (Limite Seguro)
  const totalTax = params.tax_rate + params.card_fee;
  const safeMarginLimit = Math.max(0, 99 - totalTax);

  const safeUnitCost = recipe?.unit_cost || 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value === '' ? 0 : parseFloat(e.target.value);

    if (e.target.name === 'desired_margin') {
      if (val > safeMarginLimit) {
        val = safeMarginLimit;
      }
    }

    setParams((prev) => ({
      ...prev,
      [e.target.name]: val,
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

  const switchToPriceMode = () => {
    const currentCalculatedPrice = calculateSellingPrice(
      safeUnitCost,
      params.tax_rate,
      params.card_fee,
      params.desired_margin
    );
    setManualPrice(parseFloat(currentCalculatedPrice.toFixed(2)));
    setMode('price');
  };

  if (!recipe) {
    return (
      <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-300 mt-6 text-center transition-all duration-300">
        <Calculator className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-slate-500 font-medium">Aguardando seleção</h3>
        <p className="text-sm text-slate-400">
          Selecione uma receita acima para carregar o simulador.
        </p>
      </div>
    );
  }

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
    const priceNumber =
      typeof manualPrice === 'string' ? parseFloat(manualPrice) || 0 : manualPrice;
    finalPrice = priceNumber;
    finalMargin = calculateMargin(recipe.unit_cost, priceNumber, params.tax_rate, params.card_fee);
  }

  const taxValue = finalPrice * (params.tax_rate / 100);
  const cardValue = finalPrice * (params.card_fee / 100);
  const profitValue = finalPrice * (finalMargin / 100);

  const getProfitColor = (margin: number) => {
    if (margin < 0) return 'text-red-600';
    if (margin < 10) return 'text-orange-500';
    return 'text-green-600';
  };

  const isAtLimit = params.desired_margin >= Math.floor(safeMarginLimit);

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-6 transition-all duration-300">
      {showHeader && (
        <div className="flex items-center gap-2 text-amber-700 mb-6">
          <Calculator className="w-5 h-5" />
          <h3 className="font-bold text-lg">Simulador de Venda</h3>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Botões de Alternância */}
          <div className="bg-slate-200 p-1 rounded-lg flex text-sm font-medium w-fit">
            <button
              onClick={() => setMode('margin')}
              className={`px-4 py-1.5 rounded-md transition ${
                mode === 'margin'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Definir por Margem
            </button>
            <button
              onClick={switchToPriceMode}
              className={`px-4 py-1.5 rounded-md transition ${
                mode === 'price'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Definir por Preço
            </button>
          </div>

          {mode === 'margin' ? (
            <div
              className={`bg-white p-5 rounded-xl border shadow-sm ${
                isAtLimit ? 'border-orange-300 bg-orange-50' : 'border-slate-200'
              }`}
            >
              <div className="flex justify-between font-bold text-sm mb-2 items-center">
                <div className="flex items-center gap-2">
                   <span>Margem Líquida Alvo</span>
                   
                   {/* TOOLTIP EXPLICATIVO */}
                   <div className="group relative cursor-help">
                      <HelpCircle size={16} className="text-slate-400 hover:text-amber-600 transition"/>
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        <p className="font-bold mb-1 text-amber-400">Lucro Real no Bolso</p>
                        É a porcentagem que sobra LIMPA para você após pagar o custo da receita, os impostos e a taxa da maquininha.
                        <div className="absolute top-full left-2 w-3 h-3 bg-slate-800 transform rotate-45 -mt-2 border-r border-b border-slate-800"></div>
                      </div>
                   </div>
                </div>
                
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
                className={`w-full ${isAtLimit ? 'accent-orange-500' : 'accent-amber-600'}`}
              />

              <p className="text-xs text-slate-400 mt-2">
                {isAtLimit ? (
                  <span className="text-orange-600 font-bold flex items-center gap-1">
                    <Lock size={12} /> Limite técnico atingido
                  </span>
                ) : (
                  'Quanto você deseja ganhar líquido sobre a venda.'
                )}
              </p>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm">
              <label className="text-sm font-bold mb-2 block">Preço de Venda Manual (R$)</label>
              <input
                type="number"
                value={manualPrice}
                onChange={handlePriceChange}
                className="w-full text-3xl font-bold border-b-2 border-slate-200 focus:border-amber-500 outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Impostos (%)</label>
              <input
                type="number"
                name="tax_rate"
                value={params.tax_rate}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">
                Taxa Cartão (%)
              </label>
              <input
                type="number"
                name="card_fee"
                value={params.card_fee}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 border rounded-lg font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Card de Resultado (Direita) */}
        <div
          className={`bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between lg:sticky lg:top-6 ${
            finalMargin < 0 ? 'border-red-300 bg-red-50' : 'border-slate-200'
          }`}
        >
          <div className="flex items-start gap-6 h-full flex-col">
            <div className="w-full">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
                  Margem Líquida
                  <HelpCircle size={12} className="text-slate-300"/>
                </span>
                <span
                  className={`text-xl font-extrabold ${finalMargin < 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {finalMargin.toFixed(1)}%
                </span>
              </div>

              <div className="text-center py-2">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Preço Sugerido</div>
                <div className="text-4xl font-extrabold text-slate-900 leading-tight">
                  <span className="text-lg align-top mr-1 font-medium text-slate-500">R$</span>
                  {finalPrice.toFixed(2)}
                </div>
              </div>
              
              <div className="w-full mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                   <span>Custo Produção</span>
                   <span>R$ {recipe.unit_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                   <span>Impostos + Taxas</span>
                   <span className="text-red-400">- R$ {(taxValue + cardValue).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200">
                    <span className={`font-bold ${getProfitColor(finalMargin)}`}>Lucro Real (R$)</span>
                    <span className={`font-bold ${getProfitColor(finalMargin)} text-lg`}>
                      R$ {profitValue.toFixed(2)}
                    </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};