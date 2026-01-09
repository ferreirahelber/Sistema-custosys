import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngredientService } from './ingredientService';
import { supabase } from './supabase';

// Mock do módulo supabase
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('IngredientService', () => {
  // Helpers para o Mock
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockOrder = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();

  // Reinicia os mocks antes de cada teste
  beforeEach(() => {
    vi.clearAllMocks();

    // Configuração do encadeamento (Chaining) do Supabase
    // Ex: supabase.from('tabela') retorna um objeto com os métodos select, insert, etc.
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });

    // Configura os retornos dos encadeamentos comuns
    mockSelect.mockReturnValue({ order: mockOrder, single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockDelete.mockReturnValue({ eq: mockEq });
    
    // Configurações específicas de encadeamento profundo
    mockEq.mockReturnValue({ select: mockSelect }); // Para update().eq().select()
    mockSelect.mockReturnValue({ single: mockSingle, order: mockOrder }); // Reforço
  });

  it('getAll: deve buscar ingredientes ordenados por nome', async () => {
    const mockData = [{ id: '1', name: 'Açúcar' }];
    
    // Simula o retorno final: .order() retorna { data, error }
    mockOrder.mockResolvedValue({ data: mockData, error: null });

    const result = await IngredientService.getAll();

    expect(supabase.from).toHaveBeenCalledWith('ingredients');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockOrder).toHaveBeenCalledWith('name');
    expect(result).toEqual(mockData);
  });

  it('create: deve inserir e retornar o novo ingrediente', async () => {
    const newIng = {
        name: 'Farinha', 
        package_price: 10, 
        package_amount: 1, 
        package_unit: 'kg',
        base_unit: 'g',
        unit_cost_base: 0.01,
        conversions: [],
        current_stock: 0,
        min_stock: 10
    };
    const mockCreated = { id: '123', ...newIng };

    // create chama: insert -> select -> single
    mockSingle.mockResolvedValue({ data: mockCreated, error: null });

    const result = await IngredientService.create(newIng as any);

    expect(mockInsert).toHaveBeenCalledWith([expect.objectContaining({ name: 'Farinha' })]);
    expect(result).toEqual(mockCreated);
  });

  it('update: deve atualizar campos e retornar dados atualizados', async () => {
    const updates = { package_price: 12 };
    const updatedData = { id: '1', name: 'Farinha', package_price: 12 };

    // update chama: update -> eq -> select -> single
    // O mockEq deve retornar um objeto que tenha .select(), que retorna .single()
    // Configuramos isso no beforeEach, agora definimos o valor final do single
    mockSingle.mockResolvedValue({ data: updatedData, error: null });

    const result = await IngredientService.update('1', updates);

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining(updates));
    expect(mockEq).toHaveBeenCalledWith('id', '1');
    expect(result).toEqual(updatedData);
  });

  it('delete: deve remover o ingrediente pelo ID', async () => {
    mockEq.mockResolvedValue({ error: null }); // delete -> eq

    await IngredientService.delete('999');

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', '999');
  });
});