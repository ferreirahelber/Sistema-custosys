import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Expense } from '../types';
import { TrendingDown, Calendar, Search, Plus, Trash2, Wallet, CreditCard, X, PieChart, FileText, FileSpreadsheet, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useExpenses, useExpenseMutations } from '../hooks/useFinancials';

interface ExtendedExpense extends Expense {
  user_email?: string;
}

export function ExpensesView() {
  const { data: expenses = [], isLoading: loading } = useExpenses();
  const { createExpense, deleteExpense } = useExpenseMutations();

  const formatLocalYYYYMMDD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const today = new Date();
  const firstDay = formatLocalYYYYMMDD(new Date(today.getFullYear(), today.getMonth(), 1));
  const lastDay = formatLocalYYYYMMDD(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const [dateRange, setDateRange] = useState({ start: firstDay, end: lastDay });
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

  const start = new Date(dateRange.start + 'T00:00:00');
  const end = new Date(dateRange.end + 'T23:59:59.999');

  const filteredExpenses = (expenses as ExtendedExpense[]).filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase());

    const expDate = e.created_at ? new Date(e.created_at) : new Date(e.date + 'T12:00:00');
    const expTime = expDate.getTime();
    const matchesDate = expTime >= start.getTime() && expTime <= end.getTime();

    return matchesSearch && matchesDate;
  });

  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const exportToExcel = () => {
    if (filteredExpenses.length === 0) return;

    const csvRows = [];
    csvRows.push(['RELATÓRIO DE SAÍDAS - CUSTOSYS']);
    csvRows.push([`Período: ${new Date(dateRange.start + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(dateRange.end + 'T12:00:00').toLocaleDateString('pt-BR')}`]);
    csvRows.push([]);

    csvRows.push(['RESUMO']);
    csvRows.push(['Total Gasto', `R$ ${totalExpenses.toFixed(2).replace('.', ',')}`]);
    csvRows.push([]);

    csvRows.push(['Data', 'Hora', 'Descrição', 'Categoria', 'Valor']);

    filteredExpenses.forEach(exp => {
      const timeString = exp.created_at ? new Date(exp.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
      const dateStr = exp.created_at ? new Date(exp.created_at).toLocaleDateString('pt-BR') : new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR');

      csvRows.push([
        dateStr,
        timeString,
        `"${(exp.description || '').replace(/"/g, '""')}"`,
        `"${exp.category || ''}"`,
        `R$ ${exp.amount.toFixed(2).replace('.', ',')}`
      ]);
    });

    const csvContent = "\uFEFF" + csvRows.map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `saidas_${dateRange.start}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    if (filteredExpenses.length === 0) return;

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Custosys - Relatório de Saídas", 14, 20);

    doc.setFontSize(10);
    doc.text(`Período: ${new Date(dateRange.start + 'T12:00:00').toLocaleDateString('pt-BR')} até ${new Date(dateRange.end + 'T12:00:00').toLocaleDateString('pt-BR')}`, 14, 28);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 33);

    doc.setFillColor(240, 240, 240);
    doc.rect(14, 40, 180, 25, 'F');

    doc.setFontSize(12);
    doc.text("Resumo do Período", 20, 50);

    doc.setFontSize(10);
    doc.text(`Total Gasto: R$ ${totalExpenses.toFixed(2)}`, 20, 60);

    autoTable(doc, {
      startY: 75,
      head: [['Data', 'Descrição', 'Categoria', 'Valor']],
      body: filteredExpenses.map(exp => [
        exp.created_at ? new Date(exp.created_at).toLocaleDateString('pt-BR') : new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR'),
        exp.description,
        exp.category,
        `R$ ${exp.amount.toFixed(2)}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72] }, // rose-600
      styles: { fontSize: 8 }
    });

    doc.save(`saidas_${dateRange.start}.pdf`);
  };

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
            <span className="text-3xl font-black">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">

        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
          <div className="relative w-full md:w-64 flex-shrink-0 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition" size={20} />
            <input
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-red-500 transition font-medium text-slate-600 placeholder:text-slate-400"
              placeholder="Buscar despesas..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 ml-1 mb-1">Início</label>
              <input
                type="date"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500 h-[42px]"
                value={dateRange.start}
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 ml-1 mb-1">Fim</label>
              <input
                type="date"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500 h-[42px]"
                value={dateRange.end}
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
          <div className="flex gap-2 border-r border-slate-200 pr-2 mr-2">
            <button
              onClick={exportToPDF}
              disabled={filteredExpenses.length === 0}
              className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50 h-[42px]"
              title="Exportar PDF"
            >
              <FileText size={16} className="text-rose-500" /> <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={exportToExcel}
              disabled={filteredExpenses.length === 0}
              className="flex items-center gap-1 px-3 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition disabled:opacity-50 h-[42px]"
              title="Exportar Excel"
            >
              <FileSpreadsheet size={16} /> <span className="hidden sm:inline">Excel</span>
            </button>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-red-600/20 active:scale-95 h-[42px]"
          >
            {showForm ? <X size={20} /> : <Plus size={20} />}
            <span className="hidden sm:inline">{showForm ? 'Cancelar' : 'Nova Despesa'}</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </div>
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
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Calendar size={14} className="text-slate-400" />
                      {expense.created_at ? new Date(expense.created_at).toLocaleDateString('pt-BR') : new Date(expense.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </div>
                    {expense.created_at && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock size={12} className="text-slate-300" />
                        {new Date(expense.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  {expense.category === 'Taxas de Venda' || expense.category === 'TAXAS FINANCEIRAS' ? (
                    <div>
                        <div className="font-bold text-slate-700 flex items-center gap-2">
                          <CreditCard size={14} className="text-rose-400"/> Taxa de Cartão (PDV)
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-1 pt-1 border-t border-slate-100">
                          {expense.description}
                        </div>
                    </div>
                  ) : (
                    <div className="font-bold text-slate-700">{expense.description}</div>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-lg uppercase tracking-wider ${expense.category === 'Taxas de Venda' || expense.category === 'TAXAS FINANCEIRAS' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                    {expense.category}
                  </span>
                </td>
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