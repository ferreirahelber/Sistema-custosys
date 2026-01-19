import React, { useState } from 'react';
import { X, DollarSign, Lock, ArrowLeft } from 'lucide-react'; // Adicionei ArrowLeft

interface CashModalProps {
  type: 'open' | 'close';
  onConfirm: (amount: number, notes: string) => void;
  onCancel?: () => void; // Já existia, mas vamos garantir o uso
  isProcessing: boolean;
}

export function CashModal({ type, onConfirm, onCancel, isProcessing }: CashModalProps) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(Number(amount), notes);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
        
        {/* Botão de Fechar (X) no topo - AGORA APARECE SEMPRE SE TIVER onCancel */}
        {onCancel && (
          <button 
            onClick={onCancel} 
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10 transition p-1 hover:bg-white/10 rounded-full"
            title="Cancelar e Sair"
          >
            <X size={24} />
          </button>
        )}

        {/* Cabeçalho */}
        <div className={`p-6 ${type === 'open' ? 'bg-emerald-600' : 'bg-slate-800'} text-white`}>
          <div className="flex justify-between items-center mb-2 pr-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              {type === 'open' ? <DollarSign /> : <Lock />}
              {type === 'open' ? 'Abertura de Caixa' : 'Fechamento de Caixa'}
            </h2>
          </div>
          <p className="text-white/80 text-sm">
            {type === 'open' 
              ? 'Informe o fundo de troco para iniciar as vendas.' 
              : 'Conte o dinheiro na gaveta para conferência.'}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              {type === 'open' ? 'Valor Inicial (Fundo de Troco)' : 'Valor Final (Em Dinheiro)'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                required
                autoFocus
                className="w-full pl-10 pr-4 py-3 text-xl font-bold text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Observações (Opcional)</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              rows={3}
              placeholder={type === 'open' ? "Ex: Troco trazido do cofre..." : "Ex: Sangria realizada..."}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            {/* Botão Cancelar Secundário */}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-3 rounded-lg font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
            )}
            
            <button
              type="submit"
              disabled={isProcessing || !amount}
              className={`flex-1 py-3 rounded-lg font-bold text-white transition flex justify-center items-center gap-2 ${
                type === 'open' 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              {isProcessing ? 'Processando...' : (type === 'open' ? 'Abrir Caixa' : 'Fechar Caixa')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}