import { Unit, Ingredient, RecipeItem, Settings, Recipe } from '../types';
import Decimal from 'decimal.js';

// --- NOVA FUNÇÃO DE CONVERSÃO CENTRALIZADA (PEDIDO DO MANUS) ---
/**
 * Converte uma quantidade de entrada (ex: 1 Xícara) para a unidade base do ingrediente (ex: 120g).
 */
export const convertInputToUnitBase = (
  quantityInput: number,
  unitInput: string,
  ingredient: Ingredient
): number => {
  const qtyDec = new Decimal(quantityInput || 0);

  // 1. Unidades padrão (kg -> g, l -> ml)
  if (unitInput === 'kg' || unitInput === 'l') {
    return qtyDec.times(1000).toNumber();
  }
  if (unitInput === 'g' || unitInput === 'ml' || unitInput === 'un') {
    return qtyDec.toNumber();
  }

  // 2. Unidades Caseiras (Xícara, Colher)
  // Procura no array de conversões do ingrediente
  if (ingredient.conversions && ingredient.conversions.length > 0) {
    const conversion = ingredient.conversions.find(
      (c) => c.name.toLowerCase() === unitInput.toLowerCase()
    );

    if (conversion) {
      // Ex: 2 Xícaras (120g cada) = 2 * 120 = 240g
      return qtyDec.times(conversion.value).toNumber();
    }
  }

  // Fallback: Se não achar nada, retorna o próprio valor (assumindo que já está na base)
  return qtyDec.toNumber();
};

/**
 * Normaliza unidades para a base (kg->g, l->ml) e calcula o custo por unidade base.
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

  const amountDec = new Decimal(amount || 0);
  const totalBaseUnits = amountDec.times(multiplier);
  const priceDec = new Decimal(price || 0);

  const baseCost = totalBaseUnits.greaterThan(0)
    ? priceDec.dividedBy(totalBaseUnits)
    : new Decimal(0);

  return {
    baseCost: baseCost.toNumber(),
    baseUnit,
  };
};

/**
 * Calcula o detalhamento financeiro completo da receita.
 */
export const calculateRecipeFinancials = (
  items: RecipeItem[],
  ingredients: Ingredient[],
  baseRecipes: Recipe[], // Garante que este parâmetro existe
  prepTimeMinutes: number,
  yieldUnits: number,
  settings: Settings
): Partial<Recipe> => {
  // 1. Custo dos Materiais
  let costIngredients = new Decimal(0);
  let costPackaging = new Decimal(0);

  items.forEach((item) => {
    const ingredient = ingredients.find((i) => i.id === item.ingredient_id);
    const baseRecipe = baseRecipes.find((r) => r.id === item.ingredient_id);

    let itemCost = new Decimal(0);

    if (item.item_type === 'recipe' && baseRecipe) {
      // Lógica para Base: (Custo Total / Peso Total de Produção) * Quantidade Usada Normalizada
      const totalBaseWeight = new Decimal(baseRecipe.yield_quantity || 1);
      const totalBaseCost = new Decimal(baseRecipe.total_cost_final || 0);
      const qtyUsedInput = new Decimal(item.quantity_used || 0);

      // Normalizar unidades (Assumindo Massa/Volume padrão)
      // Se a Base for KG e o uso for G -> fator 1000
      let multiplier = 1;

      const baseUnit = (baseRecipe.yield_unit || 'un').toLowerCase();
      const inputUnit = (item.unit_input || 'un').toLowerCase();

      // Helper simples de fator para base (g/ml)
      const getFactor = (u: string) => {
        if (u === 'kg' || u === 'l') return 1000;
        return 1; // g, ml, un
      };

      const baseFactor = getFactor(baseUnit);
      const inputFactor = getFactor(inputUnit);

      // Peso total da base em g/ml
      const totalBaseNormalized = totalBaseWeight.times(baseFactor);

      // Peso usado em g/ml
      const usedNormalized = qtyUsedInput.times(inputFactor);

      if (totalBaseNormalized.greaterThan(0)) {
        itemCost = totalBaseCost.dividedBy(totalBaseNormalized).times(usedNormalized);
      } else {
        itemCost = new Decimal(0);
      }
    } else if (ingredient) {
      // Lógica para Ingrediente Comum (já existente)
      const costBase = new Decimal(ingredient.unit_cost_base || 0);
      const qty = new Decimal(item.quantity_used || 0);
      itemCost = qty.times(costBase);
    }

    if (ingredient?.category === 'packaging') {
      costPackaging = costPackaging.plus(itemCost);
    } else {
      costIngredients = costIngredients.plus(itemCost);
    }
  });

  const total_cost_material_dec = costIngredients.plus(costPackaging);

  // 2. Custo da Mão de Obra
  const prepTimeDec = new Decimal(prepTimeMinutes || 0);
  const costPerMinuteDec = new Decimal(settings.cost_per_minute || 0);
  const total_cost_labor_dec = prepTimeDec.times(costPerMinuteDec);

  // 3. Custos Fixos (Overhead)
  const prime_cost_dec = total_cost_material_dec.plus(total_cost_labor_dec);
  const overheadRateDec = new Decimal(settings.fixed_overhead_rate || 0);
  const total_cost_overhead_dec = prime_cost_dec.times(overheadRateDec.dividedBy(100));

  // 4. Totais
  const total_cost_final_dec = prime_cost_dec.plus(total_cost_overhead_dec);
  const yieldDec = new Decimal(yieldUnits || 1);

  const unit_cost_dec = yieldDec.greaterThan(0)
    ? total_cost_final_dec.dividedBy(yieldDec)
    : new Decimal(0);

  return {
    total_cost_material: total_cost_material_dec.toNumber(),
    total_cost_labor: total_cost_labor_dec.toNumber(),
    total_cost_overhead: total_cost_overhead_dec.toNumber(),
    total_cost_final: total_cost_final_dec.toNumber(),
    unit_cost: unit_cost_dec.toNumber(),
  };
};

/**
 * Calcula o preço de venda sugerido (Markup).
 */
export const calculateSellingPrice = (
  unitCost: number,
  taxRate: number,
  cardFee: number,
  desiredMargin: number
): number => {
  const taxDec = new Decimal(taxRate || 0);
  const feeDec = new Decimal(cardFee || 0);
  const marginDec = new Decimal(desiredMargin || 0);

  const totalDeductionsDec = taxDec.plus(feeDec).plus(marginDec).dividedBy(100);

  if (totalDeductionsDec.greaterThanOrEqualTo(1)) return 0;

  const costDec = new Decimal(unitCost || 0);
  const divisor = new Decimal(1).minus(totalDeductionsDec);

  return costDec.dividedBy(divisor).toNumber();
};

/**
 * Calcula a margem real de lucro.
 */
export const calculateMargin = (
  unitCost: number,
  sellingPrice: number,
  taxRate: number,
  cardFee: number
): number => {
  const priceDec = new Decimal(sellingPrice || 0);
  if (priceDec.lessThanOrEqualTo(0)) return -100;

  const costDec = new Decimal(unitCost || 0);
  const taxDec = new Decimal(taxRate || 0);
  const feeDec = new Decimal(cardFee || 0);

  const deductionRate = taxDec.plus(feeDec).dividedBy(100);
  const costRate = costDec.dividedBy(priceDec);

  const marginRate = new Decimal(1).minus(costRate).minus(deductionRate);

  return marginRate.times(100).toNumber();
};