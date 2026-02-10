import React from 'react';
import { Tag, Plus, Settings as SettingsIcon, Barcode, Wand2, Clock, Layers } from 'lucide-react';
import { Category } from '../../types';

interface RecipeGeneralSettingsProps {
    name: string; setName: (v: string) => void;
    barcode: string; setBarcode: (v: string) => void;
    category: string; setCategory: (v: string) => void;
    prepTime: number; setPrepTime: (v: number) => void;
    yieldUnits: number; setYieldUnits: (v: number) => void;
    isBase: boolean; setIsBase: (v: boolean) => void;
    yieldQuantity: number; setYieldQuantity: (v: number) => void;
    yieldUnit: 'g' | 'ml' | 'un'; setYieldUnit: (v: 'g' | 'ml' | 'un') => void;
    categories: Category[];
    isEditing: boolean;
    onOpenCategoryModal: () => void;
    onOpenCategoryManager: () => void;
    onGenerateCode: () => void;
}

export const RecipeGeneralSettings: React.FC<RecipeGeneralSettingsProps> = ({
    name, setName, barcode, setBarcode, category, setCategory,
    prepTime, setPrepTime, yieldUnits, setYieldUnits,
    isBase, setIsBase, yieldQuantity, setYieldQuantity, yieldUnit, setYieldUnit,
    categories, isEditing, onOpenCategoryModal, onOpenCategoryManager, onGenerateCode
}) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Receita</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                        placeholder="Ex: Bolo de Cenoura"
                        autoFocus={!isEditing}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Tag size={14} /> Categoria</label>
                    <div className="flex gap-2">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                        >
                            <option value="">Selecione...</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={onOpenCategoryModal}
                            className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:bg-green-100 hover:text-green-700 hover:border-green-300 transition"
                            title="Nova Categoria"
                        >
                            <Plus size={20} />
                        </button>
                        <button
                            type="button"
                            onClick={onOpenCategoryManager}
                            className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-200 transition"
                            title="Gerenciar Categorias"
                        >
                            <SettingsIcon size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                    <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1"><Barcode size={16} /> Código</label>
                    <div className="flex gap-1">
                        <input
                            value={barcode}
                            onChange={(e) => setBarcode(e.target.value)}
                            className="w-full px-2 py-2 border rounded-l-lg outline-none text-sm focus:ring-2 focus:ring-amber-500"
                            placeholder="SKU"
                        />
                        <button
                            type="button"
                            onClick={onGenerateCode}
                            className="bg-slate-100 border border-l-0 rounded-r-lg px-2 hover:bg-slate-200 text-slate-600 transition"
                        >
                            <Wand2 size={16} />
                        </button>
                    </div>
                </div>
                <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1"><Clock size={16} /> Tempo (min)</label>
                    <input
                        type="number"
                        name="preparation_time_minutes"
                        value={prepTime || ''}
                        onChange={(e) => setPrepTime(e.target.value ? parseFloat(e.target.value) : 0)}
                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
                <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1"><Layers size={16} /> Rendimento</label>
                    <input
                        type="number"
                        value={yieldUnits || ''}
                        onChange={(e) => setYieldUnits(e.target.value ? parseFloat(e.target.value) : 0)}
                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
            </div>

            {isBase && (
                <div className="col-span-1 border-t border-slate-100 pt-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Peso/Volume Total da Base</label>
                    <div className="flex gap-1">
                        <input
                            type="number"
                            value={yieldQuantity || ''}
                            onChange={(e) => setYieldQuantity(e.target.value ? parseFloat(e.target.value) : 0)}
                            className="w-full px-2 py-2 border rounded-l-lg outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: 1200"
                        />
                        <select
                            value={yieldUnit}
                            onChange={(e) => setYieldUnit(e.target.value as any)}
                            className="bg-slate-100 border border-l-0 rounded-r-lg px-2 outline-none"
                        >
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="un">un</option>
                        </select>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100 mt-4">
                <input
                    type="checkbox"
                    id="is_base"
                    checked={isBase}
                    onChange={(e) => setIsBase(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="is_base" className="flex flex-col cursor-pointer">
                    <span className="text-sm font-bold text-slate-800">Receita Base (Uso Interno)</span>
                    <span className="text-xs text-slate-500">Se marcado, esta receita não aparecerá no PDV para venda.</span>
                </label>
            </div>
        </div>
    );
};
