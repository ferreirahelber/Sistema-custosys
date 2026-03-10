import React, { useState } from 'react';
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
  AlertTriangle,
  Loader2,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { Sale } from '../types';
import { useSales, useSaleMutations } from '../hooks/useFinancials';
import { SettingsService } from '../services/settingsService';
import { FinancialService } from '../services/financialService';
import { supabase } from '../services/supabase';

export function SalesView() {
  const { data: sales = [], isLoading: loading } = useSales();
  const { createSale, deleteSale } = useSaleMutations();

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
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Encomenda',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'Pix'
  });

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; desc: string }>({
    isOpen: false, id: null, desc: ''
  });

  const requestDelete = (sale: Sale) => {
    setDeleteModal({ isOpen: true, id: sale.id, desc: sale.description });
  };

  const executeDelete = async () => {
    if (deleteModal.id) {
      try {
        await deleteSale.mutateAsync(deleteModal.id);
        toast.success('Venda removida');
        setDeleteModal({ isOpen: false, id: null, desc: '' });
      } catch (error) {
        toast.error('Erro ao excluir');
      }
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    try {
      const amount = Number(formData.amount);
      const settings = await SettingsService.get();
      const { fee, net } = FinancialService.calculateTransactionFees(amount, formData.payment_method, settings);
      const user = (await supabase.auth.getUser()).data.user;

      await createSale.mutateAsync({
        description: formData.description,
        amount: amount,
        fee_amount: fee,
        net_amount: net,
        category: formData.category,
        date: formData.date,
        payment_method: formData.payment_method,
        user_id: user?.id,
      });

      if (fee > 0) {
        await FinancialService.recordTransactionFee(null, fee, formData.description, new Date().toISOString(), user?.id, user?.email);
      }

      toast.success('Venda registrada!');
      setShowForm(false);
      setFormData({ description: '', amount: '', category: 'Encomenda', date: new Date().toISOString().split('T')[0], payment_method: 'Pix' });
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

  const start = new Date(dateRange.start + 'T00:00:00');
  const end = new Date(dateRange.end + 'T23:59:59.999');

  const filteredSales = sales.filter(s => {
    const matchesSearch = s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase());

    const saleDate = s.created_at ? new Date(s.created_at) : new Date(s.date + 'T12:00:00');
    const saleTime = saleDate.getTime();
    const matchesDate = saleTime >= start.getTime() && saleTime <= end.getTime();

    return matchesSearch && matchesDate;
  });

  const totalGross = filteredSales.reduce((acc, curr) => acc + curr.amount, 0);
  const totalFees = filteredSales.reduce((acc, curr) => acc + (curr.fee_amount || 0), 0);
  const totalNet = filteredSales.reduce((acc, curr) => acc + (curr.net_amount || curr.amount), 0);

  const exportToExcel = () => {
    if (filteredSales.length === 0) return;

    const csvRows = [];
    csvRows.push(['RELATÓRIO DE ENTRADAS - CUSTOSYS']);
    csvRows.push([`Período: ${new Date(dateRange.start + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(dateRange.end + 'T12:00:00').toLocaleDateString('pt-BR')}`]);
    csvRows.push([]);

    csvRows.push(['RESUMO']);
    csvRows.push(['Venda Bruta', `R$ ${totalGross.toFixed(2).replace('.', ',')}`]);
    csvRows.push(['Taxas Pagas', `R$ ${totalFees.toFixed(2).replace('.', ',')}`]);
    csvRows.push(['Líquido em Caixa', `R$ ${totalNet.toFixed(2).replace('.', ',')}`]);
    csvRows.push([]);

    csvRows.push(['Data', 'Hora', 'Descrição', 'Categoria', 'Pagamento', 'Valor Bruto', 'Taxa', 'Valor Líquido']);

    filteredSales.forEach(sale => {
      const timeString = sale.created_at ? new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
      const dateStr = new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR');

      csvRows.push([
        dateStr,
        timeString,
        `"${(sale.description || '').replace(/"/g, '""')}"`,
        `"${sale.category || ''}"`,
        `"${sale.payment_method || '-'}"`,
        `R$ ${sale.amount.toFixed(2).replace('.', ',')}`,
        `R$ ${(sale.fee_amount || 0).toFixed(2).replace('.', ',')}`,
        `R$ ${(sale.net_amount || sale.amount).toFixed(2).replace('.', ',')}`
      ]);
    });

    const csvContent = "\uFEFF" + csvRows.map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `entradas_${dateRange.start}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    if (filteredSales.length === 0) return;

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Custosys - Relatório de Entradas", 14, 20);

    doc.setFontSize(10);
    doc.text(`Período: ${new Date(dateRange.start + 'T12:00:00').toLocaleDateString('pt-BR')} até ${new Date(dateRange.end + 'T12:00:00').toLocaleDateString('pt-BR')}`, 14, 28);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 33);

    doc.setFillColor(240, 240, 240);
    doc.rect(14, 40, 180, 25, 'F');

    doc.setFontSize(12);
    doc.text("Resumo do Período", 20, 50);

    doc.setFontSize(10);
    doc.text(`Venda Bruta: R$ ${totalGross.toFixed(2)}`, 20, 60);
    doc.text(`Taxas Pagas: R$ ${totalFees.toFixed(2)}`, 80, 60);
    doc.text(`Líquido em Caixa: R$ ${totalNet.toFixed(2)}`, 140, 60);

    autoTable(doc, {
      startY: 75,
      head: [['Data', 'Descrição', 'Categoria', 'Pgto', 'Bruto', 'Taxa', 'Líquido']],
      body: filteredSales.map(sale => [
        new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR'),
        sale.description,
        sale.category,
        sale.payment_method || '-',
        `R$ ${sale.amount.toFixed(2)}`,
        `R$ ${(sale.fee_amount || 0).toFixed(2)}`,
        `R$ ${(sale.net_amount || sale.amount).toFixed(2)}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }, // emerald-500
      styles: { fontSize: 8 }
    });

    doc.save(`entradas_${dateRange.start}.pdf`);
  };

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

      {/* Barra de Ações e Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">

        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
          <div className="relative w-full md:w-64 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar venda..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 ml-1 mb-1">Início</label>
              <input
                type="date"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 h-[42px]"
                value={dateRange.start}
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 ml-1 mb-1">Fim</label>
              <input
                type="date"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 h-[42px]"
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
              disabled={filteredSales.length === 0}
              className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50 h-[42px]"
              title="Exportar PDF"
            >
              <FileText size={16} className="text-rose-500" /> <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={exportToExcel}
              disabled={filteredSales.length === 0}
              className="flex items-center gap-1 px-3 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition disabled:opacity-50 h-[42px]"
              title="Exportar Excel"
            >
              <FileSpreadsheet size={16} /> <span className="hidden sm:inline">Excel</span>
            </button>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition h-[42px]"
          >
            <Plus size={20} /> <span className="hidden sm:inline">Nova Venda Manual</span><span className="sm:hidden">Nova Venda</span>
          </button>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-emerald-100 animate-in slide-in-from-top-4">
          <h3 className="font-bold text-lg mb-4 text-slate-700">Registrar Entrada</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">Descrição</label>
              <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500" placeholder="Ex: Bolo de Casamento - Maria" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Valor (R$)</label>
              <input required type="number" step="0.01" className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500" placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
              <input required type="date" className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Pagamento</label>
              <select className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500" value={formData.payment_method} onChange={e => setFormData({ ...formData, payment_method: e.target.value })}>
                <option>Pix</option>
                <option>Dinheiro</option>
                <option>Crédito</option>
                <option>Débito</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label>
              <select className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
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
          <div className="p-8 text-center text-slate-400 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>
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
                          {new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR')}
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
                          onClick={() => requestDelete(sale)}
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

      {/* MODAL DE EXCLUSÃO */}
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