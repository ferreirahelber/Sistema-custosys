import React, { useState } from 'react';
import { Settings, Employee } from '../types';
import { StorageService } from '../services/storage';
import { Save, Info, Plus, Trash2, Users, Clock, DollarSign } from 'lucide-react';

interface Props {
  onSave: () => void;
}

export const SettingsForm: React.FC<Props> = ({ onSave }) => {
  const [settings, setSettings] = useState<Settings>(StorageService.getSettings());
  const [saved, setSaved] = useState(false);
  
  // New employee state
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpSalary, setNewEmpSalary] = useState('');
  const [newEmpHours, setNewEmpHours] = useState('');

  const handleGlobalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const addEmployee = () => {
    if (!newEmpName || !newEmpSalary || !newEmpHours) return;
    
    const newEmployee: Employee = {
      id: Date.now().toString(),
      name: newEmpName,
      salary: parseFloat(newEmpSalary),
      hours_monthly: parseFloat(newEmpHours)
    };

    const updatedEmployees = [...(settings.employees || []), newEmployee];
    
    // Auto update totals immediately for preview
    const totalCost = updatedEmployees.reduce((acc, e) => acc + e.salary, 0);
    const totalHours = updatedEmployees.reduce((acc, e) => acc + e.hours_monthly, 0);

    // Calculate generic minute cost
    const minutes = totalHours * 60;
    const costPerMinute = minutes > 0 ? totalCost / minutes : 0;

    setSettings(prev => ({
      ...prev,
      employees: updatedEmployees,
      labor_monthly_cost: totalCost,
      work_hours_monthly: totalHours,
      cost_per_minute: costPerMinute
    }));

    setNewEmpName('');
    setNewEmpSalary('');
    setNewEmpHours('');
  };

  const removeEmployee = (id: string) => {
    const updatedEmployees = settings.employees.filter(e => e.id !== id);
    
    const totalCost = updatedEmployees.reduce((acc, e) => acc + e.salary, 0);
    const totalHours = updatedEmployees.reduce((acc, e) => acc + e.hours_monthly, 0);
    const minutes = totalHours * 60;
    const costPerMinute = minutes > 0 ? totalCost / minutes : 0;

    setSettings(prev => ({
      ...prev,
      employees: updatedEmployees,
      labor_monthly_cost: totalCost,
      work_hours_monthly: totalHours,
      cost_per_minute: costPerMinute
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveSettings(settings);
    setSettings(StorageService.getSettings());
    setSaved(true);
    setTimeout(() => {
        setSaved(false);
        onSave();
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Employee Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="mb-4 border-b pb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-amber-600" /> Colaboradores / Mão de Obra
            </h2>
            <p className="text-sm text-slate-500">Adicione todas as pessoas que trabalham na produção (inclusive você).</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome</label>
                <input 
                    value={newEmpName}
                    onChange={e => setNewEmpName(e.target.value)}
                    placeholder="Ex: Confeiteira Chefe"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-medium placeholder:text-slate-400"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Salário Total (R$)</label>
                <input 
                    type="number"
                    value={newEmpSalary}
                    onChange={e => setNewEmpSalary(e.target.value)}
                    placeholder="3000.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Horas/Mês</label>
                <input 
                    type="number"
                    value={newEmpHours}
                    onChange={e => setNewEmpHours(e.target.value)}
                    placeholder="160"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 placeholder:text-slate-400"
                />
            </div>
            <button 
                onClick={addEmployee}
                className="w-full bg-amber-600 text-white font-medium py-2 rounded-lg hover:bg-amber-700 transition shadow-sm"
            >
                <Plus size={20} className="mx-auto" />
            </button>
        </div>

        {/* Employee List */}
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
                            <td className="p-3">TOTAL DA EQUIPE</td>
                            <td className="p-3">R$ {settings.labor_monthly_cost.toFixed(2)}</td>
                            <td className="p-3">{settings.work_hours_monthly}h</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        ) : (
            <p className="text-center text-slate-500 py-6 italic border-2 border-dashed border-slate-200 rounded-lg mb-6 bg-slate-50">
                Nenhum colaborador adicionado. Preencha os campos acima e clique em "+".
            </p>
        )}
      </div>

      {/* Global Settings & Save */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Feedback Card - Detailed Operational Cost */}
            <div className="bg-amber-50 p-5 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-4 text-amber-800 border-b border-amber-200 pb-2">
                    <Info className="w-5 h-5" />
                    <h3 className="font-bold text-lg">Custo Operacional (Mão de Obra)</h3>
                </div>
                
                <div className="space-y-3">
                    {/* Individual Minute Cost */}
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Custo do Minuto por Colaborador</p>
                        {settings.employees && settings.employees.length > 0 ? (
                            settings.employees.map(emp => {
                                const minuteCost = emp.hours_monthly > 0 ? emp.salary / (emp.hours_monthly * 60) : 0;
                                return (
                                    <div key={emp.id} className="flex justify-between text-sm text-slate-700 border-b border-amber-100 last:border-0 py-1">
                                        <span className="font-medium">{emp.name}</span>
                                        <span className="font-mono text-amber-900">R$ {minuteCost.toFixed(4)} /min</span>
                                    </div>
                                );
                            })
                        ) : (
                            <span className="text-sm text-slate-400 italic">Nenhum colaborador...</span>
                        )}
                    </div>

                    {/* Totals */}
                    <div className="bg-white/60 p-3 rounded mt-4">
                        <div className="flex justify-between items-center text-slate-700 mb-1">
                            <span className="flex items-center gap-1 font-medium"><Clock size={14}/> Soma de Tempo (Horas)</span>
                            <span className="font-bold">{settings.work_hours_monthly}h /mês</span>
                        </div>
                        <div className="flex justify-between items-center text-amber-800 text-lg border-t border-amber-200 pt-2 mt-2">
                            <span className="flex items-center gap-1 font-bold"><DollarSign size={18}/> Custo Minuto da Doceria</span>
                            <span className="font-bold text-xl">R$ {settings.cost_per_minute.toFixed(4)}</span>
                        </div>
                        <p className="text-xs text-center text-slate-500 mt-1">Valor utilizado para calcular o custo de produção nas receitas.</p>
                    </div>
                </div>
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
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition pr-8 bg-white text-slate-900"
                    required
                    />
                    <span className="absolute right-3 top-2 text-slate-400">%</span>
                </div>
                <p className="text-xs text-slate-500">Estimativa de Gás, Energia, Água e Detergente sobre o custo do material.</p>
            </div>

            <div className="pt-4">
                <button
                    type="submit"
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-white transition-all ${
                    saved ? 'bg-green-600' : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                >
                    <Save size={18} />
                    {saved ? 'Configurações Salvas!' : 'Salvar Todas Configurações'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};