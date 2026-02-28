'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Boss {
    id: string;
    name: string;
    emoji: string;
    title: string;
    level: number;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'EXTREME';
    reward: string;
}

interface MyFighter {
    id: string;
    name: string;
    emoji: string;
    hp: number;
    maxHp: number;
    attack: number;
}

const bosses: Boss[] = [
    { id: '1', name: 'Dino Rex', emoji: '🦖', title: 'The Ancient Destroyer', level: 5, hp: 500, maxHp: 500, attack: 40, defense: 30, speed: 35, difficulty: 'EASY', reward: '🎖️ Bronze Trophy' },
    { id: '2', name: 'Kraken Deep', emoji: '🐙', title: 'Lord of The Abyss', level: 15, hp: 800, maxHp: 800, attack: 65, defense: 50, speed: 45, difficulty: 'NORMAL', reward: '🥈 Silver Trophy' },
    { id: '3', name: 'Phoenix Blaze', emoji: '🦅', title: 'Immortal Flame Bird', level: 25, hp: 1200, maxHp: 1200, attack: 85, defense: 60, speed: 80, difficulty: 'HARD', reward: '🥇 Gold Trophy' },
    { id: '4', name: 'Dragon Emperor', emoji: '🐉', title: 'Final Boss - King of All', level: 50, hp: 2000, maxHp: 2000, attack: 120, defense: 90, speed: 70, difficulty: 'EXTREME', reward: '👑 Legendary Crown' },
];

const difficultyColors: Record<string, string> = {
    EASY: 'text-green-400 bg-green-900/20 border-green-900/30',
    NORMAL: 'text-blue-400 bg-blue-900/20 border-blue-900/30',
    HARD: 'text-orange-400 bg-orange-900/20 border-orange-900/30',
    EXTREME: 'text-red-400 bg-red-900/20 border-red-900/30',
};

const myFighters: MyFighter[] = [
    { id: '1', name: 'Frog Master', emoji: '🐸', hp: 120, maxHp: 120, attack: 85 },
    { id: '2', name: 'Tiger Claw', emoji: '🐯', hp: 150, maxHp: 150, attack: 95 },
    { id: '3', name: 'Eagle Strike', emoji: '🦅', hp: 90, maxHp: 90, attack: 80 },
];

type BattleLog = {
    text: string;
    type: 'player' | 'boss' | 'system' | 'critical';
};

export default function BattlePage() {
    const [selectedBoss, setSelectedBoss] = useState<Boss | null>(null);
    const [selectedFighter, setSelectedFighter] = useState<MyFighter | null>(null);
    const [battleActive, setBattleActive] = useState(false);
    const [battleLog, setBattleLog] = useState<BattleLog[]>([]);
    const [playerHp, setPlayerHp] = useState(0);
    const [bossHp, setBossHp] = useState(0);
    const [battleResult, setBattleResult] = useState<'WIN' | 'LOSE' | null>(null);
    const [selectingFighter, setSelectingFighter] = useState(false);

    const startBattle = () => {
        if (!selectedBoss || !selectedFighter) return;
        setBattleActive(true);
        setBattleResult(null);
        setPlayerHp(selectedFighter.maxHp);
        setBossHp(selectedBoss.maxHp);
        setBattleLog([{ text: `⚔️ ${selectedFighter.name} VS ${selectedBoss.name}!`, type: 'system' }]);
    };

    const doAttack = () => {
        if (!selectedBoss || !selectedFighter || battleResult) return;

        const newLogs: BattleLog[] = [];

        // Player attacks
        const isCrit = Math.random() < 0.25;
        const playerDmg = Math.floor((selectedFighter.attack - selectedBoss.defense * 0.3) * (isCrit ? 1.5 : 1) * (0.9 + Math.random() * 0.2));
        const actualPlayerDmg = Math.max(playerDmg, 5);

        if (isCrit) {
            newLogs.push({ text: `💥 CRITICAL! ${selectedFighter.name} deals ${actualPlayerDmg} damage!`, type: 'critical' });
        } else {
            newLogs.push({ text: `👊 ${selectedFighter.name} kicks for ${actualPlayerDmg} damage!`, type: 'player' });
        }

        const newBossHp = Math.max(bossHp - actualPlayerDmg, 0);
        setBossHp(newBossHp);

        if (newBossHp <= 0) {
            newLogs.push({ text: `🏆 ${selectedBoss.name} DEFEATED! YOU WIN!`, type: 'system' });
            setBattleLog((prev) => [...prev, ...newLogs]);
            setBattleResult('WIN');
            return;
        }

        // Boss attacks
        const bossDmg = Math.floor(selectedBoss.attack * (0.8 + Math.random() * 0.4));
        const isDodge = Math.random() < 0.15;

        if (isDodge) {
            newLogs.push({ text: `💨 ${selectedFighter.name} dodges the attack!`, type: 'player' });
        } else {
            newLogs.push({ text: `🔥 ${selectedBoss.name} strikes for ${bossDmg} damage!`, type: 'boss' });
            const newPlayerHp = Math.max(playerHp - bossDmg, 0);
            setPlayerHp(newPlayerHp);

            if (newPlayerHp <= 0) {
                newLogs.push({ text: `💀 ${selectedFighter.name} has fallen... DEFEAT!`, type: 'system' });
                setBattleLog((prev) => [...prev, ...newLogs]);
                setBattleResult('LOSE');
                return;
            }
        }

        setBattleLog((prev) => [...prev, ...newLogs]);
    };

    const resetBattle = () => {
        setBattleActive(false);
        setBattleResult(null);
        setBattleLog([]);
        setSelectedBoss(null);
        setSelectedFighter(null);
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-8"
            >
                <h1 className="text-4xl font-black italic text-white tracking-tight">
                    AI BOSS <span className="text-red-500">BATTLE</span>
                </h1>
                <p className="text-gray-400 mt-2">Challenge powerful AI bosses with your beast fighters</p>
            </motion.div>

            {!battleActive ? (
                <>
                    {/* Boss Selection */}
                    <h3 className="text-sm font-bold text-gray-500 tracking-widest mb-4">SELECT BOSS</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {bosses.map((boss, index) => (
                            <motion.div
                                key={boss.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => { setSelectedBoss(boss); setSelectingFighter(true); }}
                                className={`bg-[#1a1a1a] border rounded-xl p-5 cursor-pointer transition-all duration-200 hover:scale-[1.03] ${selectedBoss?.id === boss.id
                                        ? 'border-red-500 shadow-lg shadow-red-500/20'
                                        : 'border-gray-800 hover:border-gray-600'
                                    }`}
                            >
                                <div className="text-center mb-3">
                                    <span className="text-5xl">{boss.emoji}</span>
                                </div>
                                <h3 className="text-white font-bold text-center">{boss.name}</h3>
                                <p className="text-gray-600 text-xs text-center mb-3">{boss.title}</p>
                                <div className={`text-center text-xs font-bold px-3 py-1 rounded-lg border ${difficultyColors[boss.difficulty]}`}>
                                    {boss.difficulty} • LV.{boss.level}
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs">
                                    <div className="bg-black/30 rounded py-1">
                                        <div className="text-red-400 font-bold">{boss.attack}</div>
                                        <div className="text-gray-600">ATK</div>
                                    </div>
                                    <div className="bg-black/30 rounded py-1">
                                        <div className="text-blue-400 font-bold">{boss.defense}</div>
                                        <div className="text-gray-600">DEF</div>
                                    </div>
                                    <div className="bg-black/30 rounded py-1">
                                        <div className="text-yellow-400 font-bold">{boss.speed}</div>
                                        <div className="text-gray-600">SPD</div>
                                    </div>
                                </div>
                                <div className="mt-3 text-center text-xs text-yellow-500">{boss.reward}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Fighter Selection Modal */}
                    <AnimatePresence>
                        {selectingFighter && selectedBoss && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                                onClick={() => setSelectingFighter(false)}
                            >
                                <motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.8 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[#1a1a1a] border border-gray-800 rounded-2xl max-w-lg w-full p-6"
                                >
                                    <h2 className="text-xl font-black italic text-white mb-1">SELECT YOUR FIGHTER</h2>
                                    <p className="text-gray-500 text-sm mb-5">VS {selectedBoss.name} ({selectedBoss.difficulty})</p>

                                    <div className="space-y-3">
                                        {myFighters.map((fighter) => (
                                            <button
                                                key={fighter.id}
                                                onClick={() => {
                                                    setSelectedFighter(fighter);
                                                    setSelectingFighter(false);
                                                    setTimeout(() => startBattle(), 100);
                                                }}
                                                className="w-full flex items-center gap-4 p-4 bg-black/30 border border-gray-700 rounded-xl hover:border-red-500 hover:bg-red-600/10 transition-all"
                                            >
                                                <span className="text-4xl">{fighter.emoji}</span>
                                                <div className="text-left flex-1">
                                                    <div className="text-white font-bold">{fighter.name}</div>
                                                    <div className="text-gray-500 text-xs">HP {fighter.maxHp} • ATK {fighter.attack}</div>
                                                </div>
                                                <div className="text-red-500 font-black italic text-sm">FIGHT →</div>
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setSelectingFighter(false)}
                                        className="mt-4 w-full py-2 text-gray-500 hover:text-white text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            ) : (
                /* Battle Scene */
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                >
                    {/* VS Header */}
                    <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between">
                            {/* Player */}
                            <div className="flex items-center gap-4">
                                <span className="text-5xl">{selectedFighter?.emoji}</span>
                                <div>
                                    <div className="text-white font-bold">{selectedFighter?.name}</div>
                                    <div className="mt-1 w-40">
                                        <div className="flex justify-between text-xs mb-0.5">
                                            <span className="text-green-400">HP</span>
                                            <span className="text-gray-400">{playerHp} / {selectedFighter?.maxHp}</span>
                                        </div>
                                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                                            <motion.div
                                                animate={{ width: `${(playerHp / (selectedFighter?.maxHp || 1)) * 100}%` }}
                                                className={`h-full rounded-full transition-all duration-300 ${playerHp / (selectedFighter?.maxHp || 1) > 0.5 ? 'bg-green-500' :
                                                        playerHp / (selectedFighter?.maxHp || 1) > 0.25 ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* VS */}
                            <div className="text-red-500 font-black italic text-3xl animate-pulse">VS</div>

                            {/* Boss */}
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-white font-bold">{selectedBoss?.name}</div>
                                    <div className="mt-1 w-48">
                                        <div className="flex justify-between text-xs mb-0.5">
                                            <span className="text-gray-400">{bossHp} / {selectedBoss?.maxHp}</span>
                                            <span className="text-red-400">HP</span>
                                        </div>
                                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                                            <motion.div
                                                animate={{ width: `${(bossHp / (selectedBoss?.maxHp || 1)) * 100}%` }}
                                                className="h-full bg-red-500 rounded-full transition-all duration-300"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <span className="text-5xl">{selectedBoss?.emoji}</span>
                            </div>
                        </div>
                    </div>

                    {/* Battle Log */}
                    <div className="bg-[#111] border border-gray-800 rounded-2xl p-4 h-64 overflow-y-auto font-mono text-sm space-y-1">
                        {battleLog.map((log, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`py-1 px-2 rounded ${log.type === 'player' ? 'text-green-400' :
                                        log.type === 'boss' ? 'text-red-400' :
                                            log.type === 'critical' ? 'text-yellow-400 font-bold bg-yellow-900/10' :
                                                'text-white font-bold'
                                    }`}
                            >
                                {log.text}
                            </motion.div>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 justify-center">
                        {!battleResult ? (
                            <>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={doAttack}
                                    className="px-12 py-4 bg-red-600 hover:bg-red-500 text-white font-black italic text-xl rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,0.5)] transition-colors"
                                >
                                    ⚔️ ATTACK
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={resetBattle}
                                    className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors"
                                >
                                    🏃 FLEE
                                </motion.button>
                            </>
                        ) : (
                            <div className="text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className={`text-5xl font-black italic mb-4 ${battleResult === 'WIN' ? 'text-yellow-400' : 'text-red-500'
                                        }`}
                                >
                                    {battleResult === 'WIN' ? '🏆 VICTORY!' : '💀 DEFEAT'}
                                </motion.div>
                                {battleResult === 'WIN' && selectedBoss && (
                                    <p className="text-yellow-500 text-sm mb-4">Reward: {selectedBoss.reward}</p>
                                )}
                                <button
                                    onClick={resetBattle}
                                    className="px-10 py-3 bg-red-600 hover:bg-red-500 text-white font-bold italic rounded-xl transition-colors shadow-[4px_4px_0px_rgba(0,0,0,0.5)]"
                                >
                                    BACK TO ARENA
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
