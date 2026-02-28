'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useFBX, useAnimations, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useRef, useEffect } from 'react';

// ─── Apply color material to white/untextured meshes ─────────
function applyColorToModel(scene: THREE.Object3D, color: string) {
  scene.traverse((child: any) => {
    if (child.isMesh || child.isSkinnedMesh) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && !mat.map) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color),
          roughness: 0.5,
          metalness: 0.1,
          skinning: true,
        } as any);
      }
    }
  });
}

// ─── 3D Preview Component ────────────────────────────────────
function ModelPreview({ modelPath, color }: { modelPath: string, color: string }) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelPath);
  const idleFbx = useFBX('/animations/Ready Idle.fbx');

  useEffect(() => {
    applyColorToModel(scene, color);
  }, [scene, color]);

  const [animations] = useState(() => {
    const cloned = idleFbx.animations[0].clone();
    cloned.name = 'idle';
    cloned.tracks.forEach(track => {
      track.name = track.name.replace('mixamorig', '');
    });
    return [cloned];
  });

  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (actions?.idle) {
      actions.idle.reset().fadeIn(0.2).play();
    }
  }, [actions]);

  return (
    <group ref={group} position={[0, -1.6, 0]} scale={1.6}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/my/my.glb');
useGLTF.preload('/boss/frogboss.glb');
useFBX.preload('/animations/Ready Idle.fbx');

// ─── Character Data ──────────────────────────────────────────
interface CharacterData {
  id: string;
  name: string;
  model: string;
  color: string;
  role: string;
  tier: string;
  level: number;
  exp: number;
  maxExp: number;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    stamina: number;
    technique: number;
  };
  moves: { name: string; type: string; damage: number; emoji: string }[];
  description: string;
}

const characters: CharacterData[] = [
  {
    id: 'player',
    name: 'MY FIGHTER',
    model: '/my/my.glb',
    color: '#3b82f6',
    role: 'Player',
    tier: 'S',
    level: 1,
    exp: 0,
    maxExp: 100,
    stats: { hp: 100, attack: 25, defense: 15, speed: 20, stamina: 30, technique: 35 },
    moves: [
      { name: 'Punch', type: 'Light', damage: 10, emoji: '👊' },
      { name: 'Push Kick', type: 'Medium', damage: 12, emoji: '🦵' },
      { name: 'Side Kick', type: 'Medium', damage: 15, emoji: '🦶' },
      { name: 'Turn Kick', type: 'Heavy', damage: 18, emoji: '🌪️' },
      { name: 'Jump Kick', type: 'Heavy', damage: 20, emoji: '🚀' },
      { name: 'Hurricane Kick', type: 'Ultimate', damage: 30, emoji: '⚡' },
      { name: 'Block', type: 'Defensive', damage: 0, emoji: '🛡️' },
    ],
    description: 'Your custom taekwondo fighter. Train and level up through battles to unlock your full potential.',
  },
  {
    id: 'frogboss',
    name: 'FROG BOSS',
    model: '/boss/frogboss.glb',
    color: '#22c55e',
    role: 'Boss',
    tier: 'S',
    level: 10,
    exp: 0,
    maxExp: 999,
    stats: { hp: 100, attack: 20, defense: 25, speed: 15, stamina: 40, technique: 20 },
    moves: [
      { name: 'Idle', type: 'Passive', damage: 0, emoji: '🐸' },
      { name: 'Hit Reaction', type: 'Reactive', damage: 0, emoji: '💥' },
      { name: 'KO', type: 'Defeat', damage: 0, emoji: '☠️' },
    ],
    description: 'A fearsome frog warrior. Sturdy and resilient, it can take a lot of punishment before going down.',
  },
];

const tierColors: Record<string, string> = {
  S: 'from-yellow-400 to-orange-500 text-black',
  A: 'from-purple-500 to-pink-500 text-white',
  B: 'from-blue-500 to-cyan-500 text-white',
};

const moveTypeColors: Record<string, string> = {
  Light: 'text-blue-400 bg-blue-900/30 border-blue-800/40',
  Medium: 'text-orange-400 bg-orange-900/30 border-orange-800/40',
  Heavy: 'text-red-400 bg-red-900/30 border-red-800/40',
  Ultimate: 'text-yellow-400 bg-yellow-900/30 border-yellow-800/40',
  Defensive: 'text-gray-400 bg-gray-800/30 border-gray-700/40',
  Passive: 'text-green-400 bg-green-900/30 border-green-800/40',
  Reactive: 'text-purple-400 bg-purple-900/30 border-purple-800/40',
  Defeat: 'text-gray-500 bg-gray-900/30 border-gray-800/40',
};

export default function StatsPage() {
  const [selected, setSelected] = useState<CharacterData>(characters[0]);

  const totalPower = Object.values(selected.stats).reduce((a, b) => a + b, 0);

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
        <p className="text-gray-400 mt-2">Analyze fighter abilities and move sets</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Character Selector (Left) */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="space-y-4"
        >
          <h3 className="text-sm font-bold text-gray-500 tracking-widest mb-3">SELECT CHARACTER</h3>
          {characters.map((char) => (
            <button
              key={char.id}
              onClick={() => setSelected(char)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 border ${selected.id === char.id
                  ? 'bg-red-600/15 border-red-600/50 text-white'
                  : 'bg-[#1a1a1a] border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black ${char.role === 'Player' ? 'bg-blue-600/30 text-blue-400' : 'bg-green-600/30 text-green-400'
                }`}>
                {char.role === 'Player' ? '🥋' : '🐸'}
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-sm">{char.name}</div>
                <div className="text-xs text-gray-500">LV.{char.level} • {char.role}</div>
              </div>
              <div className="text-xs font-bold text-gray-600">
                PWR {Object.values(char.stats).reduce((a, b) => a + b, 0)}
              </div>
            </button>
          ))}

          {/* 3D Preview */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden" style={{ height: 240 }}>
            <Canvas camera={{ position: [0, 1, 4], fov: 45 }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 10, 5]} intensity={2} />
              <Environment preset="city" />
              <React.Suspense fallback={null}>
                <ModelPreview modelPath={selected.model} color={selected.color} />
              </React.Suspense>
              <ContactShadows position={[0, -1.6, 0]} opacity={0.5} scale={10} blur={1.5} far={3} />
              <OrbitControls
                enablePan={false}
                enableZoom={false}
                maxPolarAngle={Math.PI / 2 + 0.1}
                minPolarAngle={Math.PI / 3}
              />
            </Canvas>
          </div>
        </motion.div>

        {/* Stat Detail (Center + Right) */}
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 space-y-5"
        >
          {/* Character Header Card */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-black italic text-white">{selected.name}</h2>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black italic bg-gradient-to-r ${tierColors[selected.tier]}`}>
                    TIER {selected.tier}
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${selected.role === 'Player' ? 'bg-blue-900/30 text-blue-400 border border-blue-800/40' : 'bg-green-900/30 text-green-400 border border-green-800/40'
                    }`}>
                    {selected.role}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">{selected.description}</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-white">{totalPower}</div>
                <div className="text-xs text-gray-500 font-bold tracking-wider">TOTAL PWR</div>
              </div>
            </div>
            {/* EXP Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">LV.{selected.level} EXP</span>
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

          {/* Combat Stats */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-gray-500 tracking-widest mb-4">COMBAT STATS</h3>
            <div className="space-y-4">
              {[
                { key: 'hp', label: 'HP', value: selected.stats.hp, max: 200, color: 'from-green-600 to-green-400', icon: '❤️', desc: 'Total health points in battle' },
                { key: 'attack', label: 'ATTACK', value: selected.stats.attack, max: 100, color: 'from-red-600 to-red-400', icon: '⚔️', desc: 'Physical damage power' },
                { key: 'defense', label: 'DEFENSE', value: selected.stats.defense, max: 100, color: 'from-blue-600 to-blue-400', icon: '🛡️', desc: 'Damage reduction from hits' },
                { key: 'speed', label: 'SPEED', value: selected.stats.speed, max: 100, color: 'from-yellow-600 to-yellow-400', icon: '⚡', desc: 'Action recovery speed' },
                { key: 'stamina', label: 'STAMINA', value: selected.stats.stamina, max: 100, color: 'from-purple-600 to-purple-400', icon: '💪', desc: 'Endurance for consecutive attacks' },
                { key: 'technique', label: 'TECHNIQUE', value: selected.stats.technique, max: 100, color: 'from-cyan-600 to-cyan-400', icon: '🎯', desc: 'Kick precision and combo ability' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="group"
                >
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
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 + i * 0.06 }}
                      className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {stat.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Move Set */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-gray-500 tracking-widest mb-4">
              {selected.role === 'Player' ? '⚡ MOVE SET' : '🐸 BOSS BEHAVIOR'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selected.moves.map((move, i) => (
                <motion.div
                  key={move.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${moveTypeColors[move.type]}`}
                >
                  <span className="text-2xl">{move.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{move.name}</div>
                    <div className="text-xs opacity-70">{move.type}</div>
                  </div>
                  {move.damage > 0 && (
                    <div className="text-right">
                      <div className="font-black text-lg">{move.damage}</div>
                      <div className="text-[10px] opacity-60 font-bold">DMG</div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Stat Comparison (if both exist) */}
          {characters.length >= 2 && (
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-gray-500 tracking-widest mb-4">📊 STAT COMPARISON</h3>
              <div className="space-y-3">
                {(['hp', 'attack', 'defense', 'speed', 'stamina', 'technique'] as const).map((stat) => {
                  const p = characters[0].stats[stat];
                  const b = characters[1].stats[stat];
                  const max = Math.max(p, b, 1);
                  return (
                    <div key={stat} className="flex items-center gap-3">
                      {/* Player bar (right aligned) */}
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-blue-400 font-black text-xs w-6 text-right">{p}</span>
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden flex justify-end">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(p / max) * 100}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-full bg-blue-500 rounded-full"
                          />
                        </div>
                      </div>
                      {/* Label */}
                      <span className="text-gray-400 text-xs font-bold w-16 text-center uppercase">{stat}</span>
                      {/* Boss bar (left aligned) */}
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(b / max) * 100}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-full bg-green-500 rounded-full"
                          />
                        </div>
                        <span className="text-green-400 font-black text-xs w-6">{b}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                  <span className="text-blue-400 font-bold">🥋 MY FIGHTER</span>
                  <span className="text-green-400 font-bold">🐸 FROG BOSS</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
