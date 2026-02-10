import React from 'react';
import { Clock, HelpCircle, Save, Loader2, Package, History } from 'lucide-react';
import { Settings } from '../../types';

interface RecipeFinancialsProps {
    financials: {
        total_cost_material: number;
        total_cost_labor: number;
        total_cost_overhead: number;
        total_cost_final: number;
        unit_cost: number;
    };
    settings: Settings;
    onSave: (e: React.FormEvent) => void;
    isSaving: boolean;
    isEditing: boolean;
    onShowHistory: () => void;
    packagingCost: number;
}

export const RecipeFinancials: React.FC<RecipeFinancialsProps> = ({
    financials, settings, onSave, isSaving, isEditing, onShowHistory, packagingCost
}) => {
    const materialsCostOnly = financials.total_cost_material - packagingCost;
    const totalFixedExpensesApprox = (settings.estimated_monthly_revenue * settings.fixed_overhead_rate) / 100;
    const showDetailedTooltip = settings.estimated_monthly_revenue > 0;

    return (
        <div className="space-y-6">
            <div className="sticky top-6 bg-slate-800 text-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock size={20} className="text-amber-400" /> Custos Calculados</h3>
                <div className="space-y-2 text-sm opacity-80">
                    <div className="flex justify-between">
                        <span>Materiais</span>
                        <span>R$ {materialsCostOnly.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-blue-200">
                        <span className="flex items-center gap-1">Embalagens <Package size={12} /></span>
                        <span>R$ {packagingCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Mão de Obra</span>
                        <span>R$ {financials.total_cost_labor.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1">
                            Custos Fixos
                            <div className="group relative cursor-help">
                                <HelpCircle size={12} className="text-amber-400 opacity-70 hover:opacity-100" />
                                <div className="absolute right-0 w-64 p-3 bg-white text-slate-600 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 bottom-full mb-2 -mr-2 border border-slate-100">
                                    {showDetailedTooltip ? (
                                        <>
                                            <div className="font-bold text-amber-600 border-b border-amber-100 pb-2 mb-2">
                                                Taxa de {settings.fixed_overhead_rate}%:
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span>Despesas Fixas:</span>
                                                    <strong>R$ {totalFixedExpensesApprox.toFixed(2)}</strong>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Faturamento Estimado:</span>
                                                    <strong>R$ {settings.estimated_monthly_revenue.toFixed(2)}</strong>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <p>Taxa de <strong>{settings.fixed_overhead_rate}%</strong> definida nas configurações.</p>
                                    )}
                                    <div className="absolute bottom-[-5px] right-3 w-3 h-3 bg-white border-b border-r border-slate-100 transform rotate-45"></div>
                                </div>
                            </div>
                        </span>
                        <span>R$ {financials.total_cost_overhead.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 mt-2 border-t border-slate-600 font-bold text-amber-400">
                        <span>Total</span>
                        <span>R$ {financials.total_cost_final.toFixed(2)}</span>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700 text-2xl font-bold text-center">
                    R$ {financials.unit_cost.toFixed(2)} <span className="text-xs font-normal">/un</span>
                </div>
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold flex justify-center items-center gap-2 transition disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Salvar Receita</>}
                </button>
            </div>
            {isEditing && (
                <button
                    onClick={onShowHistory}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-50 transition"
                >
                    <History size={18} /> Ver Histórico
                </button>
            )}
        </div>
    );
};
