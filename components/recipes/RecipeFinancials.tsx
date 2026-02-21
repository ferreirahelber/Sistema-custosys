import React from 'react';
import { Clock, Package, HelpCircle, History } from 'lucide-react';
import { Settings } from '../../types';

export interface RecipeFinancialMetrics {
    total_cost_material: number;
    total_cost_labor: number;
    total_cost_overhead: number;
    total_cost_final: number;
    unit_cost: number;
}

interface RecipeFinancialsProps {
    financials: RecipeFinancialMetrics;
    settings: Settings;
    onSave?: () => void;
    isSaving?: boolean;
    isEditing: boolean;
    onShowHistory?: () => void;
    packagingCost?: number;
    isSummaryMode?: boolean;
}

export const RecipeFinancials = React.memo<RecipeFinancialsProps>(({
    financials, settings, onSave, isSaving, isEditing, onShowHistory, packagingCost = 0, isSummaryMode = false
}) => {
    // Cálculo seguro para evitar NaN
    const materialsCost = financials?.total_cost_material || 0;
    const laborCost = financials?.total_cost_labor || 0;
    const overheadCost = financials?.total_cost_overhead || 0;
    const finalCost = financials?.total_cost_final || 0;
    const unitCost = financials?.unit_cost || 0;

    const materialsCostOnly = materialsCost - packagingCost;
    const totalFixedExpensesApprox = (settings.estimated_monthly_revenue * settings.fixed_overhead_rate) / 100;
    const showDetailedTooltip = settings.estimated_monthly_revenue > 0;

    if (isSummaryMode) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Resumo de Custos</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Materiais</span>
                        <span className="font-semibold">R$ {materialsCostOnly.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Embalagens</span>
                        <span className="font-semibold text-purple-600">R$ {packagingCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Mão de Obra</span>
                        <span className="font-semibold">R$ {laborCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Custos Fixos</span>
                        <span className="font-semibold">R$ {overheadCost.toFixed(2)}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                        <span className="font-bold text-slate-800">Custo Total</span>
                        <span className="font-bold text-xl text-emerald-600">R$ {finalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                        <span className="font-bold text-slate-600">Custo Unitário</span>
                        <span className="font-bold text-lg text-slate-800">R$ {unitCost.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg">
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
                        <span>R$ {laborCost.toFixed(2)}</span>
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
                        <span>R$ {overheadCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 mt-2 border-t border-slate-600 font-bold text-amber-400">
                        <span>Total</span>
                        <span>R$ {finalCost.toFixed(2)}</span>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700 text-2xl font-bold text-center">
                    R$ {unitCost.toFixed(2)} <span className="text-xs font-normal">/un</span>
                </div>
            </div>
            {isEditing && onShowHistory && (
                <button
                    onClick={onShowHistory}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-50 transition"
                >
                    <History size={18} /> Ver Histórico
                </button>
            )}
        </div>
    );
});
