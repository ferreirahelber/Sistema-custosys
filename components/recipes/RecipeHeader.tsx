import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface RecipeHeaderProps {
    isEditing: boolean;
    isBaseRoute: boolean;
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({ isEditing, isBaseRoute }) => {
    return (
        <div className="flex items-center gap-4 mb-6">
            <Link to={isBaseRoute ? "/production-bases" : "/recipes"} className="p-2 hover:bg-slate-200 rounded-full transition">
                <ArrowLeft size={24} />
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{isEditing ? 'Editar Receita' : 'Nova Receita'}</h1>
                <p className="text-slate-500">Ficha técnica e precificação</p>
            </div>
        </div>
    );
};
