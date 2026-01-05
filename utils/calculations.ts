import { Unit, Ingredient, Settings, Recipe, RecipeItem } from '../types';

/**
 * Normalizes units to their base form (kg->g, l->ml) and calculates cost per base unit.
 */
export const calculateBaseCost = (
  price: number,
  amount: number,
  unit: Unit
): { baseCost: number; baseUnit: 'g' | 'ml' | 'un' } => {
  let multiplier = 1;
  let baseUnit: 'g' | 'ml' | 'un' = 'un';

  switch (unit) {
    case Unit.KG:
      multiplier = 1000;
      baseUnit = 'g';
      break;
    case Unit.G:
      multiplier = 1;
      baseUnit = 'g';
      break;
    case Unit.L:
      multiplier = 1000;
      baseUnit = 'ml';
      break;
    case Unit.ML:
      multiplier = 1;
      baseUnit = 'ml';
      break;
    case Unit.UN:
      multiplier = 1;
      baseUnit = 'un';
      break;
  }

  const totalBaseUnits = amount * multiplier;
  // Protect against division by zero
  const baseCost = totalBaseUnits > 0 ? price / totalBaseUnits : 0;

  return { baseCost, baseUnit };
};

/**
 * Calculates the full financial breakdown of a recipe.
 */
export const calculateRecipeFinancials = (
  items: RecipeItem[],
  ingredients: Ingredient[],
  prepTimeMinutes: number,
  yieldUnits: number,
  settings: Settings
): Partial<Recipe> => {
  // 1. Custo dos Materiais (Ingredientes)
  const total_cost_material = items.reduce((acc, item) => {
    // Tenta pegar o preço do ingrediente atualizado (da lista geral)
    // Se não achar, tenta usar o que já está no item (item.price) como fallback
    const ingredient = ingredients.find(i => i.id === item.ingredient_id);
    const costBase = ingredient ? ingredient.unit_cost_base : (item as any).price || 0;
    
    // quantity_used já deve estar na unidade base (g/ml/un)
    const qty = item.quantity_used || 0;
    
    return acc + (qty * costBase);
  }, 0);

  // 2. Custo da Mão de Obra
  const total_cost_labor = (prepTimeMinutes || 0) * (settings.cost_per_minute || 0);

  // 3. Custos Fixos (Overhead)
  // MELHORIA: Aplicamos a taxa sobre o "Custo Primário" (Material + Mão de Obra)
  // Isso reflete melhor a realidade do que aplicar apenas sobre o material.
  const prime_cost = total_cost_material + total_cost_labor;
  const total_cost_overhead = prime_cost * ((settings.fixed_overhead_rate || 0) / 100);

  // 4. Totais
  const total_cost_final = total_cost_material + total_cost_labor + total_cost_overhead;
  const unit_cost = yieldUnits > 0 ? total_cost_final / yieldUnits : 0;

  return {
    total_cost_material,
    total_cost_labor,
    total_cost_overhead,
    total_cost_final,
    unit_cost
  };
};

/**
 * Calculates the suggested selling price based on margin.
 * Formula: Price = Cost / (1 - (Tax + Fee + Margin))
 */
export const calculateSellingPrice = (
  unitCost: number,
  taxRate: number, // percentage 0-100
  cardFee: number, // percentage 0-100
  desiredMargin: number // percentage 0-100
): number => {
  const totalDeductions = (taxRate + cardFee + desiredMargin) / 100;
  
  // Prevent division by zero or negative prices if margins are unrealistic
  if (totalDeductions >= 1) return 0; 

  return unitCost / (1 - totalDeductions);
};

export const calculateMargin = (
  unitCost: number,
  sellingPrice: number,
  taxRate: number,
  cardFee: number
): number => {
  if (sellingPrice <= 0) return -100; 
  // Formula: Margem = 100% - (Custo/Preço) - Impostos - Taxas
  const deductionRate = (taxRate + cardFee) / 100;
  const costRate = unitCost / sellingPrice;
  const marginRate = 1 - costRate - deductionRate;
  
  return marginRate * 100;
};