import { Settings, Ingredient, Recipe } from '../types';

const KEYS = {
  SETTINGS: 'custosys_settings_v2', // Changed key to force refresh structure if needed
  INGREDIENTS: 'custosys_ingredients',
  RECIPES: 'custosys_recipes',
};

export const defaultSettings: Settings = {
  employees: [],
  labor_monthly_cost: 0,
  work_hours_monthly: 0,
  fixed_overhead_rate: 0,
  cost_per_minute: 0,
};

export const StorageService = {
  getSettings: (): Settings => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (!data) return defaultSettings;
    
    const parsed = JSON.parse(data);
    // Backward compatibility check
    if (!parsed.employees) {
      return { ...defaultSettings, ...parsed, employees: [] };
    }
    return parsed;
  },
  
  saveSettings: (settings: Settings) => {
    // Recalculate totals based on employees if present
    let totalCost = settings.labor_monthly_cost;
    let totalHours = settings.work_hours_monthly;

    if (settings.employees && settings.employees.length > 0) {
      totalCost = settings.employees.reduce((acc, emp) => acc + emp.salary, 0);
      totalHours = settings.employees.reduce((acc, emp) => acc + emp.hours_monthly, 0);
    }

    const minutes = totalHours * 60;
    const costPerMinute = minutes > 0 ? totalCost / minutes : 0;
    
    const toSave: Settings = { 
      ...settings, 
      labor_monthly_cost: totalCost,
      work_hours_monthly: totalHours,
      cost_per_minute: costPerMinute 
    };

    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(toSave));
    return toSave;
  },

  getIngredients: (): Ingredient[] => {
    const data = localStorage.getItem(KEYS.INGREDIENTS);
    return data ? JSON.parse(data) : [];
  },
  saveIngredient: (ingredient: Ingredient) => {
    const current = StorageService.getIngredients();
    const existingIndex = current.findIndex(i => i.id === ingredient.id);
    if (existingIndex >= 0) {
      current[existingIndex] = ingredient;
    } else {
      current.push(ingredient);
    }
    localStorage.setItem(KEYS.INGREDIENTS, JSON.stringify(current));
    return current;
  },
  deleteIngredient: (id: string) => {
    const current = StorageService.getIngredients();
    const updated = current.filter(i => i.id !== id);
    localStorage.setItem(KEYS.INGREDIENTS, JSON.stringify(updated));
    return updated;
  },

  getRecipes: (): Recipe[] => {
    const data = localStorage.getItem(KEYS.RECIPES);
    return data ? JSON.parse(data) : [];
  },
  saveRecipe: (recipe: Recipe) => {
    const current = StorageService.getRecipes();
    const existingIndex = current.findIndex(r => r.id === recipe.id);
    if (existingIndex >= 0) {
      current[existingIndex] = recipe;
    } else {
      current.push(recipe);
    }
    localStorage.setItem(KEYS.RECIPES, JSON.stringify(current));
    return current;
  },
  deleteRecipe: (id: string) => {
    const current = StorageService.getRecipes();
    const updated = current.filter(r => r.id !== id);
    localStorage.setItem(KEYS.RECIPES, JSON.stringify(updated));
    return updated;
  }
};