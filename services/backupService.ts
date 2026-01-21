import { supabase } from './supabase';
import { SettingsService } from './settingsService';
import { RecipeService } from './recipeService';
import { IngredientService } from './ingredientService';
import { FixedCostService } from './fixedCostService';
import { TeamService } from './teamService';

export interface BackupData {
  timestamp: string;
  version: string;
  data: {
    settings: any;
    recipes: any[];
    ingredients: any[];
    fixedCosts: any[];
    team: any[];
    sales?: any[];
  };
}

export const BackupService = {
  // Renomeado para bater com o SettingsForm
  async exportData(): Promise<string> {
    try {
      const [settings, recipes, ingredients, fixedCosts, team] = await Promise.all([
        SettingsService.get(),
        RecipeService.getAll(),
        IngredientService.getAll(),
        FixedCostService.getAll(),
        TeamService.getAll()
      ]);

      // Tenta pegar vendas se possível, senão ignora
      let sales = [];
      try {
          // Se você tiver um SaleService, descomente:
          // sales = await SaleService.getAll();
          const { data } = await supabase.from('sales').select('*');
          sales = data || [];
      } catch (e) {
          console.warn('Vendas não incluídas no backup');
      }

      const backup: BackupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
          settings,
          recipes,
          ingredients,
          fixedCosts,
          team,
          sales
        }
      };

      return JSON.stringify(backup, null, 2);
    } catch (error) {
      console.error('Erro ao gerar backup:', error);
      throw new Error('Falha ao gerar arquivo de backup');
    }
  },

  // Renomeado para bater com o SettingsForm
  async importData(jsonContent: string): Promise<void> {
    try {
      const backup: BackupData = JSON.parse(jsonContent);

      if (!backup.data) throw new Error('Arquivo de backup inválido');

      // 1. Restaurar Configurações
      if (backup.data.settings) {
        await SettingsService.save(backup.data.settings);
      }

      // 2. Restaurar Ingredientes (Limpa e Recria)
      if (backup.data.ingredients?.length) {
        // O ideal seria upsert, mas para simplificar vamos manter
        for (const item of backup.data.ingredients) {
            const { id, ...cleanItem } = item; // Remove ID para criar novo ou usa UPSERT se preferir
            await supabase.from('ingredients').upsert(item);
        }
      }

      // 3. Restaurar Receitas
      if (backup.data.recipes?.length) {
         for (const item of backup.data.recipes) {
            await supabase.from('recipes').upsert(item);
         }
      }

      // 4. Restaurar Custos Fixos
      if (backup.data.fixedCosts?.length) {
        await supabase.from('fixed_costs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Limpa tudo
        for (const item of backup.data.fixedCosts) {
             const { id, ...clean } = item; 
             await FixedCostService.add(clean);
        }
      }

      // 5. Restaurar Equipe
      if (backup.data.team?.length) {
        await supabase.from('team_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        for (const item of backup.data.team) {
            const { id, ...clean } = item;
            await TeamService.add(clean);
        }
      }

    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      throw new Error('Falha ao processar arquivo de backup');
    }
  }
};