'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useFBX, useAnimations, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface Fighter {
  id: string;
  name: string;
  animal: string;
  emoji: string;
  tier: 'S' | 'A' | 'B' | 'C';
  level: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  wins: number;
  losses: number;
}

const mockFighters: Fighter[] = [
  { id: '1', name: 'Frog Master', animal: 'Frog', emoji: '🐸', tier: 'S', level: 15, hp: 120, attack: 85, defense: 60, speed: 90, wins: 12, losses: 2 },
  { id: '2', name: 'Tiger Claw', animal: 'Tiger', emoji: '🐯', tier: 'A', level: 10, hp: 150, attack: 95, defense: 70, speed: 65, wins: 8, losses: 4 },
  { id: '3', name: 'Eagle Strike', animal: 'Eagle', emoji: '🦅', tier: 'A', level: 8, hp: 90, attack: 80, defense: 45, speed: 95, wins: 6, losses: 3 },
  { id: '4', name: 'Bear Force', animal: 'Bear', emoji: '🐻', tier: 'B', level: 5, hp: 200, attack: 90, defense: 85, speed: 30, wins: 3, losses: 5 },
  { id: '5', name: 'Snake Venom', animal: 'Snake', emoji: '🐍', tier: 'B', level: 7, hp: 80, attack: 75, defense: 40, speed: 88, wins: 5, losses: 6 },
  { id: '6', name: 'Wolf Pack', animal: 'Wolf', emoji: '🐺', tier: 'C', level: 3, hp: 110, attack: 70, defense: 55, speed: 75, wins: 2, losses: 7 },
];

const tierColors: Record<string, string> = {
  S: 'from-yellow-400 to-orange-500 text-black',
  A: 'from-purple-500 to-pink-500 text-white',
  B: 'from-blue-500 to-cyan-500 text-white',
  C: 'from-gray-500 to-gray-600 text-white',
};

const tierBorder: Record<string, string> = {
  S: 'border-yellow-500/50 shadow-yellow-500/20',
  A: 'border-purple-500/50 shadow-purple-500/20',
  B: 'border-blue-500/50 shadow-blue-500/20',
  C: 'border-gray-600/50 shadow-gray-500/20',
};

// ─── 3D Character Viewer Component ─────────────────────────────────────
function CharacterModel({ action }: { action: string }) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/my/my.glb'); // Using a placeholder user character

  const idleFbx = useFBX('/animations/Ready Idle.fbx');
  const punchFbx = useFBX('/animations/Hook Punch.fbx');
  const sideKickFbx = useFBX('/animations/sideKick.fbx');
  const hurricaneKickFbx = useFBX('/animations/Hurricane Kick.fbx');
  const jumpKickFbx = useFBX('/animations/leftjumpKicking.fbx');
  const blockFbx = useFBX('/animations/Outward Block.fbx');
  const pushKickFbx = useFBX('/animations/pushKicking.fbx');
  const turnKickFbx = useFBX('/animations/turnkick.fbx');

  const [animations] = useState(() => [
    Object.assign(idleFbx.animations[0].clone(), { name: 'idle' }),
    Object.assign(punchFbx.animations[0].clone(), { name: 'punch' }),
    Object.assign(sideKickFbx.animations[0].clone(), { name: 'sideKick' }),
    Object.assign(hurricaneKickFbx.animations[0].clone(), { name: 'hurricaneKick' }),
    Object.assign(jumpKickFbx.animations[0].clone(), { name: 'jumpKick' }),
    Object.assign(blockFbx.animations[0].clone(), { name: 'block' }),
    Object.assign(pushKickFbx.animations[0].clone(), { name: 'pushKick' }),
    Object.assign(turnKickFbx.animations[0].clone(), { name: 'turnKick' }),
  ]);

  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (!actions || !actions[action]) return;
    const currentAction = actions[action];

    currentAction.reset().fadeIn(0.2).play();

    if (action !== 'idle') {
      currentAction.setLoop(THREE.LoopOnce, 1);
      currentAction.clampWhenFinished = true;
    }

    return () => {
      currentAction.fadeOut(0.2);
    };
  }, [action, actions]);

  return (
    <group ref={group} position={[0, -1.8, 0]} scale={1.8}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/my/my.glb');
useFBX.preload('/animations/Ready Idle.fbx');
useFBX.preload('/animations/Hook Punch.fbx');
useFBX.preload('/animations/sideKick.fbx');
useFBX.preload('/animations/Hurricane Kick.fbx');
useFBX.preload('/animations/leftjumpKicking.fbx');
useFBX.preload('/animations/Outward Block.fbx');
useFBX.preload('/animations/pushKicking.fbx');
useFBX.preload('/animations/turnkick.fbx');

export default function CollectionPage() {
  const [fighters] = useState<Fighter[]>(mockFighters);
  const [selectedFighter, setSelectedFighter] = useState<Fighter | null>(null);
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [currentAction, setCurrentAction] = useState('idle');

  const filteredFighters = filterTier === 'ALL'
    ? fighters
    : fighters.filter(f => f.tier === filterTier);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-black italic text-white tracking-tight">
            FIGHTER <span className="text-red-500">COLLECTION</span>
          </h1>
          <p className="text-gray-400 mt-2">
            {fighters.length} fighters in your roster
          </p>
        </div>
        {/* Tier Filter */}
        <div className="flex gap-2">
          {['ALL', 'S', 'A', 'B', 'C'].map((tier) => (
            <button
              key={tier}
              onClick={() => setFilterTier(tier)}
              className={`px-4 py-2 font-bold text-sm rounded-lg transition-all ${filterTier === tier
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Fighter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredFighters.map((fighter, index) => (
          <motion.div
            key={fighter.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            onClick={() => setSelectedFighter(fighter)}
            className={`bg-[#1a1a1a] border rounded-xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl ${tierBorder[fighter.tier]}`}
          >
            {/* Fighter Avatar */}
            <div className="relative h-40 bg-gradient-to-br from-[#1a1a1a] to-[#222] flex items-center justify-center overflow-hidden">
              <span className="text-7xl group-hover:scale-125 transition-transform duration-500">
                {fighter.emoji}
              </span>
              {/* Tier Badge */}
              <div className={`absolute top-3 left-3 px-3 py-1 rounded-lg font-black italic text-sm bg-gradient-to-r ${tierColors[fighter.tier]} shadow-[2px_2px_0px_rgba(0,0,0,0.5)]`}>
                {fighter.tier}
              </div>
              {/* Level */}
              <div className="absolute top-3 right-3 bg-black/60 px-2 py-1 rounded-lg text-xs font-bold text-gray-300">
                LV.{fighter.level}
              </div>
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent" />
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-lg">{fighter.name}</h3>
                <span className="text-gray-500 text-xs">{fighter.animal}</span>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'HP', value: fighter.hp, color: 'text-green-400' },
                  { label: 'ATK', value: fighter.attack, color: 'text-red-400' },
                  { label: 'DEF', value: fighter.defense, color: 'text-blue-400' },
                  { label: 'SPD', value: fighter.speed, color: 'text-yellow-400' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-black/30 rounded-lg py-1.5">
                    <div className={`text-xs font-bold ${stat.color}`}>{stat.label}</div>
                    <div className="text-white font-bold text-sm">{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Win/Loss */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-green-400 font-bold">{fighter.wins}W</span>
                <div className="flex-1 mx-3 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-red-500 rounded-full"
                    style={{ width: `${(fighter.wins / (fighter.wins + fighter.losses)) * 100}%` }}
                  />
                </div>
                <span className="text-red-400 font-bold">{fighter.losses}L</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Fighter Detail Modal */}
      <AnimatePresence>
        {selectedFighter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setSelectedFighter(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className={`bg-[#1a1a1a] border rounded-2xl max-w-md w-full overflow-hidden shadow-2xl ${tierBorder[selectedFighter.tier]}`}
            >
              {/* Modal Header */}
              <div className="relative h-72 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center overflow-hidden">
                <Canvas camera={{ position: [0, 1, 5], fov: 45 }}>
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[5, 10, 5]} intensity={2} />
                  <Environment preset="city" />

                  <React.Suspense fallback={null}>
                    <CharacterModel action={currentAction} />
                  </React.Suspense>

                  <ContactShadows position={[0, -1.8, 0]} opacity={0.6} scale={15} blur={1.5} far={4} />
                  <OrbitControls
                    enablePan={false}
                    enableZoom={true}
                    maxPolarAngle={Math.PI / 2 + 0.1}
                    minPolarAngle={Math.PI / 3}
                  />
                </Canvas>

                <div className={`absolute top-4 left-4 px-4 py-1.5 rounded-lg font-black italic bg-gradient-to-r ${tierColors[selectedFighter.tier]} shadow-[3px_3px_0px_rgba(0,0,0,0.5)] z-10`}>
                  TIER {selectedFighter.tier}
                </div>
                <button
                  onClick={() => setSelectedFighter(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-red-600 rounded-xl flex items-center justify-center transition-colors text-lg z-10"
                >
                  ✕
                </button>

                {/* 3D Actions */}
                <div className="absolute bottom-4 left-0 right-0 px-2 flex flex-wrap justify-center gap-1.5 z-10 w-full mb-1">
                  <button
                    onClick={() => { setCurrentAction('punch'); setTimeout(() => setCurrentAction('idle'), 1300) }}
                    className="px-2 py-1.5 bg-blue-600/80 hover:bg-blue-500 backdrop-blur text-white text-[10px] font-bold rounded-lg transition-all"
                  >
                    👊 PUNCH
                  </button>
                  <button
                    onClick={() => { setCurrentAction('block'); setTimeout(() => setCurrentAction('idle'), 1300) }}
                    className="px-2 py-1.5 bg-gray-600/80 hover:bg-gray-500 backdrop-blur text-white text-[10px] font-bold rounded-lg transition-all"
                  >
                    🛡️ BLOCK
                  </button>
                  <button
                    onClick={() => { setCurrentAction('pushKick'); setTimeout(() => setCurrentAction('idle'), 1300) }}
                    className="px-2 py-1.5 bg-orange-600/80 hover:bg-orange-500 backdrop-blur text-white text-[10px] font-bold rounded-lg transition-all"
                  >
                    🦵 PUSH KICK
                  </button>
                  <button
                    onClick={() => { setCurrentAction('sideKick'); setTimeout(() => setCurrentAction('idle'), 1500) }}
                    className="px-2 py-1.5 bg-red-600/80 hover:bg-red-500 backdrop-blur text-white text-[10px] font-bold rounded-lg transition-all"
                  >
                    🦶 SIDE KICK
                  </button>
                  <button
                    onClick={() => { setCurrentAction('turnKick'); setTimeout(() => setCurrentAction('idle'), 1600) }}
                    className="px-2 py-1.5 bg-yellow-600/80 hover:bg-yellow-500 backdrop-blur text-white text-[10px] font-bold rounded-lg transition-all"
                  >
                    🌪️ TURN KICK
                  </button>
                  <button
                    onClick={() => { setCurrentAction('jumpKick'); setTimeout(() => setCurrentAction('idle'), 1600) }}
                    className="px-2 py-1.5 bg-purple-600/80 hover:bg-purple-500 backdrop-blur text-white text-[10px] font-bold rounded-lg transition-all"
                  >
                    🚀 JUMP KICK
                  </button>
                  <button
                    onClick={() => { setCurrentAction('hurricaneKick'); setTimeout(() => setCurrentAction('idle'), 2500) }}
                    className="px-2 py-1.5 bg-gradient-to-r from-red-600 to-yellow-500 hover:from-red-500 hover:to-yellow-400 backdrop-blur text-white text-[10px] font-black rounded-lg transition-all shadow-lg shadow-red-500/30 w-[80%] max-w-[200px]"
                  >
                    ⚡ HURRICANE KICK
                  </button>
                </div>
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-black italic text-white">{selectedFighter.name}</h2>
                <p className="text-gray-500 text-sm mb-4">Level {selectedFighter.level} • {selectedFighter.animal} Fighter</p>

                {/* Detailed Stats */}
                <div className="space-y-3">
                  {[
                    { label: 'HP', value: selectedFighter.hp, max: 200, color: 'bg-green-500' },
                    { label: 'ATTACK', value: selectedFighter.attack, max: 100, color: 'bg-red-500' },
                    { label: 'DEFENSE', value: selectedFighter.defense, max: 100, color: 'bg-blue-500' },
                    { label: 'SPEED', value: selectedFighter.speed, max: 100, color: 'bg-yellow-500' },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400 font-bold">{stat.label}</span>
                        <span className="text-white font-bold">{stat.value}</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(stat.value / stat.max) * 100}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full ${stat.color} rounded-full`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Record */}
                <div className="mt-5 flex gap-3">
                  <div className="flex-1 bg-green-900/20 border border-green-900/30 rounded-xl p-3 text-center">
                    <div className="text-green-400 text-2xl font-black">{selectedFighter.wins}</div>
                    <div className="text-green-400/60 text-xs font-bold">WINS</div>
                  </div>
                  <div className="flex-1 bg-red-900/20 border border-red-900/30 rounded-xl p-3 text-center">
                    <div className="text-red-400 text-2xl font-black">{selectedFighter.losses}</div>
                    <div className="text-red-400/60 text-xs font-bold">LOSSES</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
