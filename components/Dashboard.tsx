import React, { useState, useEffect } from 'react';
import { IngredientService } from '../services/ingredientService';
import { RecipeService } from '../services/recipeService';
import { SettingsService } from '../services/settingsService';
import { FixedCostService } from '../services/fixedCostService';
import { FinancialService } from '../services/financialService';
import {
  ChefHat,
  Package,
  DollarSign,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as IconPieChart,
  BarChart3,
  Download,
  FileSpreadsheet,
  Calendar,
  HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Recipe } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

interface Props {
  onNavigate?: (view: 'recipes' | 'ingredients' | 'costs' | 'settings') => void;
}

const COLORS = ['#d97706', '#2563eb', '#16a34a', '#7c3aed'];

export const Dashboard: React.FC<Props> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // ESTADOS PARA TAXAS DINÂMICAS
  const [taxRate, setTaxRate] = useState(4.5);
  const [cardFee, setCardFee] = useState(3.99);

  const [metrics, setMetrics] = useState({
    recipeCount: 0,
    ingredientCount: 0,
    monthlyCost: 0,
    avgMargin: 0,
    breakEven: 0
  });

  // --- NOVO ESTADO FINANCEIRO ---
  const [financials, setFinancials] = useState({
    totalSales: 0,
    totalExpenses: 0,
    balance: 0
  });

  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);
  const [costDistribution, setCostDistribution] = useState<any[]>([]);
  const [topProfitableRecipes, setTopProfitableRecipes] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Função auxiliar para cálculo usando o estado atual (para exportação)
  const calculateNetProfitWithState = (sellingPrice: number, unitCost: number) => {
    if (!sellingPrice) return 0;
    const totalDeductions = sellingPrice * ((taxRate + cardFee) / 100);
    return sellingPrice - unitCost - totalDeductions;
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [ingredients, recipes, settings, fixedCosts, sales, expenses] = await Promise.all([
        IngredientService.getAll(),
        RecipeService.getAll(),
        SettingsService.get(),
        FixedCostService.getAll(),
        FinancialService.getSales(),    // <--- NOVO
        FinancialService.getExpenses()  // <--- NOVO
      ]);

      // --- CÁLCULO FINANCEIRO NOVO ---
      const totalSales = sales.reduce((acc, item) => acc + Number(item.amount), 0);
      const totalExpenses = expenses.reduce((acc, item) => acc + Number(item.amount), 0);

      setFinancials({
        totalSales,
        totalExpenses,
        balance: totalSales - totalExpenses
      });
      // -------------------------------

      // 1. ATUALIZA AS TAXAS COM O QUE VEM DO BANCO (OU USA PADRÃO)
      const currentTax = settings.default_tax_rate ?? 4.5;
      const currentFee = settings.default_card_fee ?? 3.99;

      setTaxRate(currentTax);
      setCardFee(currentFee);

      // 2. LÓGICA DE CUSTOS FIXOS
      const realFixedExpenses = fixedCosts.reduce((acc, c) => acc + Number(c.value), 0);
      const laborCost = settings.labor_monthly_cost;

      let totalMonthlyCost = 0;
      if (fixedCosts.length > 0) {
        totalMonthlyCost = realFixedExpenses + laborCost;
      } else {
        totalMonthlyCost = laborCost + (settings.estimated_monthly_revenue * (settings.fixed_overhead_rate / 100));
      }

      // 3. CÁLCULOS FINANCEIROS USANDO AS TAXAS LIDAS (currentTax/currentFee)
      const recipesWithPrice = recipes.filter(r => r.selling_price && r.selling_price > 0);

      const totalMargin = recipesWithPrice.reduce((acc, r) => {
        const price = r.selling_price || 1;

        // Cálculo inline para garantir uso das taxas atualizadas
        const totalDeductions = price * ((currentTax + currentFee) / 100);
        const netProfit = price - r.unit_cost - totalDeductions;

        const margin = (netProfit / price) * 100;
        return acc + margin;
      }, 0);

      const avgMargin = recipesWithPrice.length > 0 ? totalMargin / recipesWithPrice.length : 0;

      setMetrics({
        recipeCount: recipes.length,
        ingredientCount: ingredients.length,
        monthlyCost: totalMonthlyCost,
        breakEven: totalMonthlyCost,
        avgMargin: avgMargin
      });

      if (recipes.length > 0) {
        const totalMat = recipes.reduce((acc, r) => acc + r.total_cost_material, 0);
        const totalLab = recipes.reduce((acc, r) => acc + r.total_cost_labor, 0);
        const totalOver = recipes.reduce((acc, r) => acc + r.total_cost_overhead, 0);
        const grandTotal = totalMat + totalLab + totalOver;

        setCostDistribution([
          { name: 'Materiais', value: grandTotal ? (totalMat / grandTotal) * 100 : 0 },
          { name: 'Mão de Obra', value: grandTotal ? (totalLab / grandTotal) * 100 : 0 },
          { name: 'Custos Fixos', value: grandTotal ? (totalOver / grandTotal) * 100 : 0 },
        ]);
      }

      const sortedByProfit = [...recipes]
        .map(r => {
          // Replicando cálculo inline
          const price = r.selling_price || 0;
          const totalDeductions = price * ((currentTax + currentFee) / 100);
          const netProfit = price - r.unit_cost - totalDeductions;
          return {
            name: r.name.length > 15 ? r.name.substring(0, 15) + '...' : r.name,
            lucro: netProfit
          };
        })
        .sort((a, b) => b.lucro - a.lucro)
        .slice(0, 5);

      setTopProfitableRecipes(sortedByProfit);
      setRecentRecipes(recipes.slice(0, 3));

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    const allRecipes = await RecipeService.getAll();
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Relatório de Receitas (Lucro Líquido) - Custosys", 14, 15);
    doc.setFontSize(10);
    // CORREÇÃO: Usa o estado taxRate e cardFee
    doc.text(`Data: ${new Date().toLocaleDateString()} | Taxas aplicadas: ${(taxRate + cardFee).toFixed(2)}%`, 14, 22);

    const tableData = allRecipes.map(r => {
      const netProfit = calculateNetProfitWithState(r.selling_price || 0, r.unit_cost);
      return [
        r.name,
        `R$ ${r.unit_cost.toFixed(2)}`,
        `R$ ${r.selling_price?.toFixed(2) || '0.00'}`,
        `R$ ${netProfit.toFixed(2)}`
      ];
    });

    autoTable(doc, {
      head: [['Receita', 'Custo Prod.', 'Preço Venda', 'Lucro Líq.']],
      body: tableData,
      startY: 30,
    });

    doc.save('relatorio_lucro_liquido.pdf');
    toast.success('PDF gerado!');
  };

  const exportExcel = async () => {
    const allRecipes = await RecipeService.getAll();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório Financeiro');

    worksheet.columns = [
      { header: 'Receita', key: 'name', width: 30 },
      { header: 'Custo Produção', key: 'unit', width: 15, style: { numFmt: '"R$"#,##0.00' } },
      { header: 'Preço Venda', key: 'price', width: 15, style: { numFmt: '"R$"#,##0.00' } },
      { header: 'Taxas', key: 'taxes', width: 15, style: { numFmt: '"R$"#,##0.00' } },
      { header: 'Lucro Líquido', key: 'profit', width: 15, style: { numFmt: '"R$"#,##0.00' } },
      { header: 'Margem Líq %', key: 'margin', width: 15, style: { numFmt: '0.00%' } },
    ];

    worksheet.getRow(1).font = { bold: true };

    allRecipes.forEach(r => {
      const price = r.selling_price || 0;
      const netProfit = calculateNetProfitWithState(price, r.unit_cost);
      const taxesValue = price - r.unit_cost - netProfit;
      const margin = price > 0 ? netProfit / price : 0;

      worksheet.addRow({
        name: r.name,
        unit: r.unit_cost,
        price: price,
        taxes: taxesValue,
        profit: netProfit,
        margin: margin
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custosys_lucro_real_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Excel gerado!');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-amber-600 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-amber-600" /> Dashboard Gerencial
          </h2>
          {/* TEXTO DINÂMICO AQUI */}
          <p className="text-slate-500">Indicadores de Lucro Líquido (Taxas Config: {(taxRate + cardFee).toFixed(2)}%)</p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="text-xs font-medium bg-white border border-slate-200 text-slate-500 px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span className="capitalize">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          <div className="flex gap-2">
            <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition text-sm font-bold shadow-sm">
              <Download size={16} /> PDF
            </button>
            <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition text-sm font-bold shadow-sm">
              <FileSpreadsheet size={16} /> Excel
            </button>
          </div>
        </div>
      </div>

      {/* === NOVO PAINEL FINANCEIRO (MIGRAÇÃO CRM) === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-left duration-500">

        {/* CARD RECEITAS (VENDAS) */}
        <div onClick={() => onNavigate?.('sales')} className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 cursor-pointer hover:shadow-md transition group">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Entradas</span>
          </div>
          <div className="text-3xl font-bold text-emerald-700">
            {financials.totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">Vendas Totais</div>
        </div>

        {/* CARD DESPESAS */}
        <div onClick={() => onNavigate?.('expenses')} className="bg-white p-6 rounded-xl shadow-sm border border-rose-100 cursor-pointer hover:shadow-md transition group">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-100 transition">
              <TrendingDown size={24} />
            </div>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">Saídas</span>
          </div>
          <div className="text-3xl font-bold text-rose-700">
            {financials.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">Despesas Totais</div>
        </div>

        {/* CARD SALDO */}
        <div className={`p-6 rounded-xl shadow-sm border transition group relative overflow-hidden ${financials.balance >= 0
            ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-600 text-white'
            : 'bg-gradient-to-br from-red-600 to-red-700 border-red-600 text-white'
          }`}>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <div className="p-2 bg-white/20 rounded-lg">
              <Wallet size={24} className="text-white" />
            </div>
            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full text-white">Balanço</span>
          </div>
          <div className="text-3xl font-bold text-white relative z-10">
            {financials.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <div className="text-xs text-blue-100 font-medium mt-1 relative z-10">Saldo em Caixa</div>

          {/* Efeito de fundo */}
          <Wallet size={100} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
        </div>
      </div>

      <div className="border-t border-slate-200 my-2"></div>

      {/* Título para separar as seções */}
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-[-10px]">Indicadores Operacionais</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div onClick={() => onNavigate?.('recipes')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer group">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition">
              <ChefHat size={20} />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+ Ativo</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{metrics.recipeCount}</div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Receitas</div>
        </div>

        <div onClick={() => onNavigate?.('ingredients')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer group">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition">
              <Package size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800">{metrics.ingredientCount}</div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Insumos</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 transition group relative">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <div className="group/info relative cursor-help">
              <HelpCircle size={18} className="text-slate-300 hover:text-slate-500 transition-colors" />
              <div className="absolute right-0 w-64 p-3 bg-slate-800 text-slate-100 text-xs rounded-lg shadow-xl opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 -mt-24 mr-0 border border-slate-700">
                <p className="font-bold mb-1 text-white">Margem Líquida Estimada</p>
                {/* TEXTO DINÂMICO AQUI TAMBÉM */}
                Média de lucro real (%) descontando impostos ({taxRate}%) e taxas ({cardFee}%). Se estiver vermelho, seus preços não cobrem as taxas.
                <div className="absolute bottom-[-6px] right-2 w-3 h-3 bg-slate-800 transform rotate-45 border-r border-b border-slate-700"></div>
              </div>
            </div>
          </div>
          <div className={`text-3xl font-bold ${metrics.avgMargin >= 20 ? 'text-green-600' :
            metrics.avgMargin > 0 ? 'text-amber-500' :
              'text-red-500'
            }`}>
            {metrics.avgMargin.toFixed(0)}%
          </div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Margem Líq. Média</div>
        </div>

        <div onClick={() => onNavigate?.('settings')} className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 hover:shadow-xl transition cursor-pointer group relative">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-slate-800 text-amber-400 rounded-lg group-hover:scale-110 transition">
              <DollarSign size={20} />
            </div>
            <div className="group/cost relative cursor-help">
              <HelpCircle size={16} className="text-slate-600 hover:text-slate-400 transition-colors" />
              <div className="absolute right-0 w-60 p-3 bg-white text-slate-700 text-xs rounded-lg shadow-xl opacity-0 group-hover/cost:opacity-100 transition-opacity pointer-events-none z-50 -mt-24 mr-0 border border-slate-200">
                <p className="font-bold mb-1 text-slate-900">Ponto de Equilíbrio</p>
                Soma de todas as Despesas Fixas + Mão de Obra. É o quanto você precisa faturar só para não ter prejuízo.
                <div className="absolute bottom-[-6px] right-2 w-3 h-3 bg-white transform rotate-45 border-r border-b border-slate-200"></div>
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-white">R$ {metrics.monthlyCost.toFixed(0)}</div>
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Custo Fixo Total (Mensal)</div>
        </div>
      </div>

      {/* ÁREA DE GRÁFICOS E LISTAS (MANTIDA IGUAL) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <IconPieChart size={18} className="text-amber-500" /> Estrutura de Custos
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {costDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Impacto']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart3 size={18} className="text-green-600" /> Top 5 Mais Lucrativas (Líquido)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProfitableRecipes} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Lucro Real']} cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="lucro" fill="#16a34a" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" /> Últimas Receitas
            </h3>
            <button onClick={() => onNavigate?.('recipes')} className="text-sm text-amber-600 font-bold hover:underline">
              Ver todas
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentRecipes.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">Nenhuma receita cadastrada ainda.</div>
            ) : (
              recentRecipes.map((recipe) => (
                <div key={recipe.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center font-bold shadow-sm group-hover:bg-amber-200 transition">
                      {recipe.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-700">{recipe.name}</div>
                      <div className="text-xs text-slate-400">Rendimento: {recipe.yield_units} un</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-700">R$ {recipe.unit_cost.toFixed(2)}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Custo Unit.</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
            <ChefHat size={120} />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2 text-amber-400">Nova Receita</h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Precificação correta é a chave do lucro. Cadastre uma nova ficha técnica agora mesmo.
            </p>
          </div>
          <button onClick={() => onNavigate?.('recipes')} className="relative z-10 w-full py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition flex items-center justify-center gap-2 shadow-lg">
            <ChefHat size={18} /> Criar Ficha Técnica
          </button>
        </div>
      </div>
    </div>
  );
};