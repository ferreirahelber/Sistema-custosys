import React, { useState } from 'react';
import { X, DollarSign, Lock, Calculator } from 'lucide-react';

interface CashModalProps {
  type: 'open' | 'close';
  onConfirm: (amount: number, notes: string) => void;
  onCancel?: () => void;
  isProcessing: boolean;
  summary?: {
    money: number;
    pix: number;
    debit: number;
    credit: number;
    total: number;
    initial: number;
  };
}

export function CashModal({ type, onConfirm, onCancel, isProcessing, summary }: CashModalProps) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(Number(amount), notes);
  };

  // Cálculo CLARO do que deve ter na gaveta (Físico)
  const expectedPhysical = summary ? (summary.initial + summary.money) : 0;
  
  // Cálculo da Diferença
  const difference = amount ? Number(amount) - expectedPhysical : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
        
        {onCancel && (
          <button 
            onClick={onCancel} 
            type="button"
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10 transition p-1 hover:bg-white/10 rounded-full cursor-pointer"
            title="Fechar"
          >
            <X size={24} />
          </button>
        )}

        {/* Cabeçalho */}
        <div className={`p-6 ${type === 'open' ? 'bg-emerald-600' : 'bg-slate-800'} text-white`}>
          <div className="flex justify-between items-center mb-2 pr-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              {type === 'open' ? <DollarSign /> : <Lock />}
              {type === 'open' ? 'Abertura de Caixa' : 'Conferência de Fechamento'}
            </h2>
          </div>
          <p className="text-white/80 text-sm">
            {type === 'open' ? 'Informe o fundo de troco.' : 'Confira os valores e conte a gaveta.'}
          </p>
        </div>

        {/* RESUMO DETALHADO */}
        {type === 'close' && summary && (
          <div className="bg-slate-50 p-4 border-b border-slate-200 text-sm">
             {/* 1. O Dinheiro Físico (Gaveta) */}
             <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3 shadow-sm">
               <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                 <DollarSign size={16} className="text-emerald-600"/> Dinheiro na Gaveta
               </h3>
               <div className="flex justify-between text-slate-600 mb-1">
                 <span>(+) Fundo Inicial:</span>
                 <span>R$ {summary.initial.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-emerald-600 font-bold mb-2">
                 <span>(+) Vendas em Dinheiro:</span>
                 <span>R$ {summary.money.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-slate-900 font-black text-base border-t border-slate-100 pt-2">
                 <span>(=) DEVE TER NA GAVETA:</span>
                 <span>R$ {expectedPhysical.toFixed(2)}</span>
               </div>
             </div>

             {/* 2. Outros Recebimentos (Apenas informativo) */}
             <div className="space-y-2 pl-2 border-l-2 border-slate-200 mb-4">
               <div className="flex justify-between text-blue-600">
                 <span>Vendas em PIX:</span>
                 <span className="font-bold">R$ {summary.pix.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-cyan-600">
                 <span>Cartão Débito:</span>
                 <span className="font-bold">R$ {summary.debit.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-indigo-600">
                 <span>Cartão Crédito:</span>
                 <span className="font-bold">R$ {summary.credit.toFixed(2)}</span>
               </div>
             </div>
             
             {/* 3. Total Geral em Destaque */}
             <div className="bg-slate-800 text-white p-3 rounded-lg flex justify-between items-center shadow-md">
                <span className="font-medium text-slate-300">Total Movimentado:</span>
                <span className="font-black text-xl">R$ {(summary.initial + summary.total).toFixed(2)}</span>
             </div>
          </div>
        )}

        {/* Formulário de Contagem */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              {type === 'open' ? 'Valor Inicial (Fundo de Troco)' : 'Quanto tem de dinheiro na gaveta AGORA?'}
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
            
            {/* Feedback Visual da Diferença */}
            {type === 'close' && amount !== '' && (
              <div className={`text-right text-xs font-bold mt-2 p-2 rounded ${
                difference === 0 ? 'bg-emerald-100 text-emerald-700' :
                difference > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
              }`}>
                {difference === 0 ? 'Caixa Batendo Perfeitamente! ✅' :
                 difference > 0 ? `Sobrando: R$ ${Math.abs(difference).toFixed(2)} ⚠️` : 
                 `Faltando: R$ ${Math.abs(difference).toFixed(2)} ❌`}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Observações</label>
            {/* CORREÇÃO APLICADA AQUI: resize-none */}
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={type === 'open' ? "Ex: Troco inicial..." : "Ex: Retirada de sangria, justificativa de quebra..."}
            />
          </div>

          <div className="flex gap-3 pt-2">
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
              className={`flex-1 py-3 rounded-lg font-bold text-white transition ${
                type === 'open' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'
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