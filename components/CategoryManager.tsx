import React, { useState, useEffect } from 'react';
import { CategoryService } from '../services/categoryService';
import { Category } from '../types';
import { X, Trash2, Edit2, Save, Loader2, AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
  onUpdate: () => void; // Para atualizar a lista no componente pai
}

export function CategoryManager({ onClose, onUpdate }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await CategoryService.getAll();
      setCategories(data || []);
    } catch (error) {
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setDeletingId(null);
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await CategoryService.update(id, editName);
      toast.success('Categoria atualizada!');
      setEditingId(null);
      loadCategories();
      onUpdate(); // Atualiza a tela pai
    } catch (error) {
      toast.error('Erro ao atualizar.');
    }
  };

  const handleDelete = async (cat: Category) => {
    try {
      await CategoryService.delete(cat.id, cat.name);
      toast.success('Categoria excluída!');
      setDeletingId(null);
      loadCategories();
      onUpdate(); // Atualiza a tela pai
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-4 bg-slate-800 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg">Gerenciar Categorias</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition">
            <X size={20} />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-400"/></div>
          ) : categories.length === 0 ? (
            <div className="text-center text-slate-400 py-8">Nenhuma categoria cadastrada.</div>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg group hover:border-blue-200 transition">
                
                {editingId === cat.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input 
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="flex-1 p-1.5 border border-blue-400 rounded text-sm outline-none"
                    />
                    <button onClick={() => handleUpdate(cat.id)} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={16}/></button>
                    <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-500 rounded hover:bg-slate-200"><X size={16}/></button>
                  </div>
                ) : deletingId === cat.id ? (
                  <div className="flex flex-1 items-center justify-between bg-red-50 p-1 rounded">
                    <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                      <AlertTriangle size={12}/> Confirmar exclusão?
                    </span>
                    <div className="flex gap-1">
                       <button onClick={() => handleDelete(cat)} className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700">Sim</button>
                       <button onClick={() => setDeletingId(null)} className="px-3 py-1 bg-white text-slate-600 text-xs font-bold rounded border hover:bg-slate-50">Não</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-slate-700">{cat.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(cat)} className="p-2 text-blue-500 hover:bg-blue-50 rounded" title="Editar"><Edit2 size={16}/></button>
                      <button onClick={() => setDeletingId(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Excluir"><Trash2 size={16}/></button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}