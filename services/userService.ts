import { supabase } from './supabase';
import { Profile } from '../types';

export const UserService = {
    // Lista todos os perfis (apenas Admin consegue ver tudo via RLS)
    async getAll() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Profile[];
    },

    // Cria um "convite" (Profile sem user_id)
    async inviteUser(email: string, role: Profile['role'], name?: string) {
        // Verifica se já existe
        const { data: existing } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (existing) {
            throw new Error('Já existe um usuário com este e-mail.');
        }

        const { data, error } = await supabase
            .from('profiles')
            .insert([{
                email,
                role,
                name
            }])
            .select()
            .single();

        if (error) throw error;
        return data as Profile;
    },

    // Atualiza cargo ou nome
    async update(id: string, updates: Partial<Profile>) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Profile;
    },

    // Remove um perfil (Remove o acesso)
    async delete(id: string) {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Pega o perfil autal
    async getCurrentProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        return data as Profile | null;
    }
};
