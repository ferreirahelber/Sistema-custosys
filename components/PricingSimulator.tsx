import React, { useState, useEffect } from 'react';
import { SimulationParams, Recipe } from '../types';
import { calculateSellingPrice, calculateMargin } from '../utils/calculations';
import { Calculator, TrendingUp, RefreshCw, AlertCircle, Lock } from 'lucide-react';

interface Props {
  // CORREÇÃO 1: Aceita null para quando não tiver selecionado nada
  recipe: Recipe | null;
  // Novo: controla se o cabeçalho interno deve ser exibido (útil quando o pai já renderiza um título)
  showHeader?: boolean;
}

export const PricingSimulator: React.FC<Props> = ({ recipe, showHeader = true }) => {
  const [mode, setMode] = useState<'margin' | 'price'>('margin');
  
  const [params, setParams] = useState<SimulationParams>({
    tax_rate: 4.5,
    card_fee: 3.99,
    desired_margin: 25
  });

  const [manualPrice, setManualPrice] = useState<string | number>(0);

  // Calcula o Teto Matemático (Limite Seguro)
  const totalTax = params.tax_rate + params.card_fee;
  const safeMarginLimit = Math.max(0, 99 - totalTax);

  // CORREÇÃO 2: Variável segura para evitar crash nos Hooks
  const safeUnitCost = recipe?.unit_cost || 0;

  useEffect(() => {
    // Usamos safeUnitCost para não tentar ler de 'null'
    const initialPrice = calculateSellingPrice(safeUnitCost, params.tax_rate, params.card_fee, params.desired_margin);
    setManualPrice(parseFloat(initialPrice.toFixed(2)));
  }, [safeUnitCost, params.tax_rate, params.card_fee, params.desired_margin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value === '' ? 0 : parseFloat(e.target.value);
    
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

  // CORREÇÃO 3: Se não tem receita, mostra aviso visual e para por aqui.
  // Isso impede que o código de baixo tente acessar dados inexistentes e quebre a tela.
  if (!recipe) {
    return (
      <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-300 mt-6 text-center transition-all duration-300">
         <Calculator className="w-10 h-10 text-slate-300 mx-auto mb-3" />
         <h3 className="text-slate-500 font-medium">Aguardando seleção</h3>
         <p className="text-sm text-slate-400">Selecione uma receita acima para carregar o simulador.</p>
      </div>
    );
  }

  // --- DAQUI PARA BAIXO É EXATAMENTE O SEU LAYOUT ORIGINAL ---
  
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
  
  // CORREÇÃO 4: Proteção matemática para não dividir por zero ou null
  const yieldUnits = recipe.yield_units || 1; 

  const unitMaterial = (recipe.total_cost_material || 0) / yieldUnits;
  const unitLabor = (recipe.total_cost_labor || 0) / yieldUnits;
  const unitFixed = (recipe.total_cost_overhead || 0) / yieldUnits;

  const getProfitColor = (margin: number) => {
      if (margin < 0) return 'text-red-600';
      if (margin < 10) return 'text-orange-500';
      return 'text-green-600';
  };

  const isAtLimit = params.desired_margin >= Math.floor(safeMarginLimit);

  return (
  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-6 transition-all duration-300">
    
    {/* HEADER */}
    {showHeader && (
      <div className="flex items-center gap-2 text-amber-700 mb-6">
        <Calculator className="w-5 h-5" />
        <h3 className="font-bold text-lg">Simulador de Venda</h3>
      </div>
    )}


    {/* GRID PRINCIPAL */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* ================= COLUNA ESQUERDA ================= */}
      <div className="lg:col-span-2 space-y-6">

        {/* TABS */}
        <div className="bg-slate-200 p-1 rounded-lg flex text-sm font-medium w-fit">
          <button 
            onClick={() => setMode('margin')}
            className={`px-4 py-1.5 rounded-md transition ${
              mode === 'margin'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Definir Margem
          </button>
          <button 
            onClick={() => setMode('price')}
            className={`px-4 py-1.5 rounded-md transition ${
              mode === 'price'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Definir Preço Final
          </button>
        </div>

        {/* CONTROLE PRINCIPAL */}
        {mode === 'margin' ? (
          <div className={`bg-white p-5 rounded-xl border shadow-sm ${
            isAtLimit ? 'border-orange-300 bg-orange-50' : 'border-slate-200'
          }`}>
            <div className="flex justify-between font-bold text-sm mb-2">
              <span>Margem de Lucro</span>
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
                  <Lock size={12}/> Limite técnico atingido
                </span>
              ) : (
                'Quanto você deseja ganhar líquido sobre a venda.'
              )}
            </p>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm">
            <label className="text-sm font-bold mb-2 block">
              Preço de Venda Desejado (R$)
            </label>
            <input
              type="number"
              value={manualPrice}
              onChange={handlePriceChange}
              className="w-full text-3xl font-bold border-b-2 border-slate-200 focus:border-amber-500 outline-none"
            />
          </div>
        )}

        {/* TAXAS */}
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
            <label className="text-xs font-medium text-slate-500 uppercase">Taxa Cartão (%)</label>
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

      {/* ================= COLUNA DIREITA ================= */}
      <div className={`bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between lg:sticky lg:top-6 ${
        finalMargin < 0 ? 'border-red-300 bg-red-50' : 'border-slate-200'
      }`}>

        <div className="flex items-start gap-6">
          {/* CONTROLES (resumo breve) */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Preço Sugerido de Venda
              </span>
              <span className={`text-sm font-semibold ${finalMargin < 0 ? 'text-red-600' : 'text-amber-700'}`}>
                {finalMargin.toFixed(1)}%
              </span>
            </div>

            <div className="mt-4">
              {/* Exibição compacta do preço para referência */}
              <div className="hidden md:block text-sm text-slate-500">Preço atual</div>
              <div className="mt-2 text-lg font-medium text-slate-700">R$ {finalPrice.toFixed(2)}</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-600">Custo</div>
                  <div className="font-medium">R$ {recipe.unit_cost.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">Taxas</div>
                  <div className="text-slate-600">- R$ {(taxValue + cardValue).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* PAINEL PRINCIPAL DE PREÇO */}
          <div className="w-48 md:w-56 lg:w-64 flex-shrink-0">
            <div className="bg-white border rounded-xl shadow p-4 flex flex-col items-center">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Preço</div>
              <div className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                <span className="text-lg align-top mr-1">R$</span>{finalPrice.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-1">/ unidade</div>

              <div className="w-full mt-4 border-t pt-3">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Custo</span>
                  <span>R$ {recipe.unit_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-2">
                  <span>Taxas +</span>
                  <span>- R$ {(taxValue + cardValue).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className={getProfitColor(finalMargin)}>Lucro Real</span>
                  <span className={`font-bold ${getProfitColor(finalMargin)} text-lg`}>R$ {profitValue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};