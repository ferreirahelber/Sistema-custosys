import React, { useState } from 'react';
import { SimulationParams } from '../types';
import { calculateSellingPrice, calculateMargin } from '../utils/calculations';
import { Calculator, Lock, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ResaleCalculator: React.FC = () => {
  const [costPrice, setCostPrice] = useState<string>('');
  const [productName, setProductName] = useState('');
  const [mode, setMode] = useState<'margin' | 'price'>('margin');

  const [params, setParams] = useState<SimulationParams>({
    tax_rate: 4.5, // Padrão MEI/Simples
    card_fee: 3.99, // Taxa média
    desired_margin: 30, // Margem de revenda padrão
  });

  const [manualPrice, setManualPrice] = useState<string>('');

  const cost = parseFloat(costPrice) || 0;
  
  // Limites matemáticos
  const totalTax = params.tax_rate + params.card_fee;
  const safeMarginLimit = Math.max(0, 99 - totalTax);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value === '' ? 0 : parseFloat(e.target.value);
    if (e.target.name === 'desired_margin' && val > safeMarginLimit) {
      val = safeMarginLimit;
    }
    setParams(prev => ({ ...prev, [e.target.name]: val }));
  };

  // Cálculos
  let finalPrice = 0;
  let finalMargin = 0;

  if (mode === 'margin') {
    finalMargin = params.desired_margin;
    finalPrice = calculateSellingPrice(cost, params.tax_rate, params.card_fee, params.desired_margin);
  } else {
    const priceNumber = parseFloat(manualPrice) || 0;
    finalPrice = priceNumber;
    finalMargin = calculateMargin(cost, priceNumber, params.tax_rate, params.card_fee);
  }

  const taxValue = finalPrice * (params.tax_rate / 100);
  const cardValue = finalPrice * (params.card_fee / 100);
  const profitValue = finalPrice * (finalMargin / 100);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="text-blue-600" /> Calculadora de Revenda
          </h1>
          <p className="text-slate-500">Calcule o preço de venda para produtos comprados prontos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUNA ESQUERDA: INPUTS */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Produto (Opcional)</label>
                <input
                  type="text"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  placeholder="Ex: Coca-Cola Lata"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Custo de Compra (R$)</label>
                <input
                  type="number"
                  value={costPrice}
                  onChange={e => setCostPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMode('margin')}
                className={`flex-1 py-2 rounded-lg font-medium transition ${mode === 'margin' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              >
                Definir Margem %
              </button>
              <button
                onClick={() => setMode('price')}
                className={`flex-1 py-2 rounded-lg font-medium transition ${mode === 'price' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              >
                Simular Preço R$
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mode === 'margin' ? (
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">Margem Desejada (%)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max={Math.floor(safeMarginLimit)}
                      name="desired_margin"
                      value={params.desired_margin}
                      onChange={handleChange}
                      className="flex-1 accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="w-16 text-right font-bold text-blue-700 text-xl">{params.desired_margin}%</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">Preço de Venda Final (R$)</label>
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={e => setManualPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border-b-2 border-blue-500 bg-white focus:outline-none text-2xl font-bold text-slate-800"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Impostos (%)</label>
                  <input
                    type="number"
                    name="tax_rate"
                    value={params.tax_rate}
                    onChange={handleChange}
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Taxa Cartão (%)</label>
                  <input
                    type="number"
                    name="card_fee"
                    value={params.card_fee}
                    onChange={handleChange}
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: RESULTADOS */}
        <div>
          <div className={`bg-white p-6 rounded-xl shadow-lg border-t-4 ${finalMargin < 0 ? 'border-red-500' : 'border-blue-500'} sticky top-6`}>
            <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-4">Resultado da Simulação</h3>
            
            <div className="text-center mb-8">
              <div className="text-sm text-slate-500 mb-1">Preço de Venda</div>
              <div className="text-5xl font-extrabold text-slate-900">
                <span className="text-2xl align-top text-slate-400 mr-1">R$</span>
                {finalPrice.toFixed(2)}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Custo do Produto</span>
                <span className="font-medium">- R$ {cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Impostos ({params.tax_rate}%)</span>
                <span className="font-medium text-red-400">- R$ {taxValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pb-3 border-b">
                <span>Taxa Cartão ({params.card_fee}%)</span>
                <span className="font-medium text-red-400">- R$ {cardValue.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-slate-700">Lucro Líquido</span>
                <div className="text-right">
                  <div className={`text-xl font-bold ${finalMargin < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    R$ {profitValue.toFixed(2)}
                  </div>
                  <div className={`text-xs font-bold ${finalMargin < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {finalMargin.toFixed(1)}% de margem
                  </div>
                </div>
              </div>
            </div>

            {finalMargin < 0 && (
              <div className="mt-6 p-3 bg-red-50 text-red-700 text-xs rounded-lg flex gap-2 items-center">
                <Lock size={16} /> Prejuízo! O preço não cobre os custos.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};