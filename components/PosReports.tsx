import React, { useState, useEffect } from 'react';
import { PosService } from '../services/posService';
import { 
  BarChart3, TrendingUp, ShoppingBag, CreditCard, ArrowUpRight, FileText, FileSpreadsheet 
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function PosReports() {
  const [loading, setLoading] = useState(false);
  
  // Datas iniciais
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({ start: firstDay, end: lastDay });
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);
    try {
      // Tenta buscar o relatório (a função no service já lida com o "Cartão" legado)
      const data = await PosService.getSalesReport(dateRange.start, dateRange.end);
      setReport(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  }

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadReport();
  };

  // --- FUNÇÃO DE EXPORTAR EXCEL (CSV) ---
  const exportToExcel = () => {
    if (!report) return;

    const csvRows = [];
    csvRows.push(['RELATÓRIO DE VENDAS - DODOCE\'S']);
    csvRows.push([`Período: ${new Date(dateRange.start).toLocaleDateString('pt-BR')} a ${new Date(dateRange.end).toLocaleDateString('pt-BR')}`]);
    csvRows.push([]);

    csvRows.push(['RESUMO GERAL']);
    csvRows.push(['Faturamento Total', `R$ ${report.summary.totalSales.toFixed(2).replace('.', ',')}`]);
    csvRows.push(['Total de Pedidos', report.summary.totalOrders]);
    csvRows.push(['Ticket Médio', `R$ ${report.summary.averageTicket.toFixed(2).replace('.', ',')}`]);
    csvRows.push([]);

    csvRows.push(['VENDAS POR PAGAMENTO']);
    Object.entries(report.paymentMethods).forEach(([method, total]: [string, any]) => {
      csvRows.push([method, `R$ ${Number(total).toFixed(2).replace('.', ',')}`]);
    });
    csvRows.push([]);

    csvRows.push(['PRODUTOS MAIS VENDIDOS']);
    csvRows.push(['Produto', 'Quantidade', 'Total Vendido']);
    report.topProducts.forEach((prod: any) => {
      csvRows.push([
        `"${prod.name}"`,
        prod.quantity, 
        `R$ ${prod.total.toFixed(2).replace('.', ',')}`
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(";")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_vendas_${dateRange.start}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- FUNÇÃO DE EXPORTAR PDF ---
  const exportToPDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Dodoce's - Relatório de Vendas", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Período: ${new Date(dateRange.start).toLocaleDateString('pt-BR')} até ${new Date(dateRange.end).toLocaleDateString('pt-BR')}`, 14, 28);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 33);

    doc.setFillColor(240, 240, 240);
    doc.rect(14, 40, 180, 25, 'F');
    
    doc.setFontSize(12);
    doc.text("Resumo do Período", 20, 50);
    
    doc.setFontSize(10);
    doc.text(`Faturamento: R$ ${report.summary.totalSales.toFixed(2)}`, 20, 60);
    doc.text(`Pedidos: ${report.summary.totalOrders}`, 80, 60);
    doc.text(`Ticket Médio: R$ ${report.summary.averageTicket.toFixed(2)}`, 140, 60);

    doc.text("Top Produtos Mais Vendidos", 14, 80);
    
    autoTable(doc, {
      startY: 85,
      head: [['Produto', 'Qtd', 'Total (R$)']],
      body: report.topProducts.map((p: any) => [
        p.name, 
        p.quantity, 
        p.total.toFixed(2)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Vendas por Forma de Pagamento", 14, finalY);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Método', 'Valor Total (R$)']],
      body: Object.entries(report.paymentMethods).map(([method, total]: [string, any]) => [
        method,
        Number(total).toFixed(2)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85] },
    });

    doc.save(`relatorio_vendas_${dateRange.start}.pdf`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in pb-20">
      
      {/* Cabeçalho e Filtros */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-amber-500" /> Relatórios de Vendas
          </h1>
          <p className="text-slate-500 text-sm">Análise de desempenho do PDV</p>
        </div>

        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-end">
          {/* Botões de Exportação (CORRIGIDOS) */}
          <div className="flex gap-2">
            {/* Botão PDF: Estilo neutro, menor tamanho */}
            <button 
              onClick={exportToPDF}
              disabled={!report}
              className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition disabled:opacity-50 h-[34px]"
              title="Exportar PDF"
            >
              <FileText size={14} className="text-rose-500" /> PDF
            </button>
            
            {/* Botão Excel: Tamanho menor, label "Excel" */}
            <button 
              onClick={exportToExcel}
              disabled={!report}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-50 h-[34px]"
              title="Exportar para Excel"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
          </div>

          <div className="w-[1px] bg-slate-200 mx-2 hidden md:block h-[34px]"></div>

          {/* Filtro de Data */}
          <form onSubmit={handleFilter} className="flex items-end gap-2 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-500 ml-1 mb-1">Início</label>
              <input 
                type="date" 
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-amber-500"
                value={dateRange.start}
                onChange={e => setDateRange({...dateRange, start: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 ml-1 mb-1">Fim</label>
              <input 
                type="date" 
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-amber-500"
                value={dateRange.end}
                onChange={e => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
            <button 
              type="submit"
              className="bg-slate-800 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-slate-900 transition h-[34px]"
            >
              Filtrar
            </button>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Carregando dados...</div>
      ) : report ? (
        <div className="space-y-6">
          
          {/* CARDS DE RESUMO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                  <TrendingUp size={24} />
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
                  <ArrowUpRight size={12}/> Vendas
                </span>
              </div>
              <p className="text-slate-500 text-sm">Faturamento Total</p>
              <h3 className="text-3xl font-black text-slate-800">
                R$ {report.summary.totalSales.toFixed(2)}
              </h3>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <ShoppingBag size={24} />
                </div>
              </div>
              <p className="text-slate-500 text-sm">Total de Pedidos</p>
              <h3 className="text-3xl font-black text-slate-800">
                {report.summary.totalOrders}
              </h3>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <CreditCard size={24} />
                </div>
              </div>
              <p className="text-slate-500 text-sm">Ticket Médio</p>
              <h3 className="text-3xl font-black text-slate-800">
                R$ {report.summary.averageTicket.toFixed(2)}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* PRODUTOS MAIS VENDIDOS */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg text-slate-800 mb-6">🏆 Top Produtos Mais Vendidos</h3>
              <div className="space-y-4">
                {report.topProducts.length === 0 ? (
                  <p className="text-slate-400 text-sm">Nenhuma venda no período.</p>
                ) : (
                  report.topProducts.map((prod: any, index: number) => {
                    const maxQty = report.topProducts[0].quantity;
                    const percent = (prod.quantity / maxQty) * 100;
                    
                    return (
                      <div key={index} className="relative">
                        <div className="flex justify-between text-sm mb-1 relative z-10">
                          <span className="font-medium text-slate-700">
                            {index + 1}. {prod.name}
                          </span>
                          <span className="font-bold text-slate-900">
                            {prod.quantity} un
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-amber-400 h-2 rounded-full" 
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 text-right">
                          Total: R$ {prod.total.toFixed(2)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* FORMAS DE PAGAMENTO */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg text-slate-800 mb-6">💳 Vendas por Pagamento</h3>
              <div className="space-y-4">
                {Object.entries(report.paymentMethods).length === 0 ? (
                  <p className="text-slate-400 text-sm">Sem dados.</p>
                ) : (
                  Object.entries(report.paymentMethods).map(([method, total]: [string, any], index) => {
                     // Garante que não divide por zero
                     const totalSales = report.summary.totalSales || 1;
                     const percent = (total / totalSales) * 100;
                     
                     let colorClass = "bg-slate-400";
                     if(method.includes('Dinheiro')) colorClass = "bg-emerald-500";
                     if(method.includes('PIX')) colorClass = "bg-blue-500";
                     if(method.includes('Débito')) colorClass = "bg-cyan-500";
                     if(method.includes('Crédito')) colorClass = "bg-indigo-500";

                     return (
                      <div key={index} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className={`w-3 h-12 rounded ${colorClass}`}></div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-700 capitalize">{method}</span>
                            <span className="font-bold text-slate-900">R$ {total.toFixed(2)}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${percent}%` }}></div>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 text-right">{percent.toFixed(1)}%</p>
                        </div>
                      </div>
                     );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      ) : null}
    </div>
  );
}