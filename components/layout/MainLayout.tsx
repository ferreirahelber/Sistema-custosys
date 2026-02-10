import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { Menu } from 'lucide-react';

interface MainLayoutProps {
    userRole: 'admin' | 'cashier' | null;
    isConfigured: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ userRole, isConfigured }) => {
    const location = useLocation();
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    const getCurrentView = () => {
        // Duplicated logic because Sidebar needs it for rendering config alert logic
        // We could pass it down from App but calculating here is cheap
        const path = location.pathname;
        if (path === '/settings') return 'settings';
        return 'other';
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
            {/* Mobile Header */}
            <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                        C
                    </div>
                    <h1 className="text-lg font-bold text-slate-800">Custosys</h1>
                </div>
                <button
                    onClick={() => setIsMobileNavOpen(true)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                    <Menu size={24} />
                </button>
            </div>

            <Sidebar
                userRole={userRole}
                isConfigured={isConfigured}
                currentView={getCurrentView()}
                isOpen={isMobileNavOpen}
                onClose={() => setIsMobileNavOpen(false)}
            />

            <main className="flex-1 p-4 md:p-12 overflow-y-auto h-[calc(100vh-65px)] md:h-screen bg-slate-50/50">
                <div className="max-w-6xl mx-auto pb-20 md:pb-0"> {/* Padding bottom for mobile scrolling */}
                    <div className="hidden md:block">
                        <TopHeader />
                    </div>
                    <div className="animate-fade-in">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};
