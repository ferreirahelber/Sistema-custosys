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
  // 1. Material Cost
  const total_cost_material = items.reduce((acc, item) => {
    const ingredient = ingredients.find(i => i.id === item.ingredient_id);
    if (!ingredient) return acc;
    return acc + (item.quantity_used * ingredient.unit_cost_base);
  }, 0);

  // 2. Labor Cost
  const total_cost_labor = prepTimeMinutes * settings.cost_per_minute;

  // 3. Overhead Cost (Hidden costs like gas, energy - % of Material Cost is a common approximation, 
  // though some use % of Labor. Based on prompt: "Settings.fixed_overhead_rate")
  // Note: The prompt implies overhead is a rate. Often overhead is applied to labor or prime cost.
  // We will apply it to the Material Cost as requested in "Função 2: Pilar 3".
  const total_cost_overhead = total_cost_material * (settings.fixed_overhead_rate / 100);

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