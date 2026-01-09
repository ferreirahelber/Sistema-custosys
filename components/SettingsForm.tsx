import React, { useState, useEffect } from 'react';
import { SettingsService } from '../services/settingsService';
import { TeamService, TeamMember } from '../services/teamService';
import { FixedCostService, FixedCost } from '../services/fixedCostService';
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
} from 'lucide-react';
import { Settings } from '../types';
import { toast } from 'sonner'; // <--- Importando toast

interface Props {
  onSave?: () => void;
}

export const SettingsForm: React.FC<Props> = ({ onSave }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- DADOS DA EQUIPE ---
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', salary: '', hours: '' });

  // --- DADOS DOS CUSTOS FIXOS ---
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [newCost, setNewCost] = useState({ name: '', value: '' });
  const [costMode, setCostMode] = useState<'manual' | 'detailed'>('manual');

  const [fixedOverheadRate, setFixedOverheadRate] = useState(0);
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, teamData, costsData] = await Promise.all([
        SettingsService.get(),
        TeamService.getAll(),
        FixedCostService.getAll(),
      ]);

      setTeam(teamData);
      setFixedCosts(costsData);
      setFixedOverheadRate(settingsData.fixed_overhead_rate || 0);
      setEstimatedRevenue(settingsData.estimated_monthly_revenue || 0);

      if (
        costsData.length > 0 &&
        (!settingsData.fixed_overhead_rate || settingsData.fixed_overhead_rate === 0)
      ) {
        setCostMode('detailed');
      }
    } catch (error) {
      console.error('Erro ao carregar:', error);
      toast.error('Não foi possível carregar as configurações.');
    } finally {
      setLoading(false);
    }
  };

  // --- CÁLCULOS ---
  const calculateMemberCPH = (salary: number, hours: number) => (hours > 0 ? salary / hours : 0);
  const calculateMemberCPM = (salary: number, hours: number) =>
    hours > 0 ? salary / (hours * 60) : 0;
  const totalLaborCost = team.reduce((acc, curr) => acc + Number(curr.salary), 0);
  const totalHours = team.reduce((acc, curr) => acc + Number(curr.hours_monthly), 0);
  const globalCPH = team.reduce(
    (acc, curr) => acc + calculateMemberCPH(curr.salary, curr.hours_monthly),
    0
  );
  const globalCPM = team.reduce(
    (acc, curr) => acc + calculateMemberCPM(curr.salary, curr.hours_monthly),
    0
  );
  const totalFixedExpenses = fixedCosts.reduce((acc, curr) => acc + Number(curr.value), 0);
  const calculatedRate = estimatedRevenue > 0 ? (totalFixedExpenses / estimatedRevenue) * 100 : 0;

  // --- AÇÕES EQUIPE ---
  const handleEditClick = (member: TeamMember) => {
    setEditingId(member.id!);
    setFormData({
      name: member.name,
      salary: member.salary.toString(),
      hours: member.hours_monthly.toString(),
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', salary: '', hours: '' });
  };

  const handleSaveMember = async () => {
    if (!formData.name || !formData.salary || !formData.hours) {
      toast.warning('Preencha todos os campos do colaborador.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        salary: parseFloat(formData.salary),
        hours_monthly: parseFloat(formData.hours),
      };

      if (editingId) {
        await TeamService.update(editingId, payload);
        toast.success('Colaborador atualizado!');
      } else {
        await TeamService.add(payload);
        toast.success('Colaborador adicionado!');
      }

      handleCancelEdit();
      const newTeam = await TeamService.getAll();
      setTeam(newTeam);
    } catch (e) {
      toast.error('Erro ao salvar colaborador.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    // Usando toast com promise/action seria ideal, mas para manter simples usamos confirm padrão ou um toast customizado
    // Aqui vou manter o confirm padrão pois é destrutivo, mas avisa sucesso com toast
    if (!confirm('Remover este colaborador?')) return;

    try {
      await TeamService.delete(id);
      const newTeam = await TeamService.getAll();
      setTeam(newTeam);
      toast.success('Colaborador removido.');
    } catch (e) {
      toast.error('Erro ao remover colaborador.');
    }
  };

  // --- AÇÕES CUSTOS FIXOS ---
  const handleEditCost = (cost: FixedCost) => {
    setEditingCostId(cost.id!);
    setNewCost({ name: cost.name, value: cost.value.toString() });
  };

  const handleCancelCostEdit = () => {
    setEditingCostId(null);
    setNewCost({ name: '', value: '' });
  };

  const handleSaveCost = async () => {
    if (!newCost.name || !newCost.value) {
      toast.warning('Preencha nome e valor do custo.');
      return;
    }
    try {
      setSaving(true);
      const payload = { name: newCost.name, value: parseFloat(newCost.value) };

      if (editingCostId) {
        await FixedCostService.update(editingCostId, payload);
        toast.success('Custo atualizado!');
      } else {
        await FixedCostService.add(payload);
        toast.success('Custo adicionado!');
      }

      handleCancelCostEdit();
      const newCosts = await FixedCostService.getAll();
      setFixedCosts(newCosts);
    } catch (e) {
      toast.error('Erro ao salvar custo.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCost = async (id: string) => {
    if (!confirm('Remover este custo?')) return;
    try {
      await FixedCostService.delete(id);
      const newCosts = await FixedCostService.getAll();
      setFixedCosts(newCosts);
      if (editingCostId === id) handleCancelCostEdit();
      toast.success('Custo removido.');
    } catch (e) {
      toast.error('Erro ao remover custo.');
    }
  };

  const applyCalculatedRate = () => {
    setFixedOverheadRate(parseFloat(calculatedRate.toFixed(2)));
    toast.info(
      `Taxa de ${calculatedRate.toFixed(2)}% aplicada! Salve as configurações para confirmar.`
    );
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const settingsToSave: Settings = {
        labor_monthly_cost: totalLaborCost,
        work_hours_monthly: totalHours,
        fixed_overhead_rate: fixedOverheadRate,
        cost_per_minute: globalCPM,
        estimated_monthly_revenue: estimatedRevenue,
      };

      await SettingsService.save(settingsToSave);
      toast.success('Configurações salvas com sucesso!');
      if (onSave) onSave();
    } catch (error) {
      toast.error('Erro ao salvar configurações gerais.');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-amber-600" />
      </div>
    );

  return (
    <div className="space-y-8 w-full pb-12">
      {/* SEÇÃO 1: EQUIPE (Mantém o mesmo JSX do passo anterior com a tabela corrigida) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-amber-600" size={20} />
            Colaboradores / Mão de Obra
          </h2>
          <p className="text-sm text-slate-500">
            Adicione quem trabalha na produção para compor o custo do minuto.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Form Equipe */}
          <div
            className={`grid grid-cols-1 md:grid-cols-7 gap-4 items-end p-4 rounded-lg border transition-colors ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}
          >
            <div className="md:col-span-3">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Confeiteira Chefe"
                className="w-full mt-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Salário (R$)</label>
              <input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                placeholder="3000.00"
                className="w-full mt-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Horas/Mês</label>
              <input
                type="number"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="220"
                className="w-full mt-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="md:col-span-1 flex gap-2">
              <button
                onClick={handleSaveMember}
                disabled={saving}
                className={`flex-1 p-2.5 rounded-lg flex justify-center items-center text-white transition ${editingId ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                {saving ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : editingId ? (
                  <CheckCircle size={20} />
                ) : (
                  <Plus size={20} />
                )}
              </button>
              {editingId && (
                <button
                  onClick={handleCancelEdit}
                  className="p-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600"
                >
                  <X size={20} />
                </button>
              )}
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
                {team.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-medium">{member.name}</td>
                    <td className="p-3">R$ {Number(member.salary).toFixed(2)}</td>
                    <td className="p-3">{member.hours_monthly}h</td>
                    <td className="p-3 bg-blue-50/50 font-bold text-blue-700">
                      R$ {calculateMemberCPH(member.salary, member.hours_monthly).toFixed(2)}
                    </td>
                    <td className="p-3 bg-amber-50/50 font-bold text-amber-700">
                      R$ {calculateMemberCPM(member.salary, member.hours_monthly).toFixed(2)}
                    </td>
                    <td className="p-3 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(member)}
                        className="text-slate-400 hover:text-amber-600"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.id!)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {team.length > 0 && (
                <tfoot className="bg-slate-50 font-bold text-slate-800">
                  <tr>
                    <td className="p-3">TOTAIS</td>
                    <td className="p-3">R$ {totalLaborCost.toFixed(2)}</td>
                    <td className="p-3">{totalHours}h</td>
                    <td className="p-3 text-blue-700">R$ {globalCPH.toFixed(2)}</td>
                    <td className="p-3 text-amber-700">R$ {globalCPM.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: CUSTOS FIXOS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PieChart className="text-amber-600" size={20} />
              Custos Fixos & Rateio
            </h2>
            <p className="text-sm text-slate-500">
              Defina a % que será adicionada a cada produto para cobrir contas.
            </p>
          </div>

          <div className="bg-slate-200 p-1 rounded-lg flex text-sm font-medium">
            <button
              onClick={() => setCostMode('manual')}
              className={`px-4 py-1.5 rounded-md transition ${costMode === 'manual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Manual (%)
            </button>
            <button
              onClick={() => setCostMode('detailed')}
              className={`px-4 py-1.5 rounded-md transition ${costMode === 'detailed' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Calculadora Detalhada
            </button>
          </div>
        </div>

        <div className="p-6">
          {costMode === 'manual' && (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center space-y-4 max-w-lg mx-auto">
              <p className="text-slate-600 text-sm">
                Digite diretamente a porcentagem que deseja aplicar sobre o custo de produção.
              </p>
              <div className="relative w-48 mx-auto">
                <input
                  type="number"
                  value={fixedOverheadRate}
                  onChange={(e) => setFixedOverheadRate(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 border rounded-lg text-2xl font-bold text-center text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="absolute right-4 top-4 text-slate-400 font-bold">%</span>
              </div>
            </div>
          )}

          {costMode === 'detailed' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase">
                  <List size={16} /> Lista de Contas Mensais
                </h3>
                <div
                  className={`flex gap-2 p-3 rounded-lg border transition-colors ${editingCostId ? 'bg-amber-50 border-amber-200' : 'bg-transparent border-transparent px-0'}`}
                >
                  <input
                    placeholder="Ex: Aluguel"
                    value={newCost.name}
                    onChange={(e) => setNewCost({ ...newCost, name: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <input
                    placeholder="R$ 0.00"
                    type="number"
                    value={newCost.value}
                    onChange={(e) => setNewCost({ ...newCost, value: e.target.value })}
                    className="w-28 px-3 py-2 border rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    onClick={handleSaveCost}
                    disabled={saving}
                    className={`p-2 rounded-lg text-white transition flex items-center justify-center w-10 ${editingCostId ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-800 hover:bg-slate-700'}`}
                  >
                    {saving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : editingCostId ? (
                      <CheckCircle size={18} />
                    ) : (
                      <Plus size={18} />
                    )}
                  </button>
                  {editingCostId && (
                    <button
                      onClick={handleCancelCostEdit}
                      className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <div className="border border-slate-100 rounded-lg overflow-y-auto max-h-60 bg-slate-50">
                  {fixedCosts.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-400">
                      Nenhuma conta adicionada.
                    </p>
                  ) : (
                    fixedCosts.map((cost) => (
                      <div
                        key={cost.id}
                        className={`flex justify-between items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition ${editingCostId === cost.id ? 'bg-amber-50' : 'bg-white'}`}
                      >
                        <span className="text-sm text-slate-700">{cost.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-800">
                            R$ {Number(cost.value).toFixed(2)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditCost(cost)}
                              className="p-1 text-slate-300 hover:text-amber-600 rounded"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleRemoveCost(cost.id!)}
                              className="p-1 text-slate-300 hover:text-red-500 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-between p-3 bg-slate-100 rounded-lg font-bold text-slate-800 text-sm">
                  <span>Total de Despesas:</span>
                  <span>R$ {totalFixedExpenses.toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
                    <Calculator size={18} /> Calculadora de Rateio
                  </h3>
                  <label className="block text-xs font-bold text-amber-800 uppercase mb-1">
                    Faturamento Mensal Estimado
                  </label>
                  <div className="relative mb-4">
                    <span className="absolute left-3 top-2.5 text-amber-600/70">R$</span>
                    <input
                      type="number"
                      value={estimatedRevenue}
                      onChange={(e) => setEstimatedRevenue(parseFloat(e.target.value))}
                      placeholder="Ex: 10000.00"
                      className="w-full pl-8 pr-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                    />
                  </div>
                  <div className="space-y-2 text-sm text-amber-800/80 border-t border-amber-200/50 pt-4">
                    <div className="flex justify-between">
                      <span>Total Contas:</span> <span>R$ {totalFixedExpenses.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Faturamento:</span> <span>R$ {estimatedRevenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-amber-200">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-amber-900">Taxa Calculada:</span>
                    <span className="text-3xl font-bold text-amber-600">
                      {calculatedRate.toFixed(2)}%
                    </span>
                  </div>
                  <button
                    onClick={applyCalculatedRate}
                    className="w-full py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition shadow-sm text-sm"
                  >
                    Usar esta Taxa
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO 3: RESUMO FINAL */}
      <div className="bg-slate-900 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 rounded-full">
              <CheckCircle className="text-green-400" size={24} />
            </div>
            <div>
              <div className="text-slate-400 text-sm">Resumo da Configuração</div>
              <div className="font-bold text-lg flex gap-4">
                <span>
                  Minuto: <span className="text-green-400">R$ {globalCPM.toFixed(2)}</span>
                </span>
                <span className="w-px h-6 bg-slate-700"></span>
                <span>
                  Taxa Fixa: <span className="text-amber-400">{fixedOverheadRate || 0}%</span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full md:w-auto px-8 py-3 bg-amber-600 hover:bg-amber-700 rounded-lg font-bold shadow-lg shadow-amber-900/20 transition flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            Salvar Tudo
          </button>
        </div>
      </div>
    </div>
  );
};
