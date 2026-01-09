import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Recipe, Ingredient } from '../types';
import { RecipeService } from '../services/recipeService';
import { IngredientService } from '../services/ingredientService'; // Necessário para a impressão
import { RecipePrintView } from './RecipePrintView';
import {
  ChefHat,
  Plus,
  Search,
  Printer,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export const RecipeList: React.FC = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]); // Para passar ao PrintView
  const [loading, setLoading] = useState(true);
  const [printingRecipe, setPrintingRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allRecipes, allIngredients] = await Promise.all([
        RecipeService.getAll(),
        IngredientService.getAll(),
      ]);
      setRecipes(allRecipes);
      setIngredients(allIngredients);
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (recipe: Recipe) => {
    toast.error(`Excluir a receita "${recipe.name}"?`, {
      description: 'Esta ação é irreversível.',
      action: {
        label: 'EXCLUIR',
        onClick: async () => {
          try {
            await RecipeService.delete(recipe.id);
            setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
            toast.success('Receita excluída.');
          } catch (e) {
            toast.error('Erro ao excluir.');
          }
        },
      },
      cancel: { label: 'Cancelar' },
      duration: 5000,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-amber-600 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modal de Impressão */}
      {printingRecipe && (
        <RecipePrintView
          recipe={printingRecipe}
          ingredients={ingredients}
          onClose={() => setPrintingRecipe(null)}
        />
      )}

      {/* Cabeçalho e Ações */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ChefHat className="text-amber-600" /> Minhas Receitas
          </h2>
          <p className="text-slate-500">Gerencie suas fichas técnicas</p>
        </div>
        <Link
          to="/recipes/new"
          className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition shadow-sm font-medium"
        >
          <Plus size={20} /> Nova Receita
        </Link>
      </div>

      {/* Lista Vazia */}
      {recipes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900">Nenhuma receita encontrada</h3>
          <p className="text-slate-500 mb-6">Comece criando sua primeira ficha técnica.</p>
          <Link
            to="/recipes/new"
            className="text-amber-600 font-medium hover:underline"
          >
            Cadastrar agora
          </Link>
        </div>
      ) : (
        /* Grid de Receitas */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((r) => (
            <div
              key={r.id}
              className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition group"
            >
              <div className="flex justify-between mb-2">
                <h3 className="font-bold text-lg text-slate-800 truncate" title={r.name}>
                  {r.name}
                </h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigate(`/recipes/${r.id}`)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md"
                    title="Editar"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => setPrintingRecipe(r)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                    title="Imprimir"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                <span className="flex items-center gap-1">
                   {r.preparation_time_minutes} min
                </span>
                <span className="flex items-center gap-1">
                   {r.yield_units} un
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                    Custo Unitário
                  </span>
                  <div className="text-xl font-bold text-amber-600">
                    R$ {r.unit_cost.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};