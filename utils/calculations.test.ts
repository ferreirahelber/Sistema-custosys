import { describe, it, expect } from 'vitest';
import { calculateBaseCost, calculateSellingPrice, calculateMargin } from './calculations';
import { Unit } from '../types';

describe('Calculadora Financeira (Core)', () => {
  
  describe('calculateBaseCost', () => {
    it('deve converter corretamente KG para Gramas', () => {
      // Preço R$ 20,00 por 1 KG. Custo de 1g deve ser 0.02
      const result = calculateBaseCost(20, 1, Unit.KG);
      expect(result.baseUnit).toBe('g');
      expect(result.baseCost).toBeCloseTo(0.02);
    });

    it('deve converter corretamente Leite (L) para ML', () => {
      // Preço R$ 5,00 por 1 Litro. Custo de 1ml deve ser 0.005
      const result = calculateBaseCost(5, 1, Unit.L);
      expect(result.baseUnit).toBe('ml');
      expect(result.baseCost).toBeCloseTo(0.005);
    });

    it('não deve quebrar com divisão por zero (quantidade 0)', () => {
      const result = calculateBaseCost(10, 0, Unit.UN);
      expect(result.baseCost).toBe(0);
    });
  });

  describe('calculateSellingPrice (Markup)', () => {
    it('deve calcular o preço de venda corretamente com margem e taxas', () => {
      // Custo: 10.00
      // Taxas (Imposto + Cartão): 10% + 5% = 15%
      // Margem desejada: 20%
      // Total deduções: 35% (0.35)
      // Fórmula: 10 / (1 - 0.35) = 10 / 0.65 = 15.3846...
      
      const price = calculateSellingPrice(10, 10, 5, 20);
      expect(price).toBeCloseTo(15.38, 2);
    });

    it('deve retornar 0 se as taxas passarem de 100%', () => {
      const price = calculateSellingPrice(10, 50, 0, 60); // 110%
      expect(price).toBe(0);
    });
  });

  describe('calculateMargin', () => {
    it('deve calcular a margem de lucro real', () => {
      // Custo: 50, Venda: 100
      // Taxas: 10%
      // Sobra: 100 - 10(taxa) - 50(custo) = 40
      // Margem: 40%
      const margin = calculateMargin(50, 100, 10, 0);
      expect(margin).toBeCloseTo(40);
    });
  });

});