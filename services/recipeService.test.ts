import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecipeService } from './recipeService';
import { supabase } from './supabase';

// Mock do módulo supabase
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('RecipeService', () => {
  // Helpers para o Mock
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpsert = vi.fn();
  const mockDelete = vi.fn();
  const mockOrder = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();

  beforeEach(() => {
    // 1. Limpa todos os mocks anteriores
    vi.clearAllMocks();

    // 2. Configura o mock do 'from'
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      upsert: mockUpsert,
      delete: mockDelete,
      update: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    // 3. CORREÇÃO PRINCIPAL: O 'select' deve retornar UM ÚNICO objeto 
    // que contenha TANTO 'order' QUANTO 'single'.
    mockSelect.mockReturnValue({
      order: mockOrder,   // Necessário para o getAll
      single: mockSingle  // Necessário para o save (upsert.select.single)
    });

    // 4. Configura os retornos dos outros encadeamentos
    mockUpsert.mockReturnValue({ select: mockSelect }); // upsert().select()
    mockDelete.mockReturnValue({ eq: mockEq });         // delete().eq()
    
    // Configurações de retornos padrão para evitar "undefined"
    mockEq.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('getAll: deve trazer receitas e formatar os itens corretamente', async () => {
    // Dados simulados do banco
    const rawData = [
      {
        id: 'r1',
        name: 'Bolo',
        items: [
          {
            id: 'item1',
            quantity: 100, 
            ingredient: { base_unit: 'g' },
          },
        ],
      },
    ];

    // Configura o retorno do .order()
    mockOrder.mockResolvedValue({ data: rawData, error: null });

    const result = await RecipeService.getAll();

    // Verifica se formatou corretamente
    expect(result[0].items[0]).toHaveProperty('quantity_used', 100);
    expect(result[0].items[0]).toHaveProperty('quantity_input', 100);
    expect(result[0].items[0]).toHaveProperty('unit_input', 'g');
  });

  it('save: deve lançar erro se usuário não estiver logado', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });

    await expect(RecipeService.save({ name: 'Teste' } as any))
      .rejects
      .toThrow('Usuário não autenticado');
  });

  it('save: deve salvar a receita e substituir os itens', async () => {
    // Mock do Usuário
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user123' } } });

    // Mock da Receita Salva (Retorno do upsert -> select -> single)
    const mockSavedRecipe = { id: 'rec-123', name: 'Receita Nova' };
    mockSingle.mockResolvedValue({ data: mockSavedRecipe, error: null });

    const recipeToSave = {
      name: 'Receita Nova',
      items: [
        { ingredient_id: 'ing-1', quantity_used: 50 },
        { ingredient_id: 'ing-2', quantity_used: 10 },
      ],
    };

    await RecipeService.save(recipeToSave as any);

    // Verificações
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user123',
        name: 'Receita Nova'
    }));

    // Verifica se deletou itens antigos
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('recipe_id', 'rec-123');

    // Verifica se inseriu novos itens
    expect(mockInsert).toHaveBeenCalledWith([
        { recipe_id: 'rec-123', ingredient_id: 'ing-1', quantity: 50 },
        { recipe_id: 'rec-123', ingredient_id: 'ing-2', quantity: 10 }
    ]);
  });
});