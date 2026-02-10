import { supabase } from './supabase';
import { Category } from '../types';

export const CategoryService = {
  // Lista todas as categorias em ordem alfabética
  async getAll() {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as Category[];
  },

  // Cria uma nova categoria
  async create(name: string) {
    const { data, error } = await supabase
      .from('product_categories')
      .insert([{ name }])
      .select()
      .single();
    if (error) throw error;
    return data as Category;
  },

  // Atualiza o nome da categoria e Sincroniza os produtos/receitas
  async update(id: number, newName: string) {
    // 1. Busca o nome antigo antes de mudar
    const { data: oldCat, error: fetchError } = await supabase
      .from('product_categories')
      .select('name')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!oldCat) throw new Error('Categoria não encontrada para atualização');

    // 2. Atualiza o nome na tabela de categorias (Mestre)
    const { error: updateError } = await supabase
      .from('product_categories')
      .update({ name: newName })
      .eq('id', id);

    if (updateError) throw updateError;

    // 3. Atualiza em massa todos os Produtos e Receitas que usavam o nome antigo
    // Isso evita que os itens fiquem com a categoria antiga
    if (oldCat.name !== newName) {
      await supabase
        .from('products')
        .update({ category: newName })
        .eq('category', oldCat.name);

      await supabase
        .from('recipes')
        .update({ category: newName })
        .eq('category', oldCat.name);
    }
  },

  // Exclui a categoria (apenas se não estiver em uso)
  async delete(id: number, name: string) {
    // 1. Verifica se existem PRODUTOS usando esta categoria
    const { count: prodCount, error: prodError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category', name);

    if (prodError) throw prodError;

    // 2. Verifica se existem RECEITAS usando esta categoria
    const { count: recipeCount, error: recipeError } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .eq('category', name);

    if (recipeError) throw recipeError;

    // Se houver qualquer item usando, bloqueia a exclusão
    const totalUsage = (prodCount || 0) + (recipeCount || 0);

    if (totalUsage > 0) {
      throw new Error(`Proteção: Existem ${totalUsage} itens vinculados a esta categoria. Remova-os ou altere a categoria deles antes de excluir.`);
    }

    // 3. Se estiver livre, exclui
    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};