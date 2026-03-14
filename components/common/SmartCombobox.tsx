import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Settings, ChevronDown, Check, X } from 'lucide-react';

interface SmartComboboxProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onRename?: (oldValue: string, newValue: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}

export function SmartCombobox({ 
  label, 
  value, 
  options, 
  onChange, 
  onRename, 
  placeholder,
  icon 
}: SmartComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [oldRenameValue, setOldRenameValue] = useState('');
  const [isConfirmingRename, setIsConfirmingRename] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    setSearchTerm('');
  };

  const startRename = (e: React.MouseEvent, opt: string) => {
    e.stopPropagation();
    setOldRenameValue(opt);
    setRenameValue(opt);
    setIsRenaming(true);
    setIsOpen(false);
  };

  const handleConfirmRename = () => {
    if (onRename && renameValue.trim() !== '' && renameValue !== oldRenameValue) {
      onRename(oldRenameValue, renameValue.trim());
    }
    setIsRenaming(false);
    setIsConfirmingRename(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{label}</label>
      
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>
        
        <input
          type="text"
          value={isOpen ? searchTerm : value}
          onChange={(e) => {
            if (!isOpen) setIsOpen(true);
            setSearchTerm(e.target.value);
            if (!isOpen) onChange(e.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-slate-700 font-medium bg-white transition-all shadow-sm group-hover:border-amber-300"
          placeholder={placeholder || "Selecione ou digite..."}
        />
        
        <button 
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-amber-500 transition"
        >
          <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* DROPDOWN OPTIONS */}
      {isOpen && (
        <div className="absolute z-[60] mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-[240px] overflow-y-auto pt-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div 
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${
                    value === opt ? 'bg-amber-50 text-amber-700' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {value === opt && <Check size={14} className="text-amber-500" />}
                    <span className="text-sm font-medium">{opt}</span>
                  </div>
                  
                  {onRename && (
                    <button 
                      onClick={(e) => startRename(e, opt)}
                      className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-white rounded-md transition"
                      title="Editar nome"
                    >
                      <Settings size={14} />
                    </button>
                  )}
                </div>
              ))
            ) : searchTerm.trim() !== '' ? (
              <div 
                onClick={() => handleSelect(searchTerm)}
                className="px-4 py-3 text-sm text-slate-500 hover:bg-amber-50 hover:text-amber-700 cursor-pointer flex items-center gap-2 border-t border-slate-50"
              >
                <Plus size={14} /> Cadastrar novo: <span className="font-bold">"{searchTerm}"</span>
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-slate-400 text-xs italic">
                Nenhum resultado encontrado
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {isRenaming && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
            <h3 className="font-bold text-lg text-slate-800 mb-2">Editar Nome</h3>
            <p className="text-xs text-slate-500 mb-4 tracking-tight">Isso alterará o nome em todo o histórico de compras.</p>
            
            <input 
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium mb-6"
            />

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsRenaming(false)} 
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={() => setIsConfirmingRename(true)} 
                className="px-4 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 text-sm"
              >
                Salvar Alteração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION OVERLAY */}
      {isConfirmingRename && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 border-b-4 border-amber-500 animate-in bounce-in">
            <div className="flex justify-center mb-4">
               <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                  <Settings size={32} className="animate-spin-slow" />
               </div>
            </div>
            <h3 className="font-black text-center text-slate-800 mb-2">Confirmar Mudança?</h3>
            <p className="text-center text-xs text-slate-500 mb-6 leading-relaxed">
              Você está trocando <span className="font-bold text-slate-700">"{oldRenameValue}"</span> por <span className="font-bold text-amber-600">"{renameValue}"</span>. Esta ação não pode ser desfeita.
            </p>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={handleConfirmRename} 
                className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition flex items-center justify-center gap-2"
              >
                Sim, renomear agora
              </button>
              <button 
                onClick={() => setIsConfirmingRename(false)} 
                className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 transition text-sm"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
