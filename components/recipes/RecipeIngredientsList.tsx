import React, { useState } from 'react';
import { ShoppingCart, Plus, Edit, Trash2, Layers, Package, Save, X } from 'lucide-react';
import { Ingredient, Recipe, RecipeItem } from '../../types';
import { calculateItemCost } from '../../utils/calculations';

interface RecipeIngredientsListProps {
    ingredients: Ingredient[];
    baseRecipes: Recipe[];
    recipeItems: RecipeItem[];
    onAddItem: (id: string, qty: number | string, unit: string) => void;
    onRemoveItem: (id: string) => void;
}

export const RecipeIngredientsList: React.FC<RecipeIngredientsListProps> = ({
    ingredients, baseRecipes, recipeItems,
    onAddItem, onRemoveItem
}) => {
    // 1. Ingredientes
    const [ingId, setIngId] = useState('');
    const [ingQty, setIngQty] = useState('');
    const [ingUnit, setIngUnit] = useState('');
    const [editingIngId, setEditingIngId] = useState<string | null>(null);

    // 2. Bases
    const [baseId, setBaseId] = useState('');
    const [baseQty, setBaseQty] = useState('');
    const [baseUnit, setBaseUnit] = useState('');
    const [editingBaseId, setEditingBaseId] = useState<string | null>(null);

    // 3. Embalagens
    const [packId, setPackId] = useState('');
    const [packQty, setPackQty] = useState('');
    const [editingPackId, setEditingPackId] = useState<string | null>(null);

    const foodIngredients = ingredients.filter((i: Ingredient) => i.category !== 'product' && i.category !== 'packaging');
    const packagingIngredients = ingredients.filter((i: Ingredient) => i.category === 'packaging');

    // Helpers para adicionar/atualizar
    const handleAddIngredient = () => {
        if (editingIngId) {
            onRemoveItem(editingIngId);
            setEditingIngId(null);
        }
        onAddItem(ingId, ingQty, ingUnit);
        setIngId('');
        setIngQty('');
        setIngUnit('');
    };

    const handleCancelEditIng = () => {
        setEditingIngId(null);
        setIngId('');
        setIngQty('');
        setIngUnit('');
    };

    const handleAddBase = () => {
        if (editingBaseId) {
            onRemoveItem(editingBaseId);
            setEditingBaseId(null);
        }
        onAddItem(baseId, baseQty, baseUnit);
        setBaseId('');
        setBaseQty('');
        setBaseUnit('');
    };

    const handleCancelEditBase = () => {
        setEditingBaseId(null);
        setBaseId('');
        setBaseQty('');
        setBaseUnit('');
    };

    const handleAddPackaging = () => {
        if (editingPackId) {
            onRemoveItem(editingPackId);
            setEditingPackId(null);
        }
        onAddItem(packId, packQty, 'un');
        setPackId('');
        setPackQty('');
    };

    const handleCancelEditPack = () => {
        setEditingPackId(null);
        setPackId('');
        setPackQty('');
    };

    const handleEditItem = (item: RecipeItem) => {
        // 1. Identify type and populate state
        if (item.item_type === 'recipe') {
            // Base
            setBaseId(`recipe:${item.ingredient_id}`);
            setBaseQty(item.quantity_input?.toString() || item.quantity_used.toString());
            setBaseUnit(item.unit_input || 'un');
            setEditingBaseId(item.id);
        } else {
            // Ingredient or Packaging
            const ing = ingredients.find((i: Ingredient) => i.id === item.ingredient_id);
            if (ing?.category === 'packaging') {
                setPackId(`ingredient:${item.ingredient_id}`);
                setPackQty(item.quantity_input?.toString() || item.quantity_used.toString());
                setEditingPackId(item.id);
            } else {
                setIngId(`ingredient:${item.ingredient_id}`);
                setIngQty(item.quantity_input?.toString() || item.quantity_used.toString());
                setIngUnit(item.unit_input || ing?.base_unit || 'g');
                setEditingIngId(item.id);
            }
        }
        // 2. NO LONGER REMOVE IMMEDIATELY
    };

    const selectedIngDetails = ingId ? ingredients.find((i: Ingredient) => i.id === ingId.split(':')[1]) : null;

    return (
        <div className="space-y-6">
            {/* 1. Ingredientes Comuns */}
            <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 ${editingIngId ? 'border-l-amber-400 ring-2 ring-amber-100' : 'border-l-amber-600'}`}>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <ShoppingCart size={20} className="text-amber-600" />
                    {editingIngId ? 'Editando Ingrediente' : 'Ingredientes'}
                </h3>
                <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-slate-50 p-4 rounded-lg">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-500 uppercase">Ingrediente</label>
                        <select
                            value={ingId}
                            onChange={(e) => setIngId(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg bg-white outline-none"
                        >
                            <option value="">Selecione...</option>
                            {foodIngredients.map((i: Ingredient) => (
                                <option key={i.id} value={`ingredient:${i.id}`}>{i.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:w-24">
                        <label className="text-xs font-bold text-slate-500 uppercase">Qtd</label>
                        <input
                            type="number"
                            value={ingQty}
                            onChange={(e) => setIngQty(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg outline-none"
                            placeholder="0"
                        />
                    </div>
                    <div className="w-full md:w-24">
                        <label className="text-xs font-bold text-slate-500 uppercase">Unidade</label>
                        <select
                            value={ingUnit}
                            onChange={(e) => setIngUnit(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg bg-white outline-none"
                            disabled={!ingId}
                        >
                            <option value="">-</option>
                            {selectedIngDetails ? (
                                <>
                                    <option value={selectedIngDetails.base_unit}>{selectedIngDetails.base_unit}</option>
                                    {selectedIngDetails.conversions?.map((c: any, idx: number) => (
                                        <option key={idx} value={c.name}>{c.name}</option>
                                    ))}
                                </>
                            ) : null}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        {editingIngId && (
                            <button
                                onClick={handleCancelEditIng}
                                className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition font-bold"
                                title="Cancelar Edição"
                            >
                                <X size={20} />
                            </button>
                        )}
                        <button
                            onClick={handleAddIngredient}
                            disabled={!ingId || !ingQty}
                            className={`px-4 py-2 text-white rounded-lg transition font-bold ${editingIngId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-amber-600 hover:bg-amber-700'} disabled:opacity-50`}
                            title={editingIngId ? "Salvar Alterações" : "Adicionar"}
                        >
                            {editingIngId ? <Save size={20} /> : <Plus size={20} />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {recipeItems.filter((i: RecipeItem) => (i.item_type === 'ingredient' || !i.item_type) && ingredients.find((ing: Ingredient) => ing.id === i.ingredient_id)?.category !== 'packaging').map((item: RecipeItem) => {
                        const ing = ingredients.find((i: Ingredient) => i.id === item.ingredient_id);
                        let cost = 0;
                        if (ing) {
                            cost = calculateItemCost(item, ingredients, baseRecipes).toNumber();
                        }
                        const isEditing = item.id === editingIngId;

                        return (
                            <div key={item.id} className={`flex justify-between items-center p-3 border-b transition ${isEditing ? 'bg-amber-50 border-amber-200' : 'hover:bg-slate-50'}`}>
                                <div>
                                    <div className="font-bold text-slate-800">{ing?.name || item.ingredient_name} {isEditing && <span className="text-xs text-amber-600 font-normal">(Editando...)</span>}</div>
                                    <span className="text-xs text-slate-500">{item.quantity_input} {item.unit_input}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-semibold text-slate-600">{ing ? `R$ ${cost.toFixed(2)}` : '--'}</span>
                                    <button onClick={() => handleEditItem(item)} className="text-slate-400 hover:text-amber-600 mr-2" disabled={!!editingIngId}><Edit size={16} /></button>
                                    <button onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 2. Bases Produzidas */}
            <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 ${editingBaseId ? 'border-l-blue-400 ring-2 ring-blue-100' : 'border-l-blue-600'}`}>
                <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                    <Layers size={20} className="text-blue-600" />
                    {editingBaseId ? 'Editando Insumo (Base)' : 'Insumos Produzidos (Bases)'}
                </h3>

                <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-blue-50 p-4 rounded-lg">
                    <div className="flex-1 w-full">
                        <select
                            value={baseId}
                            onChange={(e) => setBaseId(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg bg-white outline-none"
                        >
                            <option value="">Selecione uma base...</option>
                            {baseRecipes.map((r: Recipe) => (
                                <option key={r.id} value={`recipe:${r.id}`}>
                                    {r.name} (Custo: R$ {(r.unit_cost || 0).toFixed(2)} / {r.yield_unit})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:w-32">
                        <label className="text-xs font-bold text-slate-500 uppercase">Qtd</label>
                        <input
                            type="number"
                            value={baseQty}
                            onChange={(e) => setBaseQty(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg outline-none"
                            placeholder="Qtd"
                        />
                    </div>
                    <div className="w-full md:w-24">
                        <label className="text-xs font-bold text-slate-500 uppercase">Unidade</label>
                        <select
                            value={baseUnit}
                            onChange={(e) => setBaseUnit(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg bg-white outline-none"
                        >
                            <option value="un">un</option>
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="kg">kg</option>
                            <option value="l">l</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        {editingBaseId && (
                            <button
                                onClick={handleCancelEditBase}
                                className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition font-bold"
                            >
                                <X size={20} />
                            </button>
                        )}
                        <button
                            onClick={handleAddBase}
                            disabled={!baseId || !baseQty}
                            className={`px-4 py-2 text-white rounded-lg transition font-bold ${editingBaseId ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {editingBaseId ? <Save size={20} /> : <Plus size={20} />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {recipeItems.filter((i: RecipeItem) => i.item_type === 'recipe').map((item: RecipeItem) => {
                        const base = baseRecipes.find((r: Recipe) => r.id === item.ingredient_id);
                        let cost = 0;
                        if (base) {
                            cost = calculateItemCost(item, ingredients, baseRecipes).toNumber();
                        }
                        const isEditing = item.id === editingBaseId;

                        return (
                            <div key={item.id} className={`flex justify-between items-center p-3 border-b transition ${isEditing ? 'bg-blue-50 border-blue-200' : 'hover:bg-blue-50/30'}`}>
                                <div>
                                    <div className="font-bold text-slate-800 flex items-center gap-2">
                                        <Layers size={14} /> {item.ingredient_name}
                                        {isEditing && <span className="text-xs text-blue-600 font-normal">(Editando...)</span>}
                                    </div>
                                    <span className="text-xs text-slate-500">{item.quantity_input} {item.unit_input}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-semibold text-slate-600">{base ? `R$ ${cost.toFixed(2)}` : '--'}</span>
                                    <button onClick={() => handleEditItem(item)} className="text-slate-400 hover:text-blue-600 mr-2" disabled={!!editingBaseId}><Edit size={16} /></button>
                                    <button onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 3. Embalagens */}
            <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 ${editingPackId ? 'border-l-purple-400 ring-2 ring-purple-100' : 'border-l-purple-600'}`}>
                <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                    <Package size={20} className="text-purple-600" />
                    {editingPackId ? 'Editando Embalagem' : 'Embalagens'}
                </h3>

                <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-purple-50 p-4 rounded-lg">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-500 uppercase">Embalagem</label>
                        <select
                            value={packId}
                            onChange={(e) => setPackId(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg bg-white outline-none"
                        >
                            <option value="">Selecione...</option>
                            {packagingIngredients.map((i: Ingredient) => (
                                <option key={i.id} value={`ingredient:${i.id}`}>{i.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:w-32">
                        <label className="text-xs font-bold text-slate-500 uppercase">Qtd</label>
                        <input
                            type="number"
                            value={packQty}
                            onChange={(e) => setPackQty(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg outline-none"
                            placeholder="Qtd"
                        />
                    </div>
                    <div className="flex gap-2">
                        {editingPackId && (
                            <button
                                onClick={handleCancelEditPack}
                                className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition font-bold"
                            >
                                <X size={20} />
                            </button>
                        )}
                        <button
                            onClick={handleAddPackaging}
                            disabled={!packId || !packQty}
                            className={`px-4 py-2 text-white rounded-lg transition font-bold ${editingPackId ? 'bg-purple-500 hover:bg-purple-600' : 'bg-purple-600 hover:bg-purple-700'}`}
                        >
                            {editingPackId ? <Save size={20} /> : <Plus size={20} />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {recipeItems.filter((i: RecipeItem) => i.item_type === 'ingredient' && ingredients.find((ing: Ingredient) => ing.id === i.ingredient_id)?.category === 'packaging').map((item: RecipeItem) => {
                        const ing = ingredients.find((i: Ingredient) => i.id === item.ingredient_id);
                        let cost = 0;
                        if (ing) {
                            cost = calculateItemCost(item, ingredients, baseRecipes).toNumber();
                        }
                        const isEditing = item.id === editingPackId;

                        return (
                            <div key={item.id} className={`flex justify-between items-center p-3 border-b transition ${isEditing ? 'bg-purple-50 border-purple-200' : 'hover:bg-purple-50/30'}`}>
                                <div>
                                    <div className="font-bold text-slate-800 flex items-center gap-2">
                                        <Package size={14} /> {ing?.name || item.ingredient_name}
                                        {isEditing && <span className="text-xs text-purple-600 font-normal">(Editando...)</span>}
                                    </div>
                                    <span className="text-xs text-slate-500">{item.quantity_input} {item.unit_input}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-semibold text-slate-600">{ing ? `R$ ${cost.toFixed(2)}` : '--'}</span>
                                    <button onClick={() => handleEditItem(item)} className="text-slate-400 hover:text-purple-600 mr-2" disabled={!!editingPackId}><Edit size={16} /></button>
                                    <button onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};
