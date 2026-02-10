import React, { useState } from 'react';
import { Category } from '../types';
import { X, Trash2, Edit2, Check, AlertTriangle, Loader2, Save, Plus } from 'lucide-react';
import { useCategories, useCategoryMutations } from '../hooks/useSystem';

interface Props {
  isOpen?: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function CategoryManager({ isOpen = true, onClose, onUpdate }: Props) {
  const { data: categories = [], isLoading: loading } = useCategories();
  const { updateCategory, deleteCategory, createCategory } = useCategoryMutations();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setDeletingId(null);
    setIsAdding(false);
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await updateCategory.mutateAsync({ id, name: editName });
      setEditingId(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDelete = async (cat: Category) => {
    try {
      await deleteCategory.mutateAsync({ id: cat.id, name: cat.name });
      setDeletingId(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createCategory.mutateAsync(newName);
      setNewName('');
      setIsAdding(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      // Error handled by hook
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="p-5 bg-white border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-slate-800">Gerenciar Categorias</h3>
            <p className="text-xs text-slate-400 font-medium">Adicione ou edite categorias de receitas.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-amber-500" />
            </div>
          ) : categories.length === 0 && !isAdding ? (
            <div className="text-center text-slate-400 py-12 flex flex-col items-center opacity-60">
              <AlertTriangle size={48} strokeWidth={1} className="mb-2" />
              <p>Nenhuma categoria encontrada.</p>
            </div>
          ) : (
            <>
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${editingId === cat.id ? 'bg-white border-blue-200 shadow-md ring-2 ring-blue-50' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                >
                  {editingId === cat.id ? (
                    <div className="flex flex-1 items-center gap-2 animate-in fade-in">
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:bg-blue-50/30 transition text-slate-700 font-medium"
                      />
                      <button onClick={() => handleUpdate(cat.id)} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm" disabled={updateCategory.isPending}>
                        {updateCategory.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition">
                        <X size={16} />
                      </button>
                    </div>
                  ) : deletingId === cat.id ? (
                    <div className="flex flex-1 items-center justify-between bg-red-50 p-2 rounded-lg animate-in fade-in border border-red-100">
                      <span className="text-xs text-red-700 font-bold flex items-center gap-1.5 pl-1">
                        <AlertTriangle size={14} /> Excluir "{cat.name}"?
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => setDeletingId(null)} className="px-3 py-1.5 bg-white text-slate-600 text-xs font-bold rounded-lg border hover:bg-slate-50 transition">Cancelar</button>
                        <button onClick={() => handleDelete(cat)} className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition shadow-sm" disabled={deleteCategory.isPending}>Sim</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-slate-700 text-sm font-bold pl-1">{cat.name}</span>
                      <div className="flex gap-1 opacity-60 hover:opacity-100 transition">
                        <button onClick={() => startEdit(cat)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeletingId(cat.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Add New Row */}
              {isAdding && (
                <div className="flex items-center gap-2 p-3.5 bg-white rounded-xl border border-amber-200 shadow-md ring-2 ring-amber-50 animate-in slide-in-from-bottom-2">
                  <input
                    autoFocus
                    placeholder="Nome da categoria..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400 focus:bg-amber-50/30 transition text-slate-700 font-medium"
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  />
                  <button onClick={handleCreate} className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition shadow-sm" disabled={createCategory.isPending}>
                    {createCategory.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                  <button onClick={() => setIsAdding(false)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition">
                    <X size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center gap-4">
          {isAdding ? (
            <span className="text-xs text-slate-400 font-medium animate-in fade-in">Pressione Enter para salvar.</span>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex justify-center items-center gap-2 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition shadow-lg shadow-slate-200 active:scale-95"
            >
              <Plus size={18} /> Nova Categoria
            </button>
          )}
        </div>
      </div>
    </div>
  );
}