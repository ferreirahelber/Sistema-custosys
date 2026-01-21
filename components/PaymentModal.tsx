import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calculator, ArrowRight, Banknote } from 'lucide-react';

interface PaymentModalProps {
  total: number;
  onConfirm: (receivedAmount: number, changeAmount: number) => void;
  onCancel: () => void;
}

export function PaymentModal({ total, onConfirm, onCancel }: PaymentModalProps) {
  const [received, setReceived] = useState('');
  const [change, setChange] = useState(0);

  // Calcula o troco automaticamente
  useEffect(() => {
    const val = Number(received);
    if (val >= total) {
      setChange(val - total);
    } else {
      setChange(0);
    }
  }, [received, total]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(received);
    if (val >= total) {
      onConfirm(val, change);
    }
  };

  // Atalhos para valores comuns (ex: R$ 50, R$ 100)
  const suggestions = [Math.ceil(total), Math.ceil(total / 10) * 10, 50, 100].filter(v => v >= total);
  // Remove duplicados e ordena
  const uniqueSuggestions = Array.from(new Set(suggestions)).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] animate-fade-in p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
        
        <button 
          onClick={onCancel} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <X size={24} />
        </button>

        <div className="p-6 bg-emerald-600 text-white text-center">
          <div className="mx-auto bg-emerald-500 w-12 h-12 rounded-full flex items-center justify-center mb-3">
            <Banknote size={24} />
          </div>
          <h2 className="text-2xl font-bold">Pagamento em Dinheiro</h2>
          <p className="text-emerald-100 mt-1">Total a Receber</p>
          <div className="text-4xl font-black mt-1">R$ {total.toFixed(2)}</div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Campo de Entrada */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Valor Recebido do Cliente
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">R$</span>
              <input
                type="number"
                step="0.01"
                required
                autoFocus
                className="w-full pl-12 pr-4 py-4 text-2xl font-bold text-slate-800 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none transition"
                placeholder="0.00"
                value={received}
                onChange={e => setReceived(e.target.value)}
              />
            </div>

            {/* Sugestões de valores */}
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {uniqueSuggestions.slice(0, 4).map(sug => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setReceived(sug.toString())}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold transition"
                >
                  R$ {sug.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          {/* Exibição do Troco */}
          <div className={`p-4 rounded-xl border-2 transition-colors ${
            Number(received) >= total 
              ? 'bg-emerald-50 border-emerald-100' 
              : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500 uppercase">Troco a Devolver</span>
              <span className={`text-2xl font-black ${
                Number(received) >= total ? 'text-emerald-600' : 'text-slate-300'
              }`}>
                R$ {change.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Botão Confirmar */}
          <button
            type="submit"
            disabled={!received || Number(received) < total}
            className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition text-lg"
          >
            <span>Finalizar Venda</span>
            <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}