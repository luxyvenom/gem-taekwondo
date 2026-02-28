'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const navItems = [
    { id: 'home', label: 'HOME', icon: '🏠', description: 'Upload Image', path: '/workspace' },
    { id: 'collection', label: 'FIGHTERS', icon: '📦', description: 'My Collection', path: '/workspace/collection' },
    { id: 'stats', label: 'STATS', icon: '📊', description: 'Abilities', path: '/workspace/stats' },
    { id: 'battle', label: 'BATTLE', icon: '🎮', description: 'AI Boss', path: '/workspace/battle' },
];

export default function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const isActive = (path: string) => {
        if (path === '/workspace') return pathname === '/workspace';
        return pathname.startsWith(path);
    };

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
            {/* Sidebar */}
            <motion.aside
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={`${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 bg-[#111] border-r border-red-900/30 flex flex-col relative z-50`}
            >
                {/* Logo */}
                <div
                    className="p-4 border-b border-red-900/30 cursor-pointer group"
                    onClick={() => router.push('/')}
                >
                    <div className={`font-black italic text-xl ${collapsed ? 'text-center' : ''}`}>
                        {collapsed ? (
                            <span className="text-red-500">T</span>
                        ) : (
                            <>
                                <span className="text-white">TAEKWON</span>
                                <span className="text-red-500">-CLASH</span>
                            </>
                        )}
                    </div>
                    {!collapsed && (
                        <div className="text-gray-500 text-xs mt-1 tracking-widest uppercase">
                            Beast Fighter Arena
                        </div>
                    )}
                </div>

                {/* Nav Items */}
                <nav className="flex-1 p-3 space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => router.push(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative
                ${isActive(item.path)
                                    ? 'bg-red-600/20 border border-red-600/50 text-white'
                                    : 'hover:bg-white/5 text-gray-400 hover:text-white border border-transparent'
                                }`}
                        >
                            {isActive(item.path) && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-r"
                                />
                            )}
                            <span className="text-xl">{item.icon}</span>
                            {!collapsed && (
                                <div className="text-left">
                                    <div className="font-bold text-sm tracking-wider">{item.label}</div>
                                    <div className="text-xs text-gray-500">{item.description}</div>
                                </div>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-4 border-t border-red-900/30 text-gray-500 hover:text-white transition-colors text-sm"
                >
                    {collapsed ? '→' : '← Collapse'}
                </button>

                {/* Bottom decoration */}
                <div className="absolute bottom-16 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-900/50 to-transparent" />
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative">
                {/* Top gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 z-50" />

                {/* Content */}
                <div className="p-6 lg:p-8">
                    {children}
                </div>

                {/* Background texture */}
                <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-0"
                    style={{
                        backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 4px)`
                    }}
                />
            </main>
        </div>
    );
}
