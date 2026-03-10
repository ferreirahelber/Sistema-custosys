import React, { useState, useEffect } from 'react';
import { Archive, Search, AlertTriangle, Plus, Tag, X, Save, ChevronDown, ChevronRight, Activity, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProductionStockService } from '../services/productionStockService';
import { ProductionStock, LossReason, UnifiedOutflow, ProductionHistory } from '../types';

export function ProductionStockPage() {
  const [stockItems, setStockItems] = useState<Array<ProductionStock & { recipes: { name: string; category: string } }>>([]);
  const [lossReasons, setLossReasons] = useState<LossReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [lossQuantity, setLossQuantity] = useState<number | ''>('');
  const [selectedReasonId, setSelectedReasonId] = useState<string>('');
  const [lossDescription, setLossDescription] = useState('');
  
  // Estado para Cadastro Rápido de Motivo
  const [isCreatingReason, setIsCreatingReason] = useState(false);
  const [newReasonLabel, setNewReasonLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados do Histórico em Acordeão (Por Linha)
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [rowHistories, setRowHistories] = useState<Record<string, {
    production: ProductionHistory[];
    losses: UnifiedOutflow[];
    loading: boolean;
  }>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [items, reasons] = await Promise.all([
        ProductionStockService.getAllStock(),
        ProductionStockService.getLossReasons()
      ]);
      setStockItems(items);
      setLossReasons(reasons);
    } catch (error) {
      toast.error('Erro ao carregar os dados de estoque.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleRegisterLoss = async () => {
    if (!selectedProductId) return toast.error('Selecione um produto.');
    if (!lossQuantity || Number(lossQuantity) <= 0) return toast.error('Informe uma quantidade válida.');
    if (!selectedReasonId) return toast.error('Selecione o motivo da perda.');

    setIsSubmitting(true);
    try {
      await ProductionStockService.registerLoss({
        product_id: selectedProductId,
        quantity: Number(lossQuantity),
        reason_id: selectedReasonId,
        description: lossDescription
      });
      toast.success('Perda registrada com sucesso! Estoque atualizado.');
      
      // Limpa dados e recarrega a tabela
      setIsModalOpen(false);
      setSelectedProductId('');
      setLossQuantity('');
      setSelectedReasonId('');
      setLossDescription('');
      
      loadData();
    } catch (error) {
      toast.error('Erro ao registrar a perda.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReason = async () => {
    if (!newReasonLabel.trim()) return toast.error('O nome do motivo não pode ser vazio.');
    
    setIsSubmitting(true);
    try {
      const newReason = await ProductionStockService.addLossReason(newReasonLabel);
      setLossReasons([...lossReasons, newReason]);
      setSelectedReasonId(newReason.id); // Seleciona automaticamente o novo motivo
      setIsCreatingReason(false);
      setNewReasonLabel('');
      toast.success('Motivo cadastrado com sucesso!');
    } catch (error) {
      toast.error('Erro ao cadastrar motivo.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRow = async (recipeId: string) => {
    const isExpanded = expandedRows.includes(recipeId);
    
    if (isExpanded) {
      setExpandedRows(expandedRows.filter(id => id !== recipeId));
      return;
    }

    setExpandedRows([...expandedRows, recipeId]);

    // Se ainda não carregou os dados pra essa linha, faz o fetch duplo
    if (!rowHistories[recipeId]) {
      setRowHistories(prev => ({
        ...prev,
        [recipeId]: { production: [], losses: [], loading: true }
      }));

      try {
        const [prodHistory, outflowHistory] = await Promise.all([
          ProductionStockService.getProductionHistoryByProduct(recipeId),
          ProductionStockService.getOutflowsByProduct(recipeId)
        ]);

        setRowHistories(prev => ({
          ...prev,
          [recipeId]: {
            production: prodHistory,
            losses: outflowHistory,
            loading: false
          }
        }));
      } catch (error) {
        console.error("Erro ao puxar históricos da linha:", error);
        toast.error("Erro ao carregar detalhes do produto.");
        setRowHistories(prev => ({
          ...prev,
          [recipeId]: { production: [], losses: [], loading: false }
        }));
      }
    }
  };

  const filteredItems = stockItems.filter(item => 
    item.recipes.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.recipes.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl flex items-center gap-3 font-bold text-slate-800">
            <Archive className="text-amber-600" size={32} />
            Estoque de Produção
          </h1>
          <p className="text-slate-500 mt-1">
            Gestão da prateleira de produtos acabados e registro de perdas.
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition shadow-md shadow-amber-600/20"
        >
          <AlertTriangle size={20} />
          Registrar Perda
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500">Carregando saldo do estoque...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-10">
            <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhum registro encontrado na prateleira.</p>
            <p className="text-slate-400 text-sm mt-1">O saldo é criado automaticamente ao produzir um lote usando a Calculadora de Custos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-4 px-4 font-bold text-slate-500 uppercase text-xs">Produto Acabado</th>
                  <th className="py-4 px-4 font-bold text-slate-500 uppercase text-xs">Categoria</th>
                  <th className="py-4 px-4 font-bold text-slate-500 uppercase text-xs text-right">Mínimo</th>
                  <th className="py-4 px-4 font-bold text-slate-500 uppercase text-xs text-right">Saldo Atual</th>
                  <th className="py-4 px-4 font-bold text-slate-500 uppercase text-xs text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => {
                  const isLowStock = item.quantity < item.min_quantity;
                  const isExpanded = expandedRows.includes(item.recipe_id);
                  const rowData = rowHistories[item.recipe_id];

                  return (
                    <React.Fragment key={item.id}>
                      <tr 
                        className={`hover:bg-slate-50 transition cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`}
                        onClick={() => toggleRow(item.recipe_id)}
                      >
                        <td className="py-4 px-4 font-bold text-slate-800 flex items-center gap-2">
                          <button className="text-slate-400 hover:text-amber-600 transition">
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                          {item.recipes.name}
                        </td>
                        <td className="py-4 px-4 text-slate-600 text-sm">
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-semibold">
                            {item.recipes.category || 'Geral'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-500 text-right font-medium">
                          {item.min_quantity} {item.unit}
                        </td>
                        <td className="py-4 px-4 text-slate-800 text-right font-bold">
                          <span className={isLowStock ? 'text-red-500' : 'text-emerald-600'}>
                              {item.quantity} {item.unit}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {isLowStock ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-bold">
                              <AlertTriangle size={12} /> Abaixo do Mínimo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold">
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                      
                      {/* ACORDEÃO DE HISTÓRICOS DA LINHA */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={5} className="p-0">
                            <div className="px-6 py-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                              {rowData?.loading ? (
                                <div className="flex items-center justify-center py-6 text-slate-500 gap-2">
                                  <Loader2 className="animate-spin" size={18} /> Carregando extrato...
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  
                                  {/* Coluna 1: Histórico de Produção (Entradas) */}
                                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                    <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                                      <TrendingUp className="text-emerald-500" size={18} /> 
                                      Entradas (Lotes Produzidos)
                                    </h4>
                                    
                                    {(!rowData?.production || rowData.production.length === 0) ? (
                                       <p className="text-sm text-slate-500 py-2 text-center">Nenhum lote fabricado registrado no sistema.</p>
                                    ) : (
                                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                        {rowData.production.map(prod => (
                                          <div key={prod.id} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded-lg">
                                            <div className="text-slate-600">
                                              {new Date(prod.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                            </div>
                                            <div className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                              +{prod.quantity} {prod.unit}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Coluna 2: Histórico de Avarias e Vendas (Saídas) */}
                                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                    <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                                      <TrendingDown className="text-red-500" size={18} /> 
                                      Extrato de Saídas (Vendas/Perdas)
                                    </h4>
                                    
                                    {(!rowData?.losses || rowData.losses.length === 0) ? (
                                       <p className="text-sm text-slate-500 py-2 text-center">Nenhuma saída registrada para este produto.</p>
                                    ) : (
                                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                        {rowData.losses.map(outflow => (
                                          <div key={outflow.id} className="flex flex-col text-sm p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 gap-1">
                                            <div className="flex justify-between items-center">
                                              <div className="text-slate-600">
                                                {new Date(outflow.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                              </div>
                                              <div className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                                                -{outflow.quantity}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                              {outflow.isSale ? (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                                  {outflow.reasonLabel}
                                                </span>
                                              ) : (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                                  {outflow.reasonLabel}
                                                </span>
                                              )}
                                              {outflow.description && (
                                                <span className="text-xs text-slate-500 truncate mt-0.5" title={outflow.description}>
                                                  {outflow.description}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE REGISTRO DE PERDAS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Registrar Perda</h3>
                  <p className="text-sm text-slate-500">Remova quantidades avariadas da prateleira.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Produto Acabado</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                >
                  <option value="">Selecione o produto avariado...</option>
                  {stockItems.map(item => (
                    <option key={item.recipe_id} value={item.recipe_id}>
                      {item.recipes.name} (Saldo Atual: {item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Quantidade Perdida</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono"
                      value={lossQuantity}
                      onChange={(e) => setLossQuantity(e.target.value !== '' ? Number(e.target.value) : '')}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-bold text-slate-700">Motivo</label>
                    <button 
                      onClick={() => setIsCreatingReason(!isCreatingReason)}
                      className="text-xs text-amber-600 font-bold hover:underline"
                    >
                      {isCreatingReason ? 'Cancelar' : '+ Novo Motivo'}
                    </button>
                  </div>
                  
                  {isCreatingReason ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: Caiu no chão..."
                        className="w-full bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        value={newReasonLabel}
                        onChange={e => setNewReasonLabel(e.target.value)}
                        autoFocus
                      />
                      <button 
                        onClick={handleCreateReason}
                        disabled={isSubmitting}
                        className="bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-xl"
                        title="Salvar novo motivo"
                      >
                        <Save size={18} />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedReasonId}
                      onChange={(e) => setSelectedReasonId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                    >
                      <option value="">Selecione...</option>
                      {lossReasons.map(reason => (
                        <option key={reason.id} value={reason.id}>{reason.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Observações Adicionais (Opcional)</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all min-h-[100px]"
                  placeholder="Detalhe o ocorrido..."
                  value={lossDescription}
                  onChange={(e) => setLossDescription(e.target.value)}
                />
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterLoss}
                disabled={isSubmitting}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-amber-600/20"
              >
                {isSubmitting ? 'Registrando...' : 'Confirmar Baixa'}
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
