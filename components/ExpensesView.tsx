import React, { useState, useEffect } from 'react';
import { FinancialService } from '../services/financialService';
import { Expense } from '../types';
import { TrendingDown, Plus, Trash2, Calendar, Tag } from 'lucide-react';
import { toast } from 'sonner';

export function ExpensesView() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Geral',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const data = await FinancialService.getExpenses();
      setItems(data);
    } catch (error) {
      toast.error('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    try {
      await FinancialService.addExpense({
        description: formData.description,
        amount: Number(formData.amount),
        category: formData.category,
        date: formData.date
      });
      toast.success('Despesa adicionada!');
      setFormData({ ...formData, description: '', amount: '' });
      loadItems();
    } catch (error) {
      toast.error('Erro ao salvar despesa');
    }
  }

  async function handleDelete(id: string) {
    toast('Deseja excluir esta despesa?', {
      action: {
        label: 'Excluir',
        onClick: async () => {
          try {
            await FinancialService.deleteExpense(id);
            toast.success('Despesa removida com sucesso');
            loadItems();
          } catch (error) {
            toast.error('Erro ao remover');
          }
        },
      },
      cancel: {
        label: 'Cancelar',
      },
      duration: 4000,
    });
  }

  const total = items.reduce((acc, item) => acc + Number(item.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-rose-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Despesas</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">
                {/* CORREÇÃO AQUI: BRL e pt-BR */}
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg">
              <TrendingDown className="text-rose-600 w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-rose-600" /> Nova Despesa
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
              placeholder="Ex: Compra de Farinha"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
              placeholder="0.00"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>
          <div>
            <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2">
              <Plus size={18} /> Adicionar
            </button>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-white"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Geral">Geral</option>
              <option value="Ingredientes">Ingredientes</option>
              <option value="Embalagens">Embalagens</option>
              <option value="Contas Fixas">Contas Fixas</option>
              <option value="Pessoal">Pessoal</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
            <input
              type="date"
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="p-4">Data</th>
              <th className="p-4">Descrição</th>
              <th className="p-4">Categoria</th>
              <th className="p-4">Valor</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">A carregar...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma despesa registrada.</td></tr>
            ) : (
              items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 text-slate-600 flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    {item.date.split('-').reverse().join('/')}
                  </td>
                  <td className="p-4 font-medium text-slate-800">{item.description}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                      <Tag size={10} /> {item.category}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-rose-600">
                    {/* CORREÇÃO AQUI: BRL e pt-BR */}
                    - {Number(item.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}