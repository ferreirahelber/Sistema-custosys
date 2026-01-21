import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Wallet, 
  Clock,     
  QrCode,    
  Banknote,
  AlertTriangle, // Ícone para o modal
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface Sale {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  payment_method?: string;
  fee_amount?: number;
  net_amount?: number;
  created_at: string;
}

export function SalesView() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Encomenda',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'Pix'
  });

  // ESTADO DO MODAL DE EXCLUSÃO (NOVO)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; desc: string }>({
    isOpen: false, id: null, desc: ''
  });

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('date', { ascending: false })      
        .order('created_at', { ascending: false }); 

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  }

  // LÓGICA DE EXCLUSÃO NOVA (COM MODAL)
  const requestDelete = (sale: Sale) => {
    setDeleteModal({ isOpen: true, id: sale.id, desc: sale.description });
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const { error } = await supabase.from('sales').delete().eq('id', deleteModal.id);
      if (error) throw error;
      
      toast.success('Venda removida');
      setSales(sales.filter(s => s.id !== deleteModal.id)); // Atualiza localmente para ser mais rápido
      setDeleteModal({ isOpen: false, id: null, desc: '' });
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    try {
      const amount = Number(formData.amount);
      const { error } = await supabase.from('sales').insert([{
          description: formData.description,
          amount: amount,
          fee_amount: 0,
          net_amount: amount,
          category: formData.category,
          date: formData.date,
          payment_method: formData.payment_method
        }]);

      if (error) throw error;
      toast.success('Venda registrada!');
      setShowForm(false);
      setFormData({ description: '', amount: '', category: 'Encomenda', date: new Date().toISOString().split('T')[0], payment_method: 'Pix' });
      loadSales();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar venda');
    }
  }

  const getPaymentIcon = (method?: string) => {
    if (!method) return <CreditCard size={10} />;
    const m = method.toLowerCase();
    
    if (m.includes('pix')) return <QrCode size={10} className="text-emerald-500" />;
    if (m.includes('dinheiro')) return <Banknote size={10} className="text-green-600" />;
    if (m.includes('crédito') || m.includes('credito')) return <CreditCard size={10} className="text-orange-500" />;
    if (m.includes('débito') || m.includes('debito')) return <CreditCard size={10} className="text-blue-500" />;
    
    return <CreditCard size={10} />;
  };

  const filteredSales = sales.filter(s => 
    s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalGross = filteredSales.reduce((acc, curr) => acc + curr.amount, 0);
  const totalFees = filteredSales.reduce((acc, curr) => acc + (curr.fee_amount || 0), 0);
  const totalNet = filteredSales.reduce((acc, curr) => acc + (curr.net_amount || curr.amount), 0);

  return (
    <div className="animate-fade-in space-y-6 relative">
      
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financeiro: Entradas</h1>
          <p className="text-slate-500">Gerencie suas vendas e veja o líquido real.</p>
        </div>
        
        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
             <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Venda Bruta</p>
                <p className="text-2xl font-bold text-slate-700">R$ {totalGross.toFixed(2)}</p>
             </div>
             <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
                <Wallet size={24} />
             </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm flex items-center justify-between">
             <div>
                <p className="text-xs font-bold text-rose-400 uppercase mb-1">Taxas Pagas</p>
                <p className="text-2xl font-bold text-rose-600">- R$ {totalFees.toFixed(2)}</p>
             </div>
             <div className="p-3 bg-rose-50 rounded-lg text-rose-500">
                <CreditCard size={24} />
             </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between ring-1 ring-emerald-500/20">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Líquido em Caixa</p>
              <p className="text-2xl font-bold text-emerald-700">R$ {totalNet.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-emerald-200 rounded-lg text-emerald-700">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Ações */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por descrição ou categoria..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition"
        >
          <Plus size={20} /> Nova Venda Manual
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-emerald-100 animate-in slide-in-from-top-4">
          <h3 className="font-bold text-lg mb-4 text-slate-700">Registrar Entrada</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">Descrição</label>
              <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500" placeholder="Ex: Bolo de Casamento - Maria" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Valor (R$)</label>
              <input required type="number" step="0.01" className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
              <input required type="date" className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Pagamento</label>
              <select className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500" value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})}>
                <option>Pix</option>
                <option>Dinheiro</option>
                <option>Crédito</option>
                <option>Débito</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label>
              <select className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option>Encomenda</option>
                <option>Pronta Entrega</option>
                <option>Ifood/Delivery</option>
                <option>Outros</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Cancelar</button>
            <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg">Salvar</button>
          </div>
        </form>
      )}

      {/* Tabela de Vendas */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 flex justify-center"><Loader2 className="animate-spin text-emerald-600"/></div>
        ) : filteredSales.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <DollarSign size={48} className="mx-auto mb-2 opacity-20" />
            <p>Nenhuma venda encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-bold text-slate-600 text-sm">Data / Hora</th>
                  <th className="p-4 font-bold text-slate-600 text-sm">Descrição</th>
                  <th className="p-4 font-bold text-slate-600 text-sm">Categoria</th>
                  <th className="p-4 font-bold text-slate-600 text-sm">Valor Bruto</th>
                  <th className="p-4 font-bold text-slate-600 text-sm">Líquido (Recebido)</th>
                  <th className="p-4 font-bold text-slate-600 text-sm text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => {
                  const hasFee = sale.fee_amount && sale.fee_amount > 0;
                  const timeString = sale.created_at 
                    ? new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : '--:--';

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50 transition group">
                      
                      <td className="p-4 text-sm text-slate-500">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar size={14} />
                          {new Date(sale.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock size={12} />
                          {timeString}
                        </div>
                      </td>

                      <td className="p-4 font-medium text-slate-800">
                        {sale.description}
                        {sale.payment_method && (
                           <div className="text-[11px] text-slate-500 uppercase mt-1 flex items-center gap-1.5 font-semibold">
                             {getPaymentIcon(sale.payment_method)}
                             {sale.payment_method}
                           </div>
                        )}
                      </td>

                      <td className="p-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold
                          ${sale.category === 'Venda PDV' ? 'bg-emerald-100 text-emerald-700' : 
                            sale.category === 'Encomenda' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}
                        `}>
                          {sale.category}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-bold text-slate-500">
                        R$ {sale.amount.toFixed(2)}
                      </td>
                      <td className="p-4 text-sm">
                        {hasFee ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-emerald-600 text-base">
                                R$ {sale.net_amount?.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-rose-500 font-bold">
                                - R$ {sale.fee_amount?.toFixed(2)} (Taxa)
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-600">
                             R$ {sale.amount.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button 
                            onClick={() => requestDelete(sale)} // CHAMA O MODAL AQUI
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" 
                            title="Excluir Venda"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE EXCLUSÃO (ADICIONADO NO FINAL) */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Excluir Lançamento?</h3>
                <p className="text-sm text-slate-500 leading-tight mt-1">
                  Confirma a exclusão de <strong>"{deleteModal.desc}"</strong>? O valor será removido do caixa.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, id: null, desc: '' })} 
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDelete} 
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-lg shadow-red-600/20"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}