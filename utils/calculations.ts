import { Unit, Ingredient, Settings, Recipe, RecipeItem } from '../types';
import Decimal from 'decimal.js';

// Configura o Decimal.js para precisão financeira (opcional, mas recomendado)
// Decimal.set({ precision: 20 });

/**
 * Normaliza unidades para a base (kg->g, l->ml) e calcula o custo por unidade base.
 * Corrige problemas de divisão de ponto flutuante.
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

  // CÁLCULO PRECISO:
  // totalBaseUnits = amount * multiplier
  const amountDec = new Decimal(amount || 0);
  const totalBaseUnits = amountDec.times(multiplier);

  // baseCost = price / totalBaseUnits
  const priceDec = new Decimal(price || 0);
  
  // Proteção contra divisão por zero usando Decimal
  const baseCost = totalBaseUnits.isGreaterThan(0) 
    ? priceDec.dividedBy(totalBaseUnits) 
    : new Decimal(0);

  // Retornamos .toNumber() para manter compatibilidade com o resto do sistema (Typescript)
  // mas o valor já foi calculado com a precisão correta.
  return { 
    baseCost: baseCost.toNumber(), 
    baseUnit 
  };
};

/**
 * Calcula o detalhamento financeiro completo da receita.
 * Substitui somas simples por somas decimais para evitar erros de centavos.
 */
export const calculateRecipeFinancials = (
  items: RecipeItem[],
  ingredients: Ingredient[],
  prepTimeMinutes: number,
  yieldUnits: number,
  settings: Settings
): Partial<Recipe> => {
  
  // 1. Custo dos Materiais (Ingredientes)
  // Usamos Decimal(0) como acumulador inicial
  const total_cost_material_dec = items.reduce((acc, item) => {
    const ingredient = ingredients.find(i => i.id === item.ingredient_id);
    const costBase = ingredient ? ingredient.unit_cost_base : (item as any).price || 0;
    const qty = item.quantity_used || 0;
    
    // acc + (qty * costBase)
    const costStep = new Decimal(qty).times(costBase);
    return acc.plus(costStep);
  }, new Decimal(0));

  // 2. Custo da Mão de Obra
  // (prepTime * costPerMinute)
  const prepTimeDec = new Decimal(prepTimeMinutes || 0);
  const costPerMinuteDec = new Decimal(settings.cost_per_minute || 0);
  const total_cost_labor_dec = prepTimeDec.times(costPerMinuteDec);

  // 3. Custos Fixos (Overhead)
  // prime_cost = material + labor
  const prime_cost_dec = total_cost_material_dec.plus(total_cost_labor_dec);
  
  // total_cost_overhead = prime_cost * (rate / 100)
  const overheadRateDec = new Decimal(settings.fixed_overhead_rate || 0);
  const total_cost_overhead_dec = prime_cost_dec.times(overheadRateDec.dividedBy(100));

  // 4. Totais
  const total_cost_final_dec = prime_cost_dec.plus(total_cost_overhead_dec);
  
  // unit_cost = total / yield
  const yieldDec = new Decimal(yieldUnits || 1);
  const unit_cost_dec = yieldDec.isGreaterThan(0) 
    ? total_cost_final_dec.dividedBy(yieldDec) 
    : new Decimal(0);

  return {
    total_cost_material: total_cost_material_dec.toNumber(),
    total_cost_labor: total_cost_labor_dec.toNumber(),
    total_cost_overhead: total_cost_overhead_dec.toNumber(),
    total_cost_final: total_cost_final_dec.toNumber(),
    unit_cost: unit_cost_dec.toNumber()
  };
};

/**
 * Calcula o preço de venda sugerido.
 * Fórmula: Preço = Custo / (1 - (Imposto + Taxa + Margem))
 */
export const calculateSellingPrice = (
  unitCost: number,
  taxRate: number, // % 0-100
  cardFee: number, // % 0-100
  desiredMargin: number // % 0-100
): number => {
  // totalDeductions = (tax + fee + margin) / 100
  const taxDec = new Decimal(taxRate || 0);
  const feeDec = new Decimal(cardFee || 0);
  const marginDec = new Decimal(desiredMargin || 0);
  
  const totalDeductionsDec = taxDec.plus(feeDec).plus(marginDec).dividedBy(100);

  // Se deduções >= 1 (100%), o preço seria infinito
  if (totalDeductionsDec.greaterThanOrEqualTo(1)) return 0;

  // Preço = Custo / (1 - deduções)
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

  // deductionRate = (tax + fee) / 100
  const deductionRate = taxDec.plus(feeDec).dividedBy(100);
  
  // costRate = cost / price
  const costRate = costDec.dividedBy(priceDec);
  
  // Margem = 1 - costRate - deductionRate
  const marginRate = new Decimal(1).minus(costRate).minus(deductionRate);
  
  // Retorna em porcentagem (x100)
  return marginRate.times(100).toNumber();
};