import React, { useState, useEffect } from 'react';
import { PosService } from '../services/posService';
import { 
  BarChart3, Calendar, TrendingUp, ShoppingBag, CreditCard, ArrowUpRight 
} from 'lucide-react';
import { toast } from 'sonner';

export function PosReports() {
  const [loading, setLoading] = useState(false);
  
  // Datas iniciais: Primeiro e último dia do mês atual
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({ start: firstDay, end: lastDay });
  
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    loadReport();
  }, []); // Carrega ao abrir

  async function loadReport() {
    setLoading(true);
    try {
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

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in pb-20">
      
      {/* Cabeçalho e Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-amber-500" /> Relatórios de Vendas
          </h1>
          <p className="text-slate-500 text-sm">Análise de desempenho do PDV</p>
        </div>

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
                    // Cálculo simples para barra de progresso (baseado no item mais vendido)
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
                     // Calcula porcentagem do total
                     const percent = (total / report.summary.totalSales) * 100;
                     
                     // Cores dinâmicas
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