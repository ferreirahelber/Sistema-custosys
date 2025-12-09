import React, { useState, useEffect } from 'react';
import { SettingsForm } from './components/SettingsForm';
import { IngredientForm } from './components/IngredientForm';
import { RecipeForm } from './components/RecipeForm';
import { CostingView } from './components/CostingView';
import { StorageService } from './services/storage';
import { Settings as SettingsIcon, Calculator, ChefHat, Package, LayoutDashboard, DollarSign } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'settings' | 'ingredients' | 'recipes' | 'costs'>('settings');
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if initial configuration exists
    const settings = StorageService.getSettings();
    if (settings.labor_monthly_cost > 0 && settings.work_hours_monthly > 0) {
      setIsConfigured(true);
      setView('recipes'); // Default to recipes if configured
    }
  }, []);

  const handleSettingsSaved = () => {
    setIsConfigured(true);
    // Optionally stay on settings or move to ingredients
  };

  const NavItem = ({ id, label, icon: Icon }: { id: typeof view, label: string, icon: any }) => (
    <button
      onClick={() => setView(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left transition-all ${
        view === id 
          ? 'bg-amber-100 text-amber-900 font-medium' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={20} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center text-white font-bold">
            C
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Custosys</h1>
        </div>

        <nav className="space-y-1 flex-1">
          <NavItem id="settings" label="Configurações" icon={SettingsIcon} />
          <NavItem id="ingredients" label="Ingredientes" icon={Package} />
          <NavItem id="recipes" label="Minhas Receitas" icon={ChefHat} />
          <NavItem id="costs" label="Simulador & Custos" icon={DollarSign} />
        </nav>

        {!isConfigured && (
          <div className="mt-auto bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-800">
            <p className="font-medium mb-1">Passo 1:</p>
            <p>Configure seus custos fixos e mão de obra para começar.</p>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">
            {view === 'settings' && 'Configurações Globais'}
            {view === 'ingredients' && 'Gestão de Ingredientes'}
            {view === 'recipes' && 'Gerenciamento de Receitas'}
            {view === 'costs' && 'Simulador de Preços'}
          </h2>
          <p className="text-slate-500">
            {view === 'settings' && 'Defina os colaboradores e parâmetros base para o cálculo da sua mão de obra.'}
            {view === 'ingredients' && 'Cadastre seus insumos com conversão automática de medidas.'}
            {view === 'recipes' && 'Crie fichas técnicas detalhadas com custos automáticos.'}
            {view === 'costs' && 'Analise custos, simule margens e defina preços de venda.'}
          </p>
        </header>

        {view === 'settings' && <SettingsForm onSave={handleSettingsSaved} />}
        {view === 'ingredients' && <IngredientForm />}
        {view === 'recipes' && <RecipeForm />}
        {view === 'costs' && <CostingView />}
      </main>
    </div>
  );
}