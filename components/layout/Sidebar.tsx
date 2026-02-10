import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogOut, ShieldAlert, LayoutDashboard, Store, History, PieChart, TrendingUp, TrendingDown, Layers, ChefHat, Package, Box, ShoppingBag, DollarSign, Tags, Settings as SettingsIcon, LucideIcon, X, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
    userRole: 'admin' | 'cashier' | null;
    isConfigured: boolean;
    currentView: string;
    isOpen?: boolean;     // Nova prop para controle Mobile
    onClose?: () => void; // Nova prop para fechar Mobile
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole, isConfigured, currentView, isOpen = false, onClose }) => {
    const { signOut } = useAuth();
    const location = useLocation();

    const NavItem = ({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) => (
        <NavLink
            to={to}
            onClick={onClose} // Fecha menu ao clicar no mobile
            className={({ isActive }) => {
                const isPathActive = isActive || (to !== '/' && location.pathname.startsWith(`${to}/`));
                return `flex items-center gap-3 px-4 py-3 md:py-2 rounded-lg w-full text-left transition-all ${isPathActive
                    ? 'bg-amber-100 text-amber-900 font-medium'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`;
            }}
        >
            {({ isActive }) => {
                const isPathActive = isActive || (to !== '/' && location.pathname.startsWith(`${to}/`));
                return (
                    <>
                        <Icon size={20} className={isPathActive ? 'text-amber-700' : 'text-slate-400'} />
                        {label}
                    </>
                );
            }}
        </NavLink>
    );

    // Classes dinâmicas para Mobile vs Desktop
    const sidebarClasses = `
        bg-white border-r border-slate-200 p-6 flex flex-col h-screen overflow-y-auto
        md:w-64 md:sticky md:top-0 md:translate-x-0 transition-transform duration-300 ease-in-out z-50
        fixed inset-y-0 left-0 w-72 shadow-2xl md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `;

    return (
        <>
            {/* Backdrop para Mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            <aside className={sidebarClasses}>
                <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-amber-600/20">
                            C
                        </div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Custosys</h1>
                        {userRole === 'cashier' && (
                            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-200">
                                PDV
                            </span>
                        )}
                    </div>
                    {/* Botão Fechar Mobile */}
                    <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <nav className="space-y-1 flex-1">
                    {userRole === 'admin' && (
                        <NavItem to="/" label="Visão Geral" icon={LayoutDashboard} />
                    )}

                    <div className="pt-2 pb-2">
                        <p className="px-4 text-xs font-bold text-slate-400 uppercase mb-1">Vendas & Caixa</p>
                        <NavItem to="/pos" label="PDV | Frente de Caixa" icon={Store} />

                        {userRole === 'admin' && (
                            <>
                                <NavItem to="/cash-history" label="Histórico de Caixa" icon={History} />
                                <NavItem to="/reports" label="Relatórios de Vendas" icon={PieChart} />
                                <NavItem to="/sales" label="Financeiro (Entradas)" icon={TrendingUp} />
                                <NavItem to="/expenses" label="Despesas (Saídas)" icon={TrendingDown} />
                            </>
                        )}
                    </div>

                    {userRole === 'admin' && (
                        <>
                            <div className="pt-2 pb-2">
                                <p className="px-4 text-xs font-bold text-slate-400 uppercase mb-1">Produção</p>
                                <NavItem to="/production-bases" label="Insumos Produzidos" icon={Layers} />
                                <NavItem to="/recipes" label="Minhas Receitas" icon={ChefHat} />
                                <NavItem to="/ingredients" label="Ingredientes" icon={Package} />
                                <NavItem to="/packaging" label="Embalagens" icon={Box} />
                                <NavItem to="/resale-products" label="Revenda" icon={ShoppingBag} />
                            </div>

                            <div className="pt-2 pb-2">
                                <p className="px-4 text-xs font-bold text-slate-400 uppercase mb-1">Ferramentas</p>
                                <NavItem to="/costs" label="Simulador & Custos" icon={DollarSign} />
                                <NavItem to="/resale" label="Cálculo de Revenda" icon={Tags} />
                            </div>

                            <div className="pt-2 pb-2 mt-2 border-t border-slate-100">
                                <p className="px-4 text-xs font-bold text-slate-400 uppercase mb-1">Administração</p>
                                <NavItem to="/team" label="Equipe & Acessos" icon={Users} />
                                <NavItem to="/settings" label="Configurações" icon={SettingsIcon} />
                            </div>
                        </>
                    )}
                </nav>

                {!isConfigured && currentView !== 'settings' && userRole === 'admin' && (
                    <div className="mt-auto bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-800 mb-4 animate-pulse">
                        <p className="font-bold mb-1 flex items-center gap-2"><ShieldAlert size={16} /> Atenção:</p>
                        <p>Configure seus custos fixos e mão de obra para os cálculos funcionarem.</p>
                    </div>
                )}

                <div className="mt-6 px-2 space-y-3">
                    <button
                        onClick={signOut}
                        className="w-full text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg py-3 md:py-2 transition hover:bg-red-50 flex items-center justify-center gap-2"
                    >
                        <LogOut size={16} />
                        Sair
                    </button>
                    <p className="text-xs text-slate-400 text-center">Versão 2.5.0 (Refactor) • Effitech</p>
                </div>
            </aside>
        </>
    );
};
