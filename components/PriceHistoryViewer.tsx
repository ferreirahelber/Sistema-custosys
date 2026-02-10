import React, { useState, useEffect } from 'react';
import { PriceHistory } from '../types';
import { PriceHistoryService } from '../services/priceHistoryService';
import { X, TrendingUp, ArrowRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  recipeId: string;
  onClose: () => void;
}

export function PriceHistoryViewer({ recipeId, onClose }: Props) {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [recipeId]);

  async function loadData() {
    setLoading(true);
    try {
      const histData = await PriceHistoryService.getByRecipeId(recipeId);
      setHistory(histData || []);
    } catch (error: any) {
      console.error("Erro no loadData:", error);
      toast.error('Erro ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/20 pointer-events-auto backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative h-full w-full max-w-md bg-white shadow-2xl pointer-events-auto flex flex-col animate-in slide-in-from-right duration-300">

        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-white">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-amber-600" size={20} /> Histórico de Preços
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* SEÇÃO DE HISTÓRICO */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
              <CheckCircle size={14} /> Registros Anteriores ({history.length})
            </h4>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-amber-600" size={24} />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm flex flex-col items-center">
                <AlertCircle size={32} className="mb-2 opacity-30" />
                <p>Nenhum histórico registrado.</p>
              </div>
            ) : (
              history.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 hover:border-amber-200 hover:shadow-md transition relative pl-4 group"
                >
                  <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${item.new_price > item.old_price ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>

                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-slate-500 font-semibold">
                      {new Date(item.changed_at).toLocaleDateString('pt-BR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${item.new_price > item.old_price
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                      }`}>
                      {item.new_price > item.old_price ? '↑ Aumento' : '↓ Redução'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-slate-500 line-through">R$ {item.old_price.toFixed(2)}</span>
                    <ArrowRight size={14} className="text-slate-300" />
                    <span className="text-base font-bold text-slate-800">R$ {item.new_price.toFixed(2)}</span>
                    <span className={`text-xs font-semibold ml-auto ${item.new_price > item.old_price
                        ? 'text-green-600'
                        : 'text-red-600'
                      }`}>
                      {item.new_price > item.old_price ? '+' : ''}{(((item.new_price - item.old_price) / item.old_price) * 100).toFixed(1)}%
                    </span>
                  </div>

                  {item.change_reason && (
                    <p className="text-xs text-slate-600 italic bg-white px-2 py-1 rounded border border-slate-100">
                      💬 {item.change_reason}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}