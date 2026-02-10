import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Expense } from '../types';
import { TrendingDown, Calendar, Search, Plus, Trash2, Wallet, CreditCard, X, PieChart } from 'lucide-react';
import { toast } from 'sonner';
import { useExpenses, useExpenseMutations } from '../hooks/useFinancials';

interface ExtendedExpense extends Expense {
  user_email?: string;
}

export function ExpensesView() {
  const { data: expenses = [], isLoading: loading } = useExpenses();
  const { createExpense, deleteExpense } = useExpenseMutations();

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ description: '', amount: '', category: 'Insumos', date: new Date().toISOString().split('T')[0] });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; desc: string }>({ isOpen: false, id: null, desc: '' });

  const executeDelete = async () => {
    if (deleteModal.id) {
      await deleteExpense.mutateAsync(deleteModal.id);
      setDeleteModal({ isOpen: false, id: null, desc: '' });
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    try {
      const user = (await supabase.auth.getUser()).data.user;
      await createExpense.mutateAsync({
        description: formData.description,
        amount: Number(formData.amount),
        category: formData.category,
        date: formData.date,
        user_id: user?.id,
      });
      toast.success('Despesa registrada!');
      setShowForm(false);
      setFormData({ description: '', amount: '', category: 'Insumos', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar despesa');
    }
  }

  const filteredExpenses = (expenses as ExtendedExpense[]).filter(e =>
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-8 animate-fade-in pb-12">


      <div className="w-full md:w-1/3">
        <div className="bg-rose-600 p-6 rounded-2xl shadow-lg shadow-rose-200 text-white relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10 rotate-12">
            <Wallet size={100} />
          </div>
          <div className="flex flex-col relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Wallet size={16} />
              </div>
              <span className="font-bold text-sm text-white/90">Total Gasto</span>
            </div>
            <span className="text-3xl font-black">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition" size={20} />
          <input
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-red-200 focus:shadow-sm transition font-medium text-slate-600 placeholder:text-slate-400"
            placeholder="Buscar despesas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-red-600/20 active:scale-95"
        >
          {showForm ? <X size={20} /> : <Plus size={20} />}
          <span className="hidden md:inline">{showForm ? 'Cancelar' : 'Nova Despesa'}</span>
          <span className="md:hidden">Nova</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-red-100 animate-in slide-in-from-top-4 backdrop-blur-sm relative overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
            <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
              <Plus size={20} className="text-red-500" /> Registrar Nova Saída
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Descrição</label>
                <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 transition font-medium"
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Ex: Compra de Embalagens" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Valor (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  <input required type="number" step="0.01" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 transition font-bold text-slate-700"
                    value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Data</label>
                <input required type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 transition font-medium text-slate-600"
                  value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 transition font-medium text-slate-600"
                  value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  <option>Insumos</option>
                  <option>Embalagens</option>
                  <option>Contas Fixas</option>
                  <option>Pessoal</option>
                  <option>Outros</option>
                </select>
              </div>
              <div className="lg:col-span-4 flex justify-end gap-3 mt-4 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-500/30">Salvar Despesa</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
              <th className="p-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center text-slate-400">Nenhuma despesa encontrada.</td></tr>
            ) : filteredExpenses.map(expense => (
              <tr key={expense.id} className="hover:bg-slate-50/50 transition group">
                <td className="p-4 text-slate-600 font-medium text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" /> {new Date(expense.date).toLocaleDateString()}
                  </div>
                </td>
                <td className="p-4 font-bold text-slate-700">{expense.description}</td>
                <td className="p-4"><span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg uppercase tracking-wider">{expense.category}</span></td>
                <td className="p-4 text-red-600 font-bold bg-red-50/10">- R$ {expense.amount.toFixed(2)}</td>
                <td className="p-4 text-right transition">
                  <button onClick={() => setDeleteModal({ isOpen: true, id: expense.id, desc: expense.description })} className="text-red-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Delete */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in-95 border border-slate-100">
            <h3 className="font-bold text-lg mb-2 text-slate-800">Apagar Registro?</h3>
            <p className="text-slate-500 mb-6 text-sm">Tem certeza que deseja apagar <strong>"{deleteModal.desc}"</strong>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteModal({ isOpen: false, id: null, desc: '' })} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-lg transition">Cancelar</button>
              <button onClick={executeDelete} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold shadow-lg shadow-red-500/20 transition">Confirmar Exclusão</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}