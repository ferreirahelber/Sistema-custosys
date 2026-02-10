import React from 'react';
import { BookOpen } from 'lucide-react';

interface RecipePreparationProps {
    method: string;
    setMethod: (v: string) => void;
}

export const RecipePreparation: React.FC<RecipePreparationProps> = ({ method, setMethod }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-amber-600" /> Modo de Preparo
            </h3>
            <textarea
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="Descreva o passo a passo da sua receita..."
                className="w-full px-4 py-3 border rounded-lg outline-none h-40 resize-y text-slate-700 focus:ring-2 focus:ring-amber-500"
            />
        </div>
    );
};
