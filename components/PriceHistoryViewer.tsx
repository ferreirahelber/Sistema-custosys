import React, { useEffect, useState } from 'react';
import { PriceHistoryService } from '../services/priceHistoryService';
import { PriceHistory } from '../types';
import { History, TrendingUp, TrendingDown, Minus, Loader2, X, AlertCircle } from 'lucide-react';

interface Props {
  recipeId: string;
  onClose: () => void;
}

export const PriceHistoryViewer: React.FC<Props> = ({ recipeId, onClose }) => {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [recipeId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await PriceHistoryService.getByRecipeId(recipeId);
      setHistory(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (val: number) => `R$ ${Number(val).toFixed(2)}`;

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden animate-in slide-in-from-top-2">
      <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <History size={18} className="text-blue-600"/> Histórico de Alterações
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
      </div>
      
      <div className="max-h-60 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-400"/></div>
        ) : history.length === 0 ? (
          <div className="text-center py-6">
             <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
             <p className="text-sm text-slate-400">Nenhuma alteração registrada ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => {
              const costDiff = item.new_cost - item.old_cost;
              const isCostHigher = costDiff > 0;
              const isCostSame = Math.abs(costDiff) < 0.01;

              return (
                <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-sm">
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>{formatDate(item.changed_at)}</span>
                    {/* CORREÇÃO AQUI: Exibe o motivo real ou um padrão */}
                    <span className="uppercase font-bold tracking-wider text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                      {item.change_reason || 'Atualização Manual'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Variação de Custo */}
                    <div>
                      <span className="text-xs font-bold text-slate-500 block mb-1">Custo Total</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 line-through text-xs">{formatCurrency(item.old_cost)}</span>
                        <ArrowIcon diff={costDiff} />
                        <span className={`font-bold ${isCostHigher ? 'text-red-600' : isCostSame ? 'text-slate-600' : 'text-green-600'}`}>
                          {formatCurrency(item.new_cost)}
                        </span>
                      </div>
                    </div>

                    {/* Variação de Preço de Venda */}
                    <div>
                      <span className="text-xs font-bold text-slate-500 block mb-1">Preço Venda</span>
                      <div className="flex items-center gap-2">
                         <span className="font-bold text-slate-700">{formatCurrency(item.new_price)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const ArrowIcon = ({ diff }: { diff: number }) => {
  if (diff > 0.01) return <TrendingUp size={14} className="text-red-500" />;
  if (diff < -0.01) return <TrendingDown size={14} className="text-green-500" />;
  return <Minus size={14} className="text-slate-300" />;
};