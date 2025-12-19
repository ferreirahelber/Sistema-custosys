import React, { useState, useEffect } from 'react';
import { Settings, Employee } from '../types';
import { SettingsService } from '../services/settingsService';
import { Save, Info, Plus, Trash2, Users, Clock, DollarSign, Loader2 } from 'lucide-react';

interface Props {
  onSave: () => void;
}

export const SettingsForm: React.FC<Props> = ({ onSave }) => {
  // 1. Estados
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Estados do novo funcionário
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpSalary, setNewEmpSalary] = useState('');
  const [newEmpHours, setNewEmpHours] = useState('');

  // 2. Carregar dados ao abrir a tela
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await SettingsService.get();
    setSettings(data);
    setLoading(false);
  };

  // 3. Funções de manipulação
  const handleGlobalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: parseFloat(value) || 0 });
  };

  const addEmployee = () => {
    if (!settings || !newEmpName || !newEmpSalary || !newEmpHours) return;
    
    const newEmployee: Employee = {
      id: Date.now().toString(),
      name: newEmpName,
      salary: parseFloat(newEmpSalary),
      hours_monthly: parseFloat(newEmpHours)
    };

    const updatedEmployees = [...(settings.employees || []), newEmployee];
    recalculateTotals(updatedEmployees, settings);
    
    // Limpa campos
    setNewEmpName('');
    setNewEmpSalary('');
    setNewEmpHours('');
  };

  const removeEmployee = (id: string) => {
    if (!settings) return;
    const updatedEmployees = settings.employees.filter(e => e.id !== id);
    recalculateTotals(updatedEmployees, settings);
  };

  // Função auxiliar para recalcular totais e atualizar o estado
  const recalculateTotals = (employees: Employee[], currentSettings: Settings) => {
    const totalCost = employees.reduce((acc, e) => acc + e.salary, 0);
    const totalHours = employees.reduce((acc, e) => acc + e.hours_monthly, 0);
    const minutes = totalHours * 60;
    const costPerMinute = minutes > 0 ? totalCost / minutes : 0;

    setSettings({
      ...currentSettings,
      employees: employees,
      labor_monthly_cost: totalCost,
      work_hours_monthly: totalHours,
      cost_per_minute: costPerMinute
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    console.log("Salvando no Supabase:", settings);

    const success = await SettingsService.save(settings);
    
    setSaving(false);

    if (success) {
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2000);
      // Removido onSave() para não sair da tela
    } else {
        alert("Erro ao salvar. Verifique se você está logado.");
    }
  };

  // --- TRAVA DE SEGURANÇA (AQUI ESTAVA O ERRO) ---
  // Se estiver carregando ou settings for nulo, mostra o spinner e NÃO renderiza o resto
  if (loading || !settings) {
    return (
        <div className="flex flex-col justify-center items-center h-64 text-slate-500">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Carregando suas configurações...</p>
        </div>
    );
  }

  // --- RENDERIZAÇÃO DO FORMULÁRIO (Só chega aqui se settings existir) ---
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Seção de Colaboradores */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="mb-4 border-b pb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-amber-600" /> Colaboradores / Mão de Obra
            </h2>
            <p className="text-sm text-slate-500">Adicione quem trabalha na produção.</p>
        </div>

        {/* Inputs novo colaborador */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome</label>
                <input 
                    value={newEmpName}
                    onChange={e => setNewEmpName(e.target.value)}
                    placeholder="Ex: Confeiteira Chefe"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Salário (R$)</label>
                <input 
                    type="number"
                    value={newEmpSalary}
                    onChange={e => setNewEmpSalary(e.target.value)}
                    placeholder="3000.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Horas/Mês</label>
                <input 
                    type="number"
                    value={newEmpHours}
                    onChange={e => setNewEmpHours(e.target.value)}
                    placeholder="220"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
            </div>
            <button 
                onClick={addEmployee}
                className="w-full bg-amber-600 text-white font-medium py-2 rounded-lg hover:bg-amber-700 transition shadow-sm"
            >
                <Plus size={20} className="mx-auto" />
            </button>
        </div>

        {/* Tabela de Colaboradores */}
        {settings.employees && settings.employees.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 mb-6 shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="p-3">Colaborador</th>
                            <th className="p-3">Salário</th>
                            <th className="p-3">Horas</th>
                            <th className="p-3 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {settings.employees.map(emp => (
                            <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-medium text-slate-900">{emp.name}</td>
                                <td className="p-3 text-slate-600">R$ {emp.salary.toFixed(2)}</td>
                                <td className="p-3 text-slate-600">{emp.hours_monthly}h</td>
                                <td className="p-3 text-right">
                                    <button onClick={() => removeEmployee(emp.id)} className="text-red-400 hover:text-red-600 transition p-1">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                        <tr>
                            <td className="p-3">TOTAIS</td>
                            <td className="p-3">R$ {settings.labor_monthly_cost.toFixed(2)}</td>
                            <td className="p-3">{settings.work_hours_monthly}h</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        ) : (
            <p className="text-center text-slate-500 py-6 italic border-2 border-dashed border-slate-200 rounded-lg mb-6 bg-slate-50">
                Nenhum colaborador adicionado.
            </p>
        )}
      </div>

      {/* Configurações Globais */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="bg-amber-50 p-5 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-4 text-amber-800 border-b border-amber-200 pb-2">
                    <Info className="w-5 h-5" />
                    <h3 className="font-bold text-lg">Custo Operacional</h3>
                </div>
                
                <div className="flex justify-between items-center text-amber-800 text-lg pt-2 mt-2">
                    <span className="flex items-center gap-1 font-bold"><DollarSign size={18}/> Custo Minuto</span>
                    <span className="font-bold text-xl">R$ {settings.cost_per_minute.toFixed(4)}</span>
                </div>
                <p className="text-xs text-center text-slate-500 mt-1">Este valor será usado automaticamente nas novas receitas.</p>
            </div>

            <div className="space-y-2 mt-6">
                <label className="block text-sm font-medium text-slate-700">
                    Taxa de Custos Indiretos/Fixos (%)
                </label>
                <div className="relative">
                    <input
                    type="number"
                    step="0.1"
                    name="fixed_overhead_rate"
                    value={settings.fixed_overhead_rate || ''}
                    onChange={handleGlobalChange}
                    placeholder="Ex: 10"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                    required
                    />
                    <span className="absolute right-3 top-2 text-slate-400">%</span>
                </div>
                <p className="text-xs text-slate-500">Estimativa de Gás, Energia, Água.</p>
            </div>

            <div className="pt-4">
                <button
                    type="submit"
                    disabled={saving}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-white transition-all ${
                    successMsg ? 'bg-green-600' : 'bg-amber-600 hover:bg-amber-700'
                    } ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {saving ? 'Salvando...' : successMsg ? 'Salvo no Banco de Dados!' : 'Salvar Configurações'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};