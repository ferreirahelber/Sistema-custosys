import React, { useState, useEffect } from 'react';
import { PriceHistory } from '../types';
import { PriceHistoryService } from '../services/priceHistoryService';
import { RecipeService } from '../services/recipeService';
import { X, TrendingUp, ArrowRight, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  recipeId: string;
  onClose: () => void;
}

export function PriceHistoryViewer({ recipeId, onClose }: Props) {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados para Novo Preço
  const [currentRecipeData, setCurrentRecipeData] = useState<{cost: number, price: number} | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadData();
  }, [recipeId]);

  async function loadData() {
    setLoading(true);
    try {
      console.log("Carregando dados para receita:", recipeId);
      const [histData, recipeData] = await Promise.all([
        PriceHistoryService.getByRecipeId(recipeId),
        RecipeService.getById(recipeId)
      ]);
      
      setHistory(histData || []);
      if (recipeData) {
        setCurrentRecipeData({
          cost: recipeData.unit_cost || 0,
          price: recipeData.selling_price || 0
        });
      }
    } catch (error: any) {
      console.error("Erro no loadData:", error);
      toast.error('Erro ao carregar dados iniciais.');
    } finally {
      setLoading(false);
    }
  }

  const handleSaveNewPrice = async () => {
    if (!newPrice || !currentRecipeData) return;
    
    // Tratamento robusto de número (vírgula/ponto)
    const priceNum = parseFloat(newPrice.replace(',', '.'));
    
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Por favor, digite um número válido para o preço.');
      return;
    }

    setSaving(true);
    try {
      // 1. Salva no histórico de preços
      await PriceHistoryService.addEntry({
        recipe_id: recipeId,
        old_cost: currentRecipeData.cost,
        new_cost: currentRecipeData.cost,
        old_price: currentRecipeData.price,
        new_price: priceNum,
        change_reason: reason || 'Atualização manual'
      });

      // Se passou daqui, deu certo
      toast.success('Preço atualizado com sucesso!');
      setNewPrice('');
      setReason('');
      
      // 3. Atualiza a interface imediatamente
      setCurrentRecipeData(prev => prev ? { ...prev, price: priceNum } : null);
      
      // 4. Recarrega o histórico
      loadData(); 

    } catch (error: any) {
      console.error("Erro ao salvar preço:", error);
      
      // Mostra mensagem de erro amigável
      const errorMsg = error?.message || 'Erro desconhecido ao salvar';
      toast.error(`Erro ao salvar: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const percentChange = currentRecipeData && newPrice 
    ? (((parseFloat(newPrice.replace(',', '.')) - currentRecipeData.price) / currentRecipeData.price) * 100).toFixed(1)
    : '0';

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
          
          {/* SEÇÃO DE ALTERAÇÃO DE PREÇO */}
          <div className="bg-white border-2 border-amber-200 rounded-xl p-4 shadow-md">
            <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={14} className="text-amber-600" /> Alterar Preço de Venda
            </h4>
            
            <div className="flex items-center justify-between mb-4 bg-gradient-to-r from-slate-50 to-amber-50 p-3 rounded-lg border border-slate-100">
               <div className="text-center flex-1">
                 <span className="block text-xs text-slate-400 font-semibold">Preço Atual</span>
                 <span className="font-bold text-slate-700 text-lg">R$ {currentRecipeData?.price?.toFixed(2) || '0.00'}</span>
               </div>
               <ArrowRight size={18} className="text-amber-400 mx-2" />
               <div className="text-center flex-1">
                 <span className="block text-xs text-amber-600 font-bold">Novo Preço</span>
                 <span className="font-bold text-amber-600 text-lg">
                    R$ {newPrice ? parseFloat(newPrice.replace(',', '.')).toFixed(2) : '...'}
                 </span>
                 {newPrice && (
                   <span className={`text-xs font-semibold mt-1 inline-block px-2 py-0.5 rounded-full ${
                     parseFloat(newPrice.replace(',', '.')) > currentRecipeData!.price 
                       ? 'bg-green-100 text-green-700' 
                       : 'bg-red-100 text-red-700'
                   }`}>
                     {parseFloat(newPrice.replace(',', '.')) > currentRecipeData!.price ? '+' : ''}{percentChange}%
                   </span>
                 )}
               </div>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1 uppercase tracking-wider">Novo Preço (R$)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        value={newPrice}
                        onChange={e => setNewPrice(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveNewPrice()}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-700"
                        placeholder="0.00"
                        disabled={saving}
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1 uppercase tracking-wider">Motivo (Opcional)</label>
                    <input 
                        type="text" 
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveNewPrice()}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-slate-700"
                        placeholder="Ex: Aumento dos insumos..."
                        disabled={saving}
                    />
                </div>
                <button 
                    onClick={handleSaveNewPrice}
                    disabled={saving || !newPrice}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                    {saving ? (
                        <>
                          <Loader2 className="animate-spin" size={18} /> 
                          Salvando...
                        </>
                    ) : (
                        <>
                          <Save size={18} /> Salvar Alteração
                        </>
                    )}
                </button>
            </div>
          </div>

          {/* SEÇÃO DE HISTÓRICO */}
          <div className="space-y-3">
             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
               <CheckCircle size={14} /> Registros Anteriores ({history.length})
             </h4>
             
             {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-amber-600" size={24}/>
                </div>
             ) : history.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm flex flex-col items-center">
                    <AlertCircle size={32} className="mb-2 opacity-30" />
                    <p>Nenhum histórico registrado.</p>
                    <p className="text-xs opacity-70 mt-1">Este será o primeiro preço cadastrado.</p>
                </div>
             ) : (
                history.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 hover:border-amber-200 hover:shadow-md transition relative pl-4 group"
                    >
                        <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${
                          item.new_price > item.old_price ? 'bg-green-400' : 'bg-red-400'
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
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              item.new_price > item.old_price 
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
                            <span className={`text-xs font-semibold ml-auto ${
                              item.new_price > item.old_price 
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