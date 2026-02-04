import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Recipe, Category } from '../types';
import { CategoryService } from '../services/categoryService';
import { RecipeService } from '../services/recipeService';
import {
  Plus, Search, ChefHat, Layers, Clock, Users, Trash2, Edit, Printer,
  Barcode, TrendingUp, DollarSign, AlertTriangle, FileText, X, Loader2, Tag,
} from 'lucide-react';
import { toast } from 'sonner';

// --- COMPONENTE DE IMPRESSÃO ---
const PrintableRecipe = ({ recipe, mode }: { recipe: Recipe | null, mode: 'kitchen' | 'manager' | null }) => {
  if (!recipe || !mode) return null;

  return (
    <div id="printable-content">
      {/* Cabeçalho */}
      <div className="border-b-2 border-black pb-4 mb-6">
        <h1 className="text-4xl font-bold uppercase tracking-wide text-black">{recipe.name}</h1>
        <div className="flex justify-between mt-2 text-sm text-black">
          <span><strong>Código:</strong> {recipe.barcode || 'N/A'}</span>
          <span><strong>Impresso em:</strong> {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-4 mb-6 border-b border-gray-300 pb-6 text-black">
        <div>
          <p className="mb-1"><strong>Tempo de Preparo:</strong> {recipe.preparation_time_minutes} min</p>
          <p><strong>Rendimento:</strong> {recipe.yield_units} unidades</p>
        </div>
        {mode === 'manager' && (
          <div className="text-right">
            <p className="mb-1"><strong>Custo Total:</strong> R$ {recipe.total_cost_final.toFixed(2)}</p>
            <p className="mb-1"><strong>Custo Unitário:</strong> R$ {recipe.unit_cost.toFixed(2)}</p>
            <p><strong>Preço de Venda:</strong> R$ {recipe.selling_price?.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Ingredientes */}
      <div className="mb-8 text-black">
        <h2 className="text-xl font-bold mb-3 uppercase border-b border-black w-full pb-1">Ingredientes</h2>
        <ul className="list-disc pl-5 space-y-2">
          {recipe.items.map((item, idx) => {
            const unitCost = item.ingredient?.unit_cost_base || 0;
            const totalItemCost = item.quantity_used * unitCost;

            return (
              <li key={idx} className="text-base break-inside-avoid">
                <span className="font-bold">{item.quantity_input} {item.unit_input}</span> de {item.ingredient_name}

                {mode === 'manager' && (
                  <span className="text-xs ml-2 italic text-gray-600">
                    (Custo Aprox: R$ {totalItemCost.toFixed(2)})
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Modo de Preparo */}
      <div className="mb-8 text-black">
        <h2 className="text-xl font-bold mb-3 uppercase border-b border-black w-full pb-1">Modo de Preparo</h2>
        <div className="whitespace-pre-wrap text-base leading-relaxed text-justify">
          {recipe.preparation_method || "Nenhum modo de preparo registrado."}
        </div>
      </div>

      {/* Rodapé Gerencial */}
      {mode === 'manager' && (
        <div className="mt-10 p-4 border border-gray-400 bg-gray-100 rounded text-black break-inside-avoid page-break-inside-avoid">
          <h3 className="font-bold text-sm uppercase mb-2 border-b border-gray-300 pb-1">Análise Financeira Detalhada</h3>
          <div className="grid grid-cols-3 gap-4 text-xs mt-2">
            <div>
              <span className="block text-gray-600 font-bold uppercase text-[10px]">Materiais</span>
              <span className="text-sm">R$ {recipe.total_cost_material.toFixed(2)}</span>
            </div>
            <div>
              <span className="block text-gray-600 font-bold uppercase text-[10px]">Mão de Obra</span>
              <span className="text-sm">R$ {recipe.total_cost_labor.toFixed(2)}</span>
            </div>
            <div>
              <span className="block text-gray-600 font-bold uppercase text-[10px]">Custos Fixos</span>
              <span className="text-sm">R$ {recipe.total_cost_overhead.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-300 flex justify-between items-center">
            <span className="font-bold uppercase text-xs">Margem de Lucro Estimada:</span>
            <span className="font-bold text-base">
              R$ {((recipe.selling_price || 0) - recipe.unit_cost).toFixed(2)} /un
            </span>
          </div>
        </div>
      )}

      <div className="mt-12 text-center text-[10px] text-gray-400 border-t pt-4 pb-10">
        Documento gerado pelo sistema Custosys.
      </div>
    </div>
  );
};

interface RecipeListProps {
  isBaseFilter?: boolean;
}

export function RecipeList({ isBaseFilter = false }: RecipeListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modais
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null; name: string }>({
    open: false, id: null, name: ''
  });

  const [printConfig, setPrintConfig] = useState<{ open: boolean; recipe: Recipe | null; mode: 'kitchen' | 'manager' | null }>({
    open: false, recipe: null, mode: null
  });

  useEffect(() => {
    loadData();
  }, [isBaseFilter]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Tenta buscar Receitas (Crítico - sem isto, não carrega nada)
      const { data: recipesData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .order('name');

      if (recipeError) throw recipeError;
      setRecipes(recipesData || []);

      // Filtra as receitas baseadas no menu selecionado (Bases ou Produtos Finais)
      const data = recipesData || [];
      setRecipes(data.filter(r => (r.is_base || false) === isBaseFilter));

      // 2. Tenta buscar Categorias (Não-crítico - Se falhar, não quebra a tela inteira)
      try {
        const categoriesData = await CategoryService.getAll();
        setCategories(categoriesData || []);
      } catch (catError) {
        console.error("Erro ao carregar categorias:", catError);
        // Não jogamos throw aqui para permitir que as receitas apareçam sem categorias
        toast.warning('Categorias indisponíveis no momento');
      }

    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar lista de receitas');
    } finally {
      setLoading(false);
    }
  }

  const requestDelete = (recipe: Recipe) => {
    setDeleteModal({ open: true, id: recipe.id, name: recipe.name });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;

    // Cria uma variável para o toast de carregamento
    const toastId = toast.loading('Excluindo...');

    try {
      // Chama o serviço de deleção
      await RecipeService.delete(deleteModal.id);

      // Atualiza o estado local para remover o card da tela imediatamente
      setRecipes(recipes.filter(r => r.id !== deleteModal.id));

      // Feedback de sucesso
      toast.success(`${isBaseFilter ? 'Insumo' : 'Receita'} excluída com sucesso!`, { id: toastId });

      // Fecha o modal
      setDeleteModal({ open: false, id: null, name: '' });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir. Verifique se este item está sendo usado em outra receita.', { id: toastId });
    }
  };

  const requestPrint = (recipe: Recipe) => {
    setPrintConfig({ open: true, recipe, mode: null });
  };

  const executePrint = async (mode: 'kitchen' | 'manager') => {
    if (!printConfig.recipe) return;

    try {
      const { data: fullRecipe, error } = await supabase
        .from('recipes')
        .select(`*, items:recipe_items(*, ingredient:ingredients(name, base_unit, unit_cost_base))`)
        .eq('id', printConfig.recipe.id)
        .single();

      if (error || !fullRecipe) throw new Error("Erro ao carregar detalhes");

      const formattedRecipe = {
        ...fullRecipe,
        items: fullRecipe.items.map((i: any) => ({
          ...i,
          ingredient_name: i.ingredient?.name || 'Ingrediente',
          ingredient: i.ingredient
        }))
      };

      setPrintConfig({ open: false, recipe: formattedRecipe, mode });

      setTimeout(() => {
        window.print();
        setTimeout(() => setPrintConfig({ open: false, recipe: null, mode: null }), 1000);
      }, 500);

    } catch (e) {
      toast.error("Erro ao preparar impressão.");
    }
  };

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.barcode && r.barcode.includes(searchTerm));
    const matchesCategory = selectedCategory === 'Todas' || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in relative">

      <style>
        {`
          @media screen {
            #printable-content {
              display: none !important;
            }
          }

          @media print {
            body * {
              visibility: hidden;
            }
            
            #printable-content, #printable-content * {
              visibility: visible;
            }

            #printable-content {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 20px;
              background: white;
              color: black;
              z-index: 9999;
            }

            .break-inside-avoid, .page-break-inside-avoid {
                break-inside: avoid;
                page-break-inside: avoid;
            }

            @page {
              size: auto;
              margin: 1cm;
            }
            
            html, body {
              height: auto !important;
              overflow: visible !important;
              background: white !important;
            }

            nav, aside, header, footer, .toaster, .fixed {
              display: none !important;
            }
          }

          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>

      <PrintableRecipe recipe={printConfig.recipe} mode={printConfig.mode} />

      {/* Barra de Ferramentas */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 print:hidden">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar receita ou código..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-amber-500 transition"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Link
          to={isBaseFilter ? "/production-bases/new" : "/recipes/new"}
          className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-amber-600/20"
        >
          <Plus size={20} /> {isBaseFilter ? "Novo Insumo" : "Nova Receita"}
        </Link>
      </div>

      {/* Filtro de Categorias */}
      <div className="flex gap-2 overflow-x-auto pb-2 print:hidden scrollbar-hide bg-white p-3 rounded-xl shadow-sm border border-slate-200">
        <button
          onClick={() => setSelectedCategory('Todas')}
          className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${selectedCategory === 'Todas'
            ? 'bg-amber-600 text-white shadow-md'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
        >
          <Tag size={14} className="inline mr-1" /> Todas
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.name)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${selectedCategory === cat.name
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid de Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center print:hidden">
          <Loader2 className="animate-spin mb-4 text-amber-600" size={32} />
          Carregando receitas...
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed print:hidden">
          <ChefHat size={64} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg">Nenhuma receita encontrada.</p>
          <p className="text-sm opacity-70">Cadastre sua primeira receita no botão acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:hidden">
          {filteredRecipes.map((recipe) => (
            <div key={recipe.id} className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-amber-200 transition-all duration-300 group flex flex-col justify-between overflow-hidden relative">

              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 pr-2">
                    <h3 className="font-bold text-lg text-slate-800 leading-tight group-hover:text-amber-600 transition-colors">
                      {recipe.name}
                    </h3>
                    {recipe.category && (
                      <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-200">
                        <Tag size={10} /> {recipe.category}
                      </div>
                    )}
                    {recipe.barcode ? (
                      <div className="inline-flex items-center gap-1 mt-2 ml-2 px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-200">
                        <Barcode size={10} /> {recipe.barcode}
                      </div>
                    ) : null}
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg text-amber-600 shadow-sm">
                    {isBaseFilter ? <Layers size={22} className="text-blue-600" /> : <ChefHat size={22} />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1"><DollarSign size={10} /> Custo</span>
                    <span className="font-bold text-slate-600 text-sm">R$ {recipe.unit_cost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1"><TrendingUp size={10} /> Venda</span>
                    <span className="font-bold text-emerald-600 text-sm">R$ {recipe.selling_price?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex flex-col pt-2 border-t border-slate-50">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1"><Clock size={10} /> Tempo</span>
                    <span className="font-medium text-slate-500 text-xs">{recipe.preparation_time_minutes} min</span>
                  </div>
                  <div className="flex flex-col pt-2 border-t border-slate-50">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1"><Users size={10} /> Rendimento</span>
                    <span className="font-medium text-slate-500 text-xs">{recipe.yield_units} un</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/80 border-t border-slate-100 p-3 flex justify-between items-center px-5">
                <button
                  onClick={() => requestPrint(recipe)}
                  title="Imprimir"
                  className="text-slate-400 hover:text-slate-700 transition hover:bg-slate-200 p-1.5 rounded-full"
                >
                  <Printer size={18} />
                </button>

                <div className="flex gap-3">
                  <Link
                    to={isBaseFilter ? `/production-bases/edit/${recipe.id}` : `/recipes/${recipe.id}`}
                    className="flex items-center gap-1 text-slate-500 hover:text-amber-600 font-bold text-xs transition px-3 py-1.5 rounded-lg hover:bg-white hover:shadow-sm"
                  >
                    <Edit size={16} /> Editar
                  </Link>
                  <button
                    onClick={() => requestDelete(recipe)}
                    className="text-slate-300 hover:text-red-500 transition p-1.5 hover:bg-red-50 rounded-full"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in print:hidden">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Excluir Receita?</h3>
                <p className="text-sm text-slate-500 leading-tight mt-1">
                  Tem certeza que deseja apagar <strong>"{deleteModal.name}"</strong>?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setDeleteModal({ open: false, id: null, name: '' })} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE OPÇÕES DE IMPRESSÃO */}
      {printConfig.open && !printConfig.mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in print:hidden">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-0 overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Printer size={18} /> Imprimir Receita
              </h3>
              <button onClick={() => setPrintConfig({ open: false, recipe: null, mode: null })} className="text-slate-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <h4 className="font-bold text-xl text-slate-800">{printConfig.recipe?.name}</h4>
                <p className="text-sm text-slate-500">Selecione o modelo:</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => executePrint('kitchen')}
                  className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-amber-500 hover:bg-amber-50 group transition text-left"
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-amber-200 group-hover:text-amber-700 transition">
                    <ChefHat size={20} />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-700 group-hover:text-amber-800">Modo Cozinha</span>
                    <span className="text-xs text-slate-400 group-hover:text-amber-600">Apenas ingredientes e preparo.</span>
                  </div>
                </button>
                <button
                  onClick={() => executePrint('manager')}
                  className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 group transition text-left"
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-blue-200 group-hover:text-blue-700 transition">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-700 group-hover:text-blue-800">Modo Gerencial</span>
                    <span className="text-xs text-slate-400 group-hover:text-blue-600">Completo com custos e lucro.</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}