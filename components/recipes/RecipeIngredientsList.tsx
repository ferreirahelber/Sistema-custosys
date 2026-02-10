import React from 'react';
import { Plus, Trash2, Layers, Package, ShoppingCart } from 'lucide-react';
import { Ingredient, Recipe, RecipeItem } from '../../types';

// Removendo props de controle de estado que não serão mais usadas diretamente
// Mas mantendo na interface por enquanto para não quebrar o pai (opcional, pode ser limpo depois)
interface RecipeIngredientsListProps {
    ingredients: Ingredient[];
    baseRecipes: Recipe[];
    recipeItems: RecipeItem[];
    // Estas props abaixo agora são opcionais ou ignoradas em favor do estado local
    selectedIngId: string; setSelectedIngId: (v: string) => void;
    itemQuantity: string; setItemQuantity: (v: string) => void;
    selectedUnit: string; setSelectedUnit: (v: string) => void;
    baseQuantity: string; setBaseQuantity: (v: string) => void;

    onAddItem: (id?: string, qty?: string, unit?: string) => void;
    onRemoveItem: (id: string) => void;
}

export const RecipeIngredientsList: React.FC<RecipeIngredientsListProps> = ({
    ingredients, baseRecipes, recipeItems,
    onAddItem, onRemoveItem
}) => {
    // ESTADOS LOCAIS PARA CADA SEÇÃO - ISOLAMENTO TOTAL

    // 1. Ingredientes
    const [ingId, setIngId] = React.useState('');
    const [ingQty, setIngQty] = React.useState('');
    const [ingUnit, setIngUnit] = React.useState('');

    // 2. Bases
    const [baseId, setBaseId] = React.useState('');
    const [baseQty, setBaseQty] = React.useState('');
    const [baseUnit, setBaseUnit] = React.useState('');

    // 3. Embalagens
    const [packId, setPackId] = React.useState('');
    const [packQty, setPackQty] = React.useState('');
    // const [packUnit, setPackUnit] = React.useState(''); // Embalagens geralmente são UN, mas podemos adicionar se precisar

    const foodIngredients = ingredients.filter(i => i.category !== 'product' && i.category !== 'packaging');
    const packagingIngredients = ingredients.filter(i => i.category === 'packaging');

    // Helpers para adicionar zerando os inputs locais
    const handleAddIngredient = () => {
        onAddItem(ingId, ingQty, ingUnit);
        setIngId('');
        setIngQty('');
        setIngUnit('');
    };

    const handleAddBase = () => {
        onAddItem(baseId, baseQty, baseUnit);
        setBaseId('');
        setBaseQty('');
        setBaseUnit('');
    };

    const handleAddPackaging = () => {
        onAddItem(packId, packQty, 'un');
        setPackId('');
        setPackQty('');
    };

    // Detalhes do selecionado para mostrar unidades
    const selectedIngDetails = ingId ? ingredients.find(i => i.id === ingId.split(':')[1]) : null;

    return (
        <div className="space-y-6">
            {/* 1. Ingredientes Comuns */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><ShoppingCart size={20} className="text-amber-600" /> Ingredientes</h3>
                <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-slate-50 p-4 rounded-lg">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-500 uppercase">Ingrediente</label>
                        <select
                            value={ingId}
                            onChange={(e) => setIngId(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg bg-white outline-none"
                        >
                            <option value="">Selecione...</option>
                            {foodIngredients.map((i) => (
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
                                    {selectedIngDetails.conversions?.map((c, idx) => (
                                        <option key={idx} value={c.name}>{c.name}</option>
                                    ))}
                                </>
                            ) : null}
                        </select>
                    </div>
                    <button
                        onClick={handleAddIngredient}
                        disabled={!ingId || !ingQty}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition font-bold"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="space-y-2">
                    {recipeItems.filter(i => (i.item_type === 'ingredient' || !i.item_type) && ingredients.find(ing => ing.id === i.ingredient_id)?.category !== 'packaging').map((item) => {
                        const ing = ingredients.find(i => i.id === item.ingredient_id);
                        const cost = (ing?.unit_cost_base || 0) * item.quantity_used;
                        return (
                            <div key={item.id} className="flex justify-between items-center p-3 border-b hover:bg-slate-50 transition">
                                <div>
                                    <div className="font-bold text-slate-800">{ing?.name || item.ingredient_name}</div>
                                    <span className="text-xs text-slate-500">{item.quantity_input} {item.unit_input}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-semibold text-slate-600">{ing ? `R$ ${cost.toFixed(2)}` : '--'}</span>
                                    <button onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 2. Bases Produzidas */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-blue-600">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                    <Layers size={20} className="text-blue-600" /> Insumos Produzidos (Bases)
                </h3>

                <div className="flex flex-col md:flex-row gap-3 items-end mb-6 bg-blue-50 p-4 rounded-lg">
                    <div className="flex-1 w-full">
                        <select
                            value={baseId}
                            onChange={(e) => setBaseId(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg bg-white outline-none"
                        >
                            <option value="">Selecione uma base...</option>
                            {baseRecipes.map((r) => (
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
                    <button
                        onClick={handleAddBase}
                        disabled={!baseId || !baseQty}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="space-y-2">
                    {recipeItems.filter(i => i.item_type === 'recipe').map((item) => {
                        const base = baseRecipes.find(r => r.id === item.ingredient_id);
                        let cost = 0;
                        if (base) {
                            // Lógica Simplificada de estimativa visual (o cálculo real é no financials)
                            cost = (base.unit_cost || 0) * item.quantity_used;
                            // Nota: Isso é apenas estimativa visual. O hook useRecipeForm faz o calculo real.
                        }

                        return (
                            <div key={item.id} className="flex justify-between items-center p-3 border-b hover:bg-blue-50/30 transition">
                                <div>
                                    <div className="font-bold text-slate-800 flex items-center gap-2"><Layers size={14} /> {item.ingredient_name}</div>
                                    <span className="text-xs text-slate-500">{item.quantity_input} {item.unit_input}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-semibold text-slate-600">{base ? `R$ ${cost.toFixed(2)}` : '--'}</span>
                                    <button onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            {/* 3. Embalagens */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-purple-600">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                    <Package size={20} className="text-purple-600" /> Embalagens
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
                            {packagingIngredients.map((i) => (
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
                    <button
                        onClick={handleAddPackaging}
                        disabled={!packId || !packQty}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-bold"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="space-y-2">
                    {recipeItems.filter(i => i.item_type === 'ingredient' && ingredients.find(ing => ing.id === i.ingredient_id)?.category === 'packaging').map((item) => {
                        const ing = ingredients.find(i => i.id === item.ingredient_id);
                        const cost = (ing?.unit_cost_base || 0) * item.quantity_used;

                        return (
                            <div key={item.id} className="flex justify-between items-center p-3 border-b hover:bg-purple-50/30 transition">
                                <div>
                                    <div className="font-bold text-slate-800 flex items-center gap-2"><Package size={14} /> {ing?.name || item.ingredient_name}</div>
                                    <span className="text-xs text-slate-500">{item.quantity_input} {item.unit_input}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-semibold text-slate-600">{ing ? `R$ ${cost.toFixed(2)}` : '--'}</span>
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
