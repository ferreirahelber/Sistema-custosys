import React, { useState, useEffect } from 'react';
import { UserService } from '../services/userService';
import { Profile } from '../types';
import { Plus, Trash2, Shield, User, Mail, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const UserManagement: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<Profile | null>(null);

    // Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState<Profile['role']>('user');
    const [newName, setNewName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'delete' | 'change_role';
        profile: Profile | null;
        title: string;
        description: string;
        confirmLabel: string;
        confirmColor: string;
        action: () => Promise<void>;
    }>({
        isOpen: false,
        type: 'delete',
        profile: null,
        title: '',
        description: '',
        confirmLabel: '',
        confirmColor: '',
        action: async () => { },
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [allProfiles, current] = await Promise.all([
                UserService.getAll(),
                UserService.getCurrentProfile()
            ]);
            setProfiles(allProfiles);
            setCurrentUser(current);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar usuários. Verifique se você é Admin.');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await UserService.inviteUser(newEmail, newRole, newName);
            toast.success('Usuário pré-cadastrado com sucesso!');
            setIsModalOpen(false);
            setNewEmail('');
            setNewName('');
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao convidar usuário');
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = (profile: Profile) => {
        setConfirmModal({
            isOpen: true,
            type: 'delete',
            profile,
            title: 'Remover Usuário?',
            description: `Você tem certeza que deseja remover o acesso de ${profile.email}? Esta ação é irreversível.`,
            confirmLabel: 'Sim, Remover',
            confirmColor: 'bg-red-600 hover:bg-red-700',
            action: async () => {
                await UserService.delete(profile.id);
                toast.success('Usuário removido com sucesso');
                loadData();
            }
        });
    };

    const confirmRoleChange = (profile: Profile) => {
        const newRole = profile.role === 'admin' ? 'cashier' : 'admin';
        const actionLabel = newRole === 'admin' ? 'Promover a Administrador' : 'Rebaixar para Caixa';

        setConfirmModal({
            isOpen: true,
            type: 'change_role',
            profile,
            title: `Alterar Permissão?`,
            description: `Deseja realmente ${actionLabel.toLowerCase()} o usuário ${profile.name || profile.email}?`,
            confirmLabel: 'Confirmar Alteração',
            confirmColor: 'bg-emerald-600 hover:bg-emerald-700',
            action: async () => {
                await UserService.update(profile.id, { role: newRole });
                toast.success(`Usuário atualizado para ${newRole === 'admin' ? 'Administrador' : 'Caixa'}`);
                loadData();
            }
        });
    };

    const executeAction = async () => {
        try {
            await confirmModal.action();
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
            toast.error('Ocorreu um erro ao processar a ação');
            console.error(error);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto animate-in fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="text-emerald-600" />
                        Gestão de Equipe
                    </h1>
                    <p className="text-slate-500 mt-1">Gerencie quem tem acesso ao sistema e suas permissões</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus size={20} />
                    Adicionar Membro
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                </div>
            ) : profiles.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <User size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-800">Nenhum membro encontrado</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">
                        Você ainda não adicionou ninguém à sua equipe. Clique no botão acima para começar.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {profiles.map(profile => (
                        <div key={profile.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:border-emerald-200 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                                    ${profile.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                        profile.role === 'cashier' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {profile.name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        {profile.name || 'Sem nome'}
                                        {profile.id === currentUser?.id && <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">Você</span>}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-0.5">
                                        <span className="flex items-center gap-1.5"><Mail size={14} /> {profile.email}</span>
                                        <span className="flex items-center gap-1.5 ml-2">
                                            {profile.user_id ?
                                                <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={14} /> Ativo</span> :
                                                <span className="text-amber-500 flex items-center gap-1"><AlertCircle size={14} /> Pendente (Aguardando Cadastro)</span>
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                                <button
                                    onClick={() => confirmRoleChange(profile)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border cursor-pointer hover:shadow-sm transition-all
                                     ${profile.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100' :
                                            profile.role === 'cashier' ? 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}
                                    title="Clique para alterar o cargo"
                                >
                                    {profile.role === 'admin' ? 'Administrador' :
                                        profile.role === 'cashier' ? 'Caixa' : profile.role}
                                </button>

                                {profile.id !== currentUser?.id && (
                                    <button
                                        onClick={() => confirmDelete(profile)}
                                        className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition ml-2"
                                        title="Remover acesso"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Adicionar */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Adicionar Membro da Equipe</h2>

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email do Colaborador</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="ex: joao@padaria.com"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                />
                                <p className="text-xs text-slate-500 mt-1">O colaborador usará este email para criar a conta.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome (Opcional)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="ex: João Silva"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Permissão (Cargo)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewRole('cashier')}
                                        className={`p-3 rounded-lg border text-left transition ${newRole === 'cashier' ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <div className="font-bold text-amber-800">Operador de Caixa</div>
                                        <div className="text-xs text-amber-600/80 mt-1">Apenas Vendas e Estoque</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setNewRole('admin')}
                                        className={`p-3 rounded-lg border text-left transition ${newRole === 'admin' ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <div className="font-bold text-purple-800">Administrador</div>
                                        <div className="text-xs text-purple-600/80 mt-1">Acesso Total ao Sistema</div>
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {submitting ? 'Salvando...' : 'Confirmar e Adicionar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95">
                        <div className="flex items-start gap-4 mb-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${confirmModal.type === 'delete' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                {confirmModal.type === 'delete' ? <Trash2 size={24} /> : <Shield size={24} />}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{confirmModal.title}</h3>
                                <p className="text-sm text-slate-500 leading-tight mt-1">
                                    {confirmModal.description}
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={executeAction}
                                className={`px-4 py-2 text-white font-bold rounded-lg transition shadow-lg ${confirmModal.confirmColor}`}
                            >
                                {confirmModal.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
