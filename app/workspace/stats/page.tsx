'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Fighter {
  id: string;
  name: string;
  emoji: string;
  tier: string;
  level: number;
  exp: number;
  maxExp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number;
  dodgeRate: number;
  specialMove: string;
  specialDesc: string;
  element: string;
}

const fighters: Fighter[] = [
  { id: '1', name: 'Frog Master', emoji: '🐸', tier: 'S', level: 15, exp: 750, maxExp: 1000, hp: 120, attack: 85, defense: 60, speed: 90, critRate: 25, dodgeRate: 30, specialMove: 'Tongue Whip', specialDesc: 'Stretches tongue to grab and slam the opponent', element: '💧 Water' },
  { id: '2', name: 'Tiger Claw', emoji: '🐯', tier: 'A', level: 10, exp: 420, maxExp: 800, hp: 150, attack: 95, defense: 70, speed: 65, critRate: 30, dodgeRate: 15, specialMove: 'Savage Rush', specialDesc: 'Triple claw combo with increasing damage', element: '🔥 Fire' },
  { id: '3', name: 'Eagle Strike', emoji: '🦅', tier: 'A', level: 8, exp: 300, maxExp: 700, hp: 90, attack: 80, defense: 45, speed: 95, critRate: 35, dodgeRate: 40, specialMove: 'Sky Dive', specialDesc: 'Swoops from above dealing massive aerial damage', element: '💨 Wind' },
  { id: '4', name: 'Bear Force', emoji: '🐻', tier: 'B', level: 5, exp: 150, maxExp: 500, hp: 200, attack: 90, defense: 85, speed: 30, critRate: 15, dodgeRate: 5, specialMove: 'Ground Pound', specialDesc: 'Slams the ground causing an area earthquake', element: '🪨 Earth' },
];

const statDescriptions: Record<string, string> = {
  hp: 'Total health points',
  attack: 'Physical damage power',
  defense: 'Damage reduction',
  speed: 'Turn priority & dodge',
  critRate: 'Critical hit chance %',
  dodgeRate: 'Evasion chance %',
};

export default function StatsPage() {
  const [selected, setSelected] = useState<Fighter>(fighters[0]);

  const totalPower = selected.hp + selected.attack + selected.defense + selected.speed;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-black italic text-white tracking-tight">
          CHARACTER <span className="text-red-500">STATS</span>
        </h1>
        <p className="text-gray-400 mt-2">Analyze and compare fighter abilities</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fighter Selector (Left) */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="space-y-2"
        >
          <h3 className="text-sm font-bold text-gray-500 tracking-widest mb-3">SELECT FIGHTER</h3>
          {fighters.map((fighter) => (
            <button
              key={fighter.id}
              onClick={() => setSelected(fighter)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 border ${
                selected.id === fighter.id
                  ? 'bg-red-600/15 border-red-600/50 text-white'
                  : 'bg-[#1a1a1a] border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'
              }`}
            >
              <span className="text-3xl">{fighter.emoji}</span>
              <div className="text-left flex-1">
                <div className="font-bold text-sm">{fighter.name}</div>
                <div className="text-xs text-gray-500">LV.{fighter.level} • Tier {fighter.tier}</div>
              </div>
              <div className="text-xs font-bold text-gray-600">
                PWR {fighter.hp + fighter.attack + fighter.defense + fighter.speed}
              </div>
            </button>
          ))}
        </motion.div>

        {/* Stat Detail (Center + Right) */}
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 space-y-5"
        >
          {/* Fighter Header Card */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 flex items-center gap-6">
            <div className="text-7xl">{selected.emoji}</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-black italic text-white">{selected.name}</h2>
                <span className="px-2 py-0.5 bg-red-600/20 border border-red-600/40 rounded-lg text-red-400 text-xs font-bold">
                  {selected.element}
                </span>
              </div>
              <p className="text-gray-500 text-sm">Level {selected.level} • Tier {selected.tier}</p>
              {/* EXP Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">EXP</span>
                  <span className="text-gray-400">{selected.exp} / {selected.maxExp}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(selected.exp / selected.maxExp) * 100}%` }}
                    transition={{ duration: 1 }}
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                  />
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-white">{totalPower}</div>
              <div className="text-xs text-gray-500 font-bold tracking-wider">TOTAL PWR</div>
            </div>
          </div>

          {/* Stat Bars */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-gray-500 tracking-widest mb-4">COMBAT STATS</h3>
            <div className="space-y-4">
              {[
                { key: 'hp', label: 'HP', value: selected.hp, max: 200, color: 'from-green-600 to-green-400', icon: '❤️' },
                { key: 'attack', label: 'ATTACK', value: selected.attack, max: 100, color: 'from-red-600 to-red-400', icon: '⚔️' },
                { key: 'defense', label: 'DEFENSE', value: selected.defense, max: 100, color: 'from-blue-600 to-blue-400', icon: '🛡️' },
                { key: 'speed', label: 'SPEED', value: selected.speed, max: 100, color: 'from-yellow-600 to-yellow-400', icon: '⚡' },
              ].map((stat) => (
                <div key={stat.key} className="group">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-300 font-bold flex items-center gap-2">
                      <span>{stat.icon}</span> {stat.label}
                    </span>
                    <span className="text-white font-black">{stat.value}</span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(stat.value / stat.max) * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                      className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {statDescriptions[stat.key]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Special Stats + Move */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Critical & Dodge */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-gray-500 tracking-widest mb-4">SPECIAL STATS</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center bg-black/30 rounded-xl p-4">
                  <div className="text-orange-400 text-2xl font-black">{selected.critRate}%</div>
                  <div className="text-gray-500 text-xs font-bold mt-1">CRIT RATE</div>
                </div>
                <div className="text-center bg-black/30 rounded-xl p-4">
                  <div className="text-cyan-400 text-2xl font-black">{selected.dodgeRate}%</div>
                  <div className="text-gray-500 text-xs font-bold mt-1">DODGE RATE</div>
                </div>
              </div>
            </div>

            {/* Special Move */}
            <div className="bg-[#1a1a1a] border border-yellow-900/30 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-yellow-500 tracking-widest mb-3">⚡ SPECIAL MOVE</h3>
              <div className="text-white font-black text-xl italic">{selected.specialMove}</div>
              <p className="text-gray-400 text-sm mt-2">{selected.specialDesc}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
