import React, { useState, useEffect } from 'react';
import { useSettings, useSettingsMutations, useTeam, useTeamMutations } from '../hooks/useSystem';
import { FixedCostService } from '../services/fixedCostService'; // Maintaining service for FixedCosts as hooks might not exist or be different
import {
  Users,
  Calculator,
  Trash2,
  Plus,
  Save,
  Loader2,
  CheckCircle,
  Edit,
  X,
  PieChart,
  List,
  Download,
  Upload,
  Database,
  AlertTriangle,
  Percent,
  Info,
  Briefcase,
  CreditCard
} from 'lucide-react';
import { Settings, Employee, FixedCost } from '../types';
import { toast } from 'sonner';
import { BackupService } from '../services/backupService';

export const SettingsForm: React.FC = () => {
  // Hooks
  const { data: serverSettings, isLoading: isLoadingSettings } = useSettings();
  const { data: serverTeam = [], isLoading: isLoadingTeam } = useTeam();

  const { updateSettings } = useSettingsMutations();
  const { addMember, deleteMember, updateMember } = useTeamMutations();

  // Local State
  const [saving, setSaving] = useState(false);

  // --- DADOS DA EQUIPE ---
  // We use serverTeam directly for display, but local state for the form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', salary: '', hours: '' });

  // --- DADOS DOS CUSTOS FIXOS ---
  // FixedCostService likely doesn't have a hook equivalent in the context provided, so we keep using state and service
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [newCost, setNewCost] = useState({ name: '', value: '' });
  const [costMode, setCostMode] = useState<'manual' | 'detailed'>('manual');

  // Estados novos (Taxas de Venda)
  const [defaultTaxRate, setDefaultTaxRate] = useState(4.5);
  const [cardDebitRate, setCardDebitRate] = useState(1.60);
  const [cardCreditRate, setCardCreditRate] = useState(4.39);

  // NOVO: Estado para controlar a interface MEI
  const [isMei, setIsMei] = useState(false);

  const [fixedOverheadRate, setFixedOverheadRate] = useState(0);
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);

  // Load Data Effect
  useEffect(() => {
    if (serverSettings) {
      const tax = serverSettings.default_tax_rate ?? 4.5;
      setDefaultTaxRate(tax);
      setCardDebitRate(serverSettings.card_debit_rate ?? 1.60);
      setCardCreditRate(serverSettings.card_credit_rate ?? 4.39);

      if (tax === 0) setIsMei(true);

      setFixedOverheadRate(serverSettings.fixed_overhead_rate || 0);
      setEstimatedRevenue(serverSettings.estimated_monthly_revenue || 0);
    }

    // Load Fixed Costs (Manual Service Call)
    const loadFixedCosts = async () => {
      try {
        const costs = await FixedCostService.getAll();
        setFixedCosts(costs);
        if (costs.length > 0 && (!serverSettings?.fixed_overhead_rate || serverSettings.fixed_overhead_rate === 0)) {
          setCostMode('detailed');
        }
      } catch (error) {
        console.error(error);
      }
    }
    loadFixedCosts();
  }, [serverSettings]);

  // --- LÓGICA MEI ---
  const handleMeiChange = (isMeiChecked: boolean) => {
    setIsMei(isMeiChecked);
    if (isMeiChecked) {
      setDefaultTaxRate(0); // Zera o imposto % pois MEI paga fixo
    }
  };

  // Calculations
  const calculateMemberCPH = (salary: number, hours: number) => (hours > 0 ? salary / hours : 0);
  const calculateMemberCPM = (salary: number, hours: number) => hours > 0 ? salary / (hours * 60) : 0;

  const totalLaborCost = serverTeam.reduce((acc, curr) => acc + Number(curr.salary), 0);
  const totalHours = serverTeam.reduce((acc, curr) => acc + Number(curr.hours_monthly), 0);
  const globalCPH = serverTeam.reduce((acc, curr) => acc + calculateMemberCPH(curr.salary, curr.hours_monthly), 0);
  const globalCPM = serverTeam.reduce((acc, curr) => acc + calculateMemberCPM(curr.salary, curr.hours_monthly), 0);

  const totalFixedExpenses = fixedCosts.reduce((acc, curr) => acc + Number(curr.value), 0);
  const calculatedRate = estimatedRevenue > 0 ? (totalFixedExpenses / estimatedRevenue) * 100 : 0;

  // --- AÇÕES EQUIPE ---
  const handleEditClick = (member: any) => {
    setEditingId(member.id);
    setFormData({ name: member.name, salary: member.salary.toString(), hours: member.hours_monthly.toString() });
  };

  const handleCancelEdit = () => { setEditingId(null); setFormData({ name: '', salary: '', hours: '' }); };

  const handleSaveMember = async () => {
    if (!formData.name || !formData.salary || !formData.hours) { toast.warning('Preencha todos os campos.'); return; }
    try {
      setSaving(true);
      const payload = { name: formData.name, salary: parseFloat(formData.salary), hours_monthly: parseFloat(formData.hours) };

      if (editingId) {
        await updateMember.mutateAsync({ id: editingId, data: payload });
        toast.success('Atualizado!');
      } else {
        await addMember.mutateAsync(payload);
        toast.success('Adicionado!');
      }
      handleCancelEdit();
    } catch (e) { toast.error('Erro.'); } finally { setSaving(false); }
  };

  const handleRemoveMember = (id: string) => {
    const member = serverTeam.find((m) => m.id === id);
    const name = member ? member.name : 'este colaborador';

    toast.error(`Remover "${name}"?`, {
      description: 'Esta ação é irreversível.',
      action: {
        label: 'REMOVER',
        onClick: async () => {
          try {
            await deleteMember.mutateAsync(id);
            if (editingId === id) handleCancelEdit();
            toast.success('Colaborador removido.');
          } catch (e) {
            console.error(e);
            toast.error('Erro ao remover.');
          }
        },
      },
      cancel: { label: 'Cancelar' },
      duration: 5000,
    });
  };

  // --- AÇÕES CUSTOS (Usando Service diretamente pois não temos hooks para FixedCost aparentemente) ---
  const handleEditCost = (cost: FixedCost) => { setEditingCostId(cost.id!); setNewCost({ name: cost.name, value: cost.value.toString() }); };
  const handleCancelCostEdit = () => { setEditingCostId(null); setNewCost({ name: '', value: '' }); };

  const handleSaveCost = async () => {
    if (!newCost.name || !newCost.value) { toast.warning('Preencha os campos.'); return; }
    try {
      setSaving(true); const payload = { name: newCost.name, value: parseFloat(newCost.value) };
      if (editingCostId) { await FixedCostService.update(editingCostId, payload); toast.success('Atualizado!'); } else { await FixedCostService.add(payload); toast.success('Adicionado!'); }
      handleCancelCostEdit();
      const newCosts = await FixedCostService.getAll();
      setFixedCosts(newCosts);
    } catch (e) { toast.error('Erro.'); } finally { setSaving(false); }
  };

  const handleRemoveCost = (id: string) => {
    const cost = fixedCosts.find((c) => c.id === id);
    const name = cost ? cost.name : 'este custo';

    toast.error(`Remover "${name}"?`, {
      description: 'Esta ação não pode ser desfeita.',
      action: {
        label: 'EXCLUIR',
        onClick: async () => {
          try {
            await FixedCostService.delete(id);
            const newCosts = await FixedCostService.getAll();
            setFixedCosts(newCosts);
            if (editingCostId === id) handleCancelCostEdit();
            toast.success('Custo removido com sucesso.');
          } catch (e) {
            console.error(e);
            toast.error('Erro ao remover custo.');
          }
        },
      },
      cancel: { label: 'Cancelar' },
      duration: 5000,
    });
  };

  const applyCalculatedRate = () => { setFixedOverheadRate(parseFloat(calculatedRate.toFixed(2))); toast.info(`Taxa de ${calculatedRate.toFixed(2)}% aplicada!`); };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const settingsToSave = {
        labor_monthly_cost: totalLaborCost,
        work_hours_monthly: totalHours,
        fixed_overhead_rate: fixedOverheadRate,
        cost_per_minute: globalCPM,
        estimated_monthly_revenue: estimatedRevenue,
        default_tax_rate: defaultTaxRate,
        card_debit_rate: cardDebitRate,
        card_credit_rate: cardCreditRate,
      } as Settings;

      await updateSettings.mutateAsync(settingsToSave);
      toast.success('Configurações salvas!');
    } catch (error) { toast.error('Erro ao salvar.'); } finally { setSaving(false); }
  };

  const handleExport = async () => {
    try {
      const data = await BackupService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `custosys_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error('Erro ao exportar dados');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await BackupService.importData(text);
      toast.success('Dados restaurados com sucesso!');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error('Erro ao importar arquivo');
    }
  };

  if (isLoadingSettings || isLoadingTeam) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-amber-600" /></div>;

  return (
    <div className="space-y-8 w-full pb-12 animate-fade-in">
      {/* SEÇÃO 1: EQUIPE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-amber-600" size={20} />
            Colaboradores / Mão de Obra
          </h2>
          <p className="text-sm text-slate-500">Adicione quem trabalha na produção para compor o custo do minuto.</p>
        </div>
        <div className="p-6 space-y-6">
          <div className={`grid grid-cols-1 md:grid-cols-7 gap-4 items-end p-4 rounded-lg border transition-colors ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
            <div className="md:col-span-3">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Confeiteira Chefe" className="w-full mt-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Salário (R$)</label>
              <input type="number" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} placeholder="3000.00" className="w-full mt-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="md:col-span-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Horas/Mês</label>
              <input type="number" value={formData.hours} onChange={(e) => setFormData({ ...formData, hours: e.target.value })} placeholder="220" className="w-full mt-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="md:col-span-1 flex gap-2">
              <button onClick={handleSaveMember} disabled={saving} className={`flex-1 p-2.5 rounded-lg flex justify-center items-center text-white transition ${editingId ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                {saving ? <Loader2 size={20} className="animate-spin" /> : editingId ? <CheckCircle size={20} /> : <Plus size={20} />}
              </button>
              {editingId && <button onClick={handleCancelEdit} className="p-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600"><X size={20} /></button>}
            </div>
          </div>
          {/* Tabela Equipe */}
          <div className="border border-slate-100 rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                <tr>
                  <th className="p-3">Colaborador</th>
                  <th className="p-3">Salário</th>
                  <th className="p-3">Horas</th>
                  <th className="p-3 bg-blue-50 text-blue-700">Custo/Hora</th>
                  <th className="p-3 bg-amber-50 text-amber-700">Custo/Minuto</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {serverTeam.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-medium">{member.name}</td>
                    <td className="p-3">R$ {Number(member.salary).toFixed(2)}</td>
                    <td className="p-3">{member.hours_monthly}h</td>
                    <td className="p-3 bg-blue-50/50 font-bold text-blue-700">R$ {calculateMemberCPH(member.salary, member.hours_monthly).toFixed(2)}</td>
                    <td className="p-3 bg-amber-50/50 font-bold text-amber-700">R$ {calculateMemberCPM(member.salary, member.hours_monthly).toFixed(2)}</td>
                    <td className="p-3 text-right flex justify-end gap-2">
                      <button onClick={() => handleEditClick(member)} className="text-slate-400 hover:text-amber-600"><Edit size={16} /></button>
                      <button onClick={() => member.id && handleRemoveMember(member.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {serverTeam.length > 0 && <tfoot className="bg-slate-50 font-bold text-slate-800"><tr><td className="p-3">TOTAIS</td><td className="p-3">R$ {totalLaborCost.toFixed(2)}</td><td className="p-3">{totalHours}h</td><td className="p-3 text-blue-700">R$ {globalCPH.toFixed(2)}</td><td className="p-3 text-amber-700">R$ {globalCPM.toFixed(2)}</td><td></td></tr></tfoot>}
            </table>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: CUSTOS FIXOS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PieChart className="text-amber-600" size={20} /> Custos Fixos & Rateio
            </h2>
            <p className="text-sm text-slate-500">Defina a % que será adicionada a cada produto para cobrir contas.</p>
          </div>
          <div className="bg-slate-200 p-1 rounded-lg flex text-sm font-medium">
            <button onClick={() => setCostMode('manual')} className={`px-4 py-1.5 rounded-md transition ${costMode === 'manual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Manual (%)</button>
            <button onClick={() => setCostMode('detailed')} className={`px-4 py-1.5 rounded-md transition ${costMode === 'detailed' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Calculadora Detalhada</button>
          </div>
        </div>
        <div className="p-6">
          {costMode === 'manual' && (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center space-y-4 max-w-lg mx-auto">
              <p className="text-slate-600 text-sm">Digite diretamente a porcentagem que deseja aplicar sobre o custo de produção.</p>
              <div className="relative w-48 mx-auto">
                <input type="number" value={fixedOverheadRate} onChange={(e) => setFixedOverheadRate(parseFloat(e.target.value))} className="w-full px-4 py-3 border rounded-lg text-2xl font-bold text-center text-slate-800 outline-none focus:ring-2 focus:ring-amber-500" />
                <span className="absolute right-4 top-4 text-slate-400 font-bold">%</span>
              </div>
            </div>
          )}
          {costMode === 'detailed' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase"><List size={16} /> Lista de Contas Mensais</h3>
                <div className={`flex gap-2 p-3 rounded-lg border transition-colors ${editingCostId ? 'bg-amber-50 border-amber-200' : 'bg-transparent border-transparent px-0'}`}>
                  <input placeholder="Ex: Aluguel" value={newCost.name} onChange={(e) => setNewCost({ ...newCost, name: e.target.value })} className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                  <input placeholder="R$ 0.00" type="number" value={newCost.value} onChange={(e) => setNewCost({ ...newCost, value: e.target.value })} className="w-28 px-3 py-2 border rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                  <button onClick={handleSaveCost} disabled={saving} className={`p-2 rounded-lg text-white transition flex items-center justify-center w-10 ${editingCostId ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-800 hover:bg-slate-700'}`}>
                    {saving ? <Loader2 size={18} className="animate-spin" /> : editingCostId ? <CheckCircle size={18} /> : <Plus size={18} />}
                  </button>
                  {editingCostId && <button onClick={handleCancelCostEdit} className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600"><X size={18} /></button>}
                </div>
                <div className="border border-slate-100 rounded-lg overflow-y-auto max-h-60 bg-slate-50">
                  {fixedCosts.length === 0 ? <p className="p-4 text-center text-xs text-slate-400">Nenhuma conta adicionada.</p> : fixedCosts.map((cost) => (
                    <div key={cost.id} className={`flex justify-between items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition ${editingCostId === cost.id ? 'bg-amber-50' : 'bg-white'}`}>
                      <span className="text-sm text-slate-700">{cost.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-800">R$ {Number(cost.value).toFixed(2)}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEditCost(cost)} className="p-1 text-slate-300 hover:text-amber-600 rounded"><Edit size={14} /></button>
                          <button onClick={() => cost.id && handleRemoveCost(cost.id)} className="p-1 text-slate-300 hover:text-red-500 rounded"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between p-3 bg-slate-100 rounded-lg font-bold text-slate-800 text-sm">
                  <span>Total de Despesas:</span><span>R$ {totalFixedExpenses.toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2"><Calculator size={18} /> Calculadora de Rateio</h3>
                  <label className="block text-xs font-bold text-amber-800 uppercase mb-1">Faturamento Mensal Estimado</label>
                  <div className="relative mb-4">
                    <span className="absolute left-3 top-2.5 text-amber-600/70">R$</span>
                    <input type="number" value={estimatedRevenue} onChange={(e) => setEstimatedRevenue(parseFloat(e.target.value))} placeholder="Ex: 10000.00" className="w-full pl-8 pr-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white" />
                  </div>
                  <div className="space-y-2 text-sm text-amber-800/80 border-t border-amber-200/50 pt-4">
                    <div className="flex justify-between"><span>Total Contas:</span> <span>R$ {totalFixedExpenses.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Faturamento:</span> <span>R$ {estimatedRevenue.toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-amber-200">
                  <div className="flex justify-between items-end mb-2"><span className="text-sm font-bold text-amber-900">Taxa Calculada:</span><span className="text-3xl font-bold text-amber-600">{calculatedRate.toFixed(2)}%</span></div>
                  <button onClick={applyCalculatedRate} className="w-full py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition shadow-sm text-sm">Usar esta Taxa</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO 2.5: TAXAS DE VENDA (COM LÓGICA DE DÉBITO E CRÉDITO ADICIONADA) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Percent className="text-amber-600" size={20} />
              Taxas de Venda Padrão
            </h2>
            <p className="text-sm text-slate-500">Taxas que incidem sobre o preço de venda para cálculo do Lucro Líquido.</p>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <span className={`text-xs font-bold uppercase ${isMei ? 'text-slate-400' : 'text-blue-700'}`}>Simples/Outros</span>
            <button
              onClick={() => handleMeiChange(!isMei)}
              className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${isMei ? 'bg-purple-600' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isMei ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
            <span className={`text-xs font-bold uppercase flex items-center gap-1 ${isMei ? 'text-purple-700' : 'text-slate-400'}`}>
              <Briefcase size={14} /> Sou MEI
            </span>
          </div>
        </div>

        <div className="p-6">
          {isMei ? (
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-6 flex gap-3 animate-fade-in">
              <Info className="text-purple-700 shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-purple-800">
                <p className="font-bold mb-1">Você selecionou MEI (Microempreendedor Individual)</p>
                <p className="mb-2">
                  O MEI paga um valor fixo mensal (DAS) independente das vendas. Por isso, <strong>o imposto sobre venda é 0%</strong>.
                </p>
                <p>
                  <strong>Ação Necessária:</strong> Adicione o valor do seu DAS (Ex: R$ 75,00) na lista de <strong>"Custos Fixos"</strong> acima para que ele entre no custo do produto corretamente.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6 flex gap-3 animate-fade-in">
              <Info className="text-blue-700 shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-blue-800">
                <p className="font-bold mb-1">Atenção para não duplicar!</p>
                <p>
                  Coloque aqui apenas a % do imposto que varia conforme a venda (Simples, Lucro Presumido).
                  <strong> Não inclua estes valores na lista de "Custos Fixos"</strong> acima.
                </p>
              </div>
            </div>
          )}

          {/* --- ALTERAÇÃO AQUI: GRID COM 3 COLUNAS PARA INCLUIR DÉBITO E CRÉDITO --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={isMei ? "opacity-50 pointer-events-none grayscale" : ""}>
              <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                Impostos (Sobre Venda) %
                {isMei && <span className="text-[10px] text-purple-600 font-bold">Isento no MEI</span>}
              </label>
              <div className="relative mt-1">
                <input
                  type="number"
                  step="0.01"
                  value={defaultTaxRate}
                  onChange={e => setDefaultTaxRate(parseFloat(e.target.value))}
                  className="w-full pl-3 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  disabled={isMei}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <CreditCard size={14} className="text-purple-500" /> Taxa Débito %
              </label>
              <div className="relative mt-1">
                <input
                  type="number"
                  step="0.01"
                  value={cardDebitRate}
                  onChange={e => setCardDebitRate(parseFloat(e.target.value))}
                  className="w-full pl-3 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <CreditCard size={14} className="text-orange-500" /> Taxa Crédito %
              </label>
              <div className="relative mt-1">
                <input
                  type="number"
                  step="0.01"
                  value={cardCreditRate}
                  onChange={e => setCardCreditRate(parseFloat(e.target.value))}
                  className="w-full pl-3 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: RESUMO FINAL */}
      <div className="bg-slate-900 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 rounded-full"><CheckCircle className="text-green-400" size={24} /></div>
            <div>
              <div className="text-slate-400 text-sm">Resumo da Configuração</div>
              <div className="font-bold text-lg flex gap-4">
                <span>Minuto: <span className="text-green-400">R$ {globalCPM.toFixed(2)}</span></span>
                <span className="w-px h-6 bg-slate-700"></span>
                <span>Taxa Fixa: <span className="text-amber-400">{fixedOverheadRate || 0}%</span></span>
              </div>
            </div>
          </div>
          <div className="flex md:block">
            <button onClick={handleSaveAll} disabled={saving} className="w-full md:w-auto px-6 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-bold shadow-lg shadow-amber-900/20 transition flex items-center justify-center gap-2">
              {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Salvar Tudo
            </button>
          </div>
        </div>
      </div>

      {/* SEÇÃO 4: DADOS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Database className="text-amber-600" size={20} /> Backup e Restauro</h3>
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 mb-6 flex gap-3">
          <AlertTriangle className="text-amber-600 shrink-0" size={20} />
          <div className="text-sm text-amber-800"><p className="font-bold">Importante:</p><p>O backup gera um ficheiro JSON com todos os seus dados. Guarde-o em local seguro.</p></div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button type="button" onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition border border-slate-300"><Download size={20} /> Descarregar Backup</button>
          <div className="flex-1">
            <input type="file" accept=".json" id="restore-input" className="hidden" onChange={handleImport} />
            <label htmlFor="restore-input" className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition cursor-pointer shadow-md select-none"><Upload size={20} /> Restaurar Dados</label>
          </div>
        </div>
      </div>
    </div>
  );
};