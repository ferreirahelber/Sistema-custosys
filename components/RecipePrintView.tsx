import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Recipe, Ingredient } from '../types'; // Importe Ingredient
import { Printer, X, ChefHat, DollarSign, Clock, Layers } from 'lucide-react';

interface Props {
  recipe: Recipe;
  ingredients: Ingredient[]; // <--- NOVO PROP: Recebe a lista de ingredientes
  onClose: () => void;
}

export const RecipePrintView: React.FC<Props> = ({ recipe, ingredients, onClose }) => {
  const [mode, setMode] = useState<'operational' | 'financial'>('operational');

  // Agora busca na lista passada via props, não mais no localStorage
  const getIngredientName = (id: string) => {
    const found = ingredients.find(i => i.id === id);
    return found ? found.name : 'Ingrediente excluído';
  };

  const content = (
    <div className="print-portal fixed inset-0 z-[9999] bg-slate-900/60 flex items-center justify-center overflow-y-auto backdrop-blur-sm print:bg-white print:fixed print:inset-0 print:z-[10000]">
      
      <style>
        {`
          @media print {
            body > *:not(.print-portal) { display: none !important; }
            #root { display: none !important; }
            .print-portal { 
                display: flex !important; 
                position: fixed; 
                top: 0; 
                left: 0; 
                width: 100%; 
                height: 100%; 
                background: white;
                align-items: flex-start;
                justify-content: center;
            }
            @page { margin: 0; size: auto; }
          }
        `}
      </style>

      {/* Controles (Não saem na impressão) */}
      <div className="fixed top-4 right-4 flex gap-2 print:hidden z-50">
        <div className="bg-white rounded-lg shadow-xl p-1 flex border border-slate-200">
            <button 
                onClick={() => setMode('operational')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition ${mode === 'operational' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
            >
                Modo Cozinha
            </button>
            <button 
                onClick={() => setMode('financial')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition ${mode === 'financial' ? 'bg-amber-600 text-white shadow' : 'text-slate-500 hover:text-amber-700'}`}
            >
                Modo Gerencial
            </button>
        </div>
        <button 
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-xl flex items-center gap-2 font-bold transition transform hover:scale-105"
        >
            <Printer size={20} /> IMPRIMIR
        </button>
        <button 
            onClick={onClose}
            className="bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 px-4 py-2 rounded-lg shadow-xl transition border border-slate-200"
        >
            <X size={24} />
        </button>
      </div>

      {/* A Folha de Papel A4 */}
      <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl mx-auto p-[15mm] text-slate-900 print:shadow-none print:w-full print:p-[10mm] relative animate-in fade-in zoom-in duration-300">
        
        {/* Cabeçalho */}
        <div className="border-b-4 border-slate-800 pb-6 mb-8 flex justify-between items-start">
            <div>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">Custosys Fichas Técnicas</span>
                <h1 className="text-4xl font-extrabold uppercase tracking-tight text-slate-900 mt-1 mb-4">{recipe.name}</h1>
                
                <div className="flex gap-6 text-sm font-medium">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded text-slate-700 border border-slate-200 print:border-slate-300">
                        <Clock size={16}/> 
                        <span>Preparo: <strong>{recipe.preparation_time_minutes} min</strong></span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded text-slate-700 border border-slate-200 print:border-slate-300">
                        <Layers size={16}/> 
                        <span>Rendimento: <strong>{recipe.yield_units} un</strong></span>
                    </div>
                    
                    {mode === 'financial' && (
                        <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded text-green-800 border border-green-200 print:border-slate-300 print:text-slate-900">
                            <DollarSign size={16}/> 
                            <span>Custo Unit: <strong>R$ {recipe.unit_cost.toFixed(2)}</strong></span>
                        </div>
                    )}
                </div>
            </div>
            <div className="text-right opacity-20 print:opacity-100">
                <ChefHat size={64} className="ml-auto text-slate-900"/>
            </div>
        </div>

        {/* Tabela de Ingredientes */}
        <div className="mb-10">
            <h3 className="text-sm font-bold uppercase tracking-wider border-b border-slate-300 pb-2 mb-4 text-slate-500">
                Lista de Ingredientes
            </h3>
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-900 font-bold border-y border-slate-300 uppercase text-xs">
                    <tr>
                        <th className="py-3 px-3 w-1/2">Ingrediente</th>
                        <th className="py-3 px-3 w-1/4">Quantidade</th>
                        {mode === 'financial' && <th className="py-3 px-3 w-1/4 text-right">Custo Estimado</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {recipe.items.map((item, idx) => {
                         const displayQty = item.quantity_input || item.quantity_used;
                         const displayUnit = item.unit_input || 'un';
                         
                         // Busca o ingrediente na lista passada via props
                         const baseIng = ingredients.find(i => i.id === item.ingredient_id);
                         const cost = baseIng ? (item.quantity_used * baseIng.unit_cost_base) : 0;

                         return (
                            <tr key={idx} className="print:break-inside-avoid">
                                <td className="py-3 px-3 font-semibold text-slate-800">
                                    {getIngredientName(item.ingredient_id)}
                                </td>
                                <td className="py-3 px-3 text-slate-700">
                                    {displayQty} <span className="text-xs uppercase">{displayUnit}</span>
                                </td>
                                {mode === 'financial' && (
                                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                                        R$ {cost.toFixed(2)}
                                    </td>
                                )}
                            </tr>
                         );
                    })}
                </tbody>
            </table>
        </div>

        {/* Modo de Preparo */}
        <div className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider border-b border-slate-300 pb-2 mb-4 text-slate-500">
                Instruções de Preparo
            </h3>
            
            {recipe.preparation_method ? (
                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap text-justify">
                    {recipe.preparation_method}
                </div>
            ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-lg min-h-[100px] p-6 text-slate-400 italic text-center flex items-center justify-center print:border-slate-300">
                    <p>Nenhuma instrução cadastrada.</p>
                </div>
            )}
        </div>

        {/* Rodapé Financeiro (Só Gerencial) */}
        {mode === 'financial' && (
            <div className="mt-auto border-t-2 border-slate-800 pt-6 print:break-inside-avoid">
                <h3 className="font-bold text-lg mb-4 text-slate-900">Resumo Financeiro do Lote</h3>
                <div className="flex gap-4">
                    <div className="flex-1 space-y-2 text-sm border-r border-slate-200 pr-4">
                         <div className="flex justify-between">
                            <span className="text-slate-600">Matéria Prima:</span>
                            <strong>R$ {recipe.total_cost_material.toFixed(2)}</strong>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-slate-600">Mão de Obra:</span>
                            <strong>R$ {recipe.total_cost_labor.toFixed(2)}</strong>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-slate-600">Custos Fixos:</span>
                            <strong>R$ {recipe.total_cost_overhead.toFixed(2)}</strong>
                         </div>
                    </div>
                    <div className="w-48 bg-slate-100 p-4 rounded text-center print:bg-slate-50 print:border print:border-slate-200">
                        <span className="block text-xs uppercase tracking-widest text-slate-500">Custo Total</span>
                        <span className="block text-2xl font-black text-slate-900">R$ {recipe.total_cost_final.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        )}

        {/* Rodapé da Página */}
        <div className="absolute bottom-4 left-0 w-full text-center text-[10px] text-slate-400 uppercase tracking-widest print:bottom-4">
            Gerado via Custosys • {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};