import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Expense } from '../types';
import { 
  TrendingDown, 
  Calendar, 
  Search, 
  Plus, 
  CreditCard, 
  Wallet, 
  Loader2,
  Trash2,
  AlertTriangle // Importante para o Modal
} from 'lucide-react';
import { toast } from 'sonner';

export function ExpensesView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Insumos',
    date: new Date().toISOString().split('T')[0]
  });

  // ESTADO DO MODAL DE EXCLUSÃO (IGUAL AO FINANCEIRO)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; desc: string }>({
    isOpen: false, id: null, desc: ''
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      toast.error('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  }

  // LÓGICA DE EXCLUSÃO NOVA (COM MODAL)
  const requestDelete = (expense: Expense) => {
    setDeleteModal({ isOpen: true, id: expense.id, desc: expense.description });
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', deleteModal.id);
      if (error) throw error;
      
      toast.success('Despesa excluída');
      setExpenses(expenses.filter(e => e.id !== deleteModal.id));
      setDeleteModal({ isOpen: false, id: null, desc: '' });
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    try {
      const { error } = await supabase.from('expenses').insert([{
          description: formData.description,
          amount: Number(formData.amount),
          category: formData.category,
          date: formData.date
        }]);

      if (error) throw error;
      toast.success('Despesa registrada!');
      setShowForm(false);
      setFormData({ description: '', amount: '', category: 'Insumos', date: new Date().toISOString().split('T')[0] });
      loadExpenses();
    } catch (error) {
      toast.error('Erro ao salvar despesa');
    }
  }

  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="animate-fade-in space-y-6 relative">
      
      {/*<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <TrendingDown className="text-rose-600" /> Despesas & Saídas 
          </h1>
          <p className="text-slate-500">Controle onde seu dinheiro está sendo gasto.</p>
        </div>
      </div>*/}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-rose-500 to-rose-700 rounded-2xl p-6 text-white shadow-lg shadow-rose-200">
          <div className="flex items-center gap-3 mb-2 opacity-90">
            <div className="p-2 bg-white/20 rounded-lg"><Wallet size={20} /></div>
            <span className="font-medium">Total Gasto</span>
          </div>
          <div className="text-3xl font-bold tracking-tight">
            R$ {totalExpenses.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Barra de Ações */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            placeholder="Buscar despesa..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-rose-500 transition"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition"
        >
          <Plus size={20} /> Nova Despesa
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-rose-100 animate-in slide-in-from-top-4">
          <h3 className="font-bold text-lg mb-4 text-slate-700">Registrar Saída</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">Descrição</label>
              <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-rose-500" placeholder="Ex: Conta de Luz" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Valor (R$)</label>
              <input required type="number" step="0.01" className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-rose-500" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
              <input required type="date" className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-rose-500" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label>
              <select className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-rose-500" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option>Insumos</option>
                <option>Embalagens</option>
                <option>Contas Fixas</option>
                <option>Equipamentos</option>
                <option>Pessoal</option>
                <option>Outros</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Cancelar</button>
            <button type="submit" className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg">Salvar</button>
          </div>
        </form>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 flex justify-center"><Loader2 className="animate-spin text-rose-600"/></div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CreditCard size={48} className="mx-auto mb-2 opacity-20" />
            <p>Nenhuma despesa encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-bold text-slate-600 text-sm">Data</th>
                  <th className="p-4 font-bold text-slate-600 text-sm">Descrição</th>
                  <th className="p-4 font-bold text-slate-600 text-sm">Categoria</th>
                  <th className="p-4 font-bold text-slate-600 text-sm">Valor</th>
                  <th className="p-4 font-bold text-slate-600 text-sm text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(expense.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-800">{expense.description}</td>
                    <td className="p-4 text-sm">
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                        {expense.category}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-bold text-rose-600">
                      - R$ {expense.amount.toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => requestDelete(expense)} // CHAMA O MODAL AQUI
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        title="Excluir Despesa"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE EXCLUSÃO (NOVO - IGUAL AO FINANCEIRO) */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Excluir Despesa?</h3>
                <p className="text-sm text-slate-500 leading-tight mt-1">
                  Confirma a exclusão de <strong>"{deleteModal.desc}"</strong>? O valor será removido dos cálculos.
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
                className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition shadow-lg shadow-rose-600/20"
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