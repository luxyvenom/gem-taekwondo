'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useFBX, useAnimations, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// ─── Attack definitions ──────────────────────────────────────
interface AttackDef {
    key: string;
    label: string;
    emoji: string;
    damage: number;
    colorFrom: string;
    colorTo: string;
    hoverFrom: string;
    hoverTo: string;
    shadow: string;
    hoverShadow: string;
}

const ATTACKS: AttackDef[] = [
    { key: 'punch', label: 'PUNCH', emoji: '👊', damage: 10, colorFrom: 'from-blue-700', colorTo: 'to-indigo-600', hoverFrom: 'hover:from-blue-600', hoverTo: 'hover:to-indigo-500', shadow: 'shadow-[0_0_12px_rgba(79,70,229,0.5)]', hoverShadow: 'hover:shadow-[0_0_20px_rgba(79,70,229,0.8)]' },
    { key: 'block', label: 'BLOCK', emoji: '🛡️', damage: 0, colorFrom: 'from-gray-600', colorTo: 'to-gray-500', hoverFrom: 'hover:from-gray-500', hoverTo: 'hover:to-gray-400', shadow: 'shadow-[0_0_12px_rgba(107,114,128,0.5)]', hoverShadow: 'hover:shadow-[0_0_20px_rgba(107,114,128,0.8)]' },
    { key: 'pushKick', label: 'PUSH KICK', emoji: '🦵', damage: 12, colorFrom: 'from-orange-600', colorTo: 'to-amber-500', hoverFrom: 'hover:from-orange-500', hoverTo: 'hover:to-amber-400', shadow: 'shadow-[0_0_12px_rgba(234,88,12,0.5)]', hoverShadow: 'hover:shadow-[0_0_20px_rgba(234,88,12,0.8)]' },
    { key: 'sideKick', label: 'SIDE KICK', emoji: '🦶', damage: 15, colorFrom: 'from-red-700', colorTo: 'to-red-500', hoverFrom: 'hover:from-red-600', hoverTo: 'hover:to-red-400', shadow: 'shadow-[0_0_12px_rgba(220,38,38,0.5)]', hoverShadow: 'hover:shadow-[0_0_20px_rgba(220,38,38,0.8)]' },
    { key: 'turnKick', label: 'TURN KICK', emoji: '🌪️', damage: 18, colorFrom: 'from-yellow-600', colorTo: 'to-yellow-400', hoverFrom: 'hover:from-yellow-500', hoverTo: 'hover:to-yellow-300', shadow: 'shadow-[0_0_12px_rgba(202,138,4,0.5)]', hoverShadow: 'hover:shadow-[0_0_20px_rgba(202,138,4,0.8)]' },
    { key: 'jumpKick', label: 'JUMP KICK', emoji: '🚀', damage: 20, colorFrom: 'from-purple-700', colorTo: 'to-purple-500', hoverFrom: 'hover:from-purple-600', hoverTo: 'hover:to-purple-400', shadow: 'shadow-[0_0_12px_rgba(126,34,206,0.5)]', hoverShadow: 'hover:shadow-[0_0_20px_rgba(126,34,206,0.8)]' },
    { key: 'hurricaneKick', label: 'HURRICANE', emoji: '⚡', damage: 30, colorFrom: 'from-red-600', colorTo: 'to-yellow-500', hoverFrom: 'hover:from-red-500', hoverTo: 'hover:to-yellow-400', shadow: 'shadow-[0_0_12px_rgba(239,68,68,0.5)]', hoverShadow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.8)]' },
];

// ─── Apply color material to white/untextured meshes ─────────
function applyColorToModel(scene: THREE.Object3D, color: string) {
    scene.traverse((child: any) => {
        if (child.isMesh || child.isSkinnedMesh) {
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            // Check if the material is effectively white/untextured
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

// ─── 3D Player Component ─────────────────────────────────────
function PlayerModel({ action, onActionComplete }: { action: string, onActionComplete: () => void }) {
    const group = useRef<THREE.Group>(null);
    const { scene } = useGLTF('/my/my.glb');

    // Apply player color (blue-ish fighter)
    useEffect(() => {
        applyColorToModel(scene, '#3b82f6');
    }, [scene]);

    const idleFbx = useFBX('/animations/Ready Idle.fbx');
    const punchFbx = useFBX('/animations/Hook Punch.fbx');
    const sideKickFbx = useFBX('/animations/sideKick.fbx');
    const hurricaneKickFbx = useFBX('/animations/Hurricane Kick.fbx');
    const jumpKickFbx = useFBX('/animations/leftjumpKicking.fbx');
    const blockFbx = useFBX('/animations/Outward Block.fbx');
    const pushKickFbx = useFBX('/animations/pushKicking.fbx');
    const turnKickFbx = useFBX('/animations/turnkick.fbx');

    const [animations] = useState(() => {
        const processClip = (clip: THREE.AnimationClip, name: string) => {
            const cloned = clip.clone();
            cloned.name = name;
            cloned.tracks.forEach(track => {
                track.name = track.name.replace('mixamorig', '');
            });
            return cloned;
        };
        return [
            processClip(idleFbx.animations[0], 'idle'),
            processClip(punchFbx.animations[0], 'punch'),
            processClip(sideKickFbx.animations[0], 'sideKick'),
            processClip(hurricaneKickFbx.animations[0], 'hurricaneKick'),
            processClip(jumpKickFbx.animations[0], 'jumpKick'),
            processClip(blockFbx.animations[0], 'block'),
            processClip(pushKickFbx.animations[0], 'pushKick'),
            processClip(turnKickFbx.animations[0], 'turnKick'),
        ];
    });

    const { actions } = useAnimations(animations, group);

    useEffect(() => {
        if (!actions || !actions[action]) return;
        const currentAction = actions[action];

        currentAction.reset().fadeIn(0.2).play();

        if (action !== 'idle') {
            currentAction.setLoop(THREE.LoopOnce, 1);
            currentAction.clampWhenFinished = true;

            const mixer = currentAction.getMixer();
            const handleFinished = (e: any) => {
                if (e.action === currentAction) {
                    onActionComplete();
                }
            };
            mixer.addEventListener('finished', handleFinished);
            return () => {
                mixer.removeEventListener('finished', handleFinished);
                currentAction.fadeOut(0.2);
            };
        }

        return () => {
            currentAction.fadeOut(0.2);
        };
    }, [action, actions, onActionComplete]);

    return (
        <group ref={group} position={[-2, -1.0, 0]} rotation={[0, Math.PI / 2, 0]} scale={2.5}>
            <primitive object={scene} />
        </group>
    );
}

// ─── 3D Boss Component ───────────────────────────────────────
function BossModel({ action, onActionComplete }: { action: string, onActionComplete: () => void }) {
    const group = useRef<THREE.Group>(null);
    const { scene } = useGLTF('/boss/frogboss.glb');

    // Apply boss color (green frog boss)
    useEffect(() => {
        applyColorToModel(scene, '#22c55e');
    }, [scene]);

    const idleFbx = useFBX('/animations/Ready Idle.fbx');
    const hitFbx = useFBX('/animations/Hit.fbx');
    const koFbx = useFBX('/animations/KO.fbx');

    const [animations] = useState(() => {
        const processClip = (clip: THREE.AnimationClip, name: string) => {
            const cloned = clip.clone();
            cloned.name = name;
            cloned.tracks.forEach(track => {
                track.name = track.name.replace('mixamorig', '');
            });
            return cloned;
        };
        return [
            processClip(idleFbx.animations[0], 'idle'),
            processClip(hitFbx.animations[0], 'hit'),
            processClip(koFbx.animations[0], 'ko'),
        ];
    });

    const { actions } = useAnimations(animations, group);

    useEffect(() => {
        if (!actions || !actions[action]) return;
        const currentAction = actions[action];

        currentAction.reset().fadeIn(0.2).play();

        if (action === 'hit') {
            currentAction.setLoop(THREE.LoopOnce, 1);
            currentAction.clampWhenFinished = true;

            const mixer = currentAction.getMixer();
            const handleFinished = (e: any) => {
                if (e.action === currentAction) {
                    onActionComplete();
                }
            };
            mixer.addEventListener('finished', handleFinished);
            return () => {
                mixer.removeEventListener('finished', handleFinished);
                currentAction.fadeOut(0.2);
            };
        } else if (action === 'ko') {
            currentAction.setLoop(THREE.LoopOnce, 1);
            currentAction.clampWhenFinished = true;
        }

        return () => {
            currentAction.fadeOut(0.2);
        };
    }, [action, actions, onActionComplete]);

    return (
        <group ref={group} position={[2, -1.0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={2.5}>
            <primitive object={scene} />
        </group>
    );
}

// ─── Preload assets ──────────────────────────────────────────
useGLTF.preload('/my/my.glb');
useGLTF.preload('/boss/frogboss.glb');
useFBX.preload('/animations/Ready Idle.fbx');
useFBX.preload('/animations/Hook Punch.fbx');
useFBX.preload('/animations/sideKick.fbx');
useFBX.preload('/animations/Hurricane Kick.fbx');
useFBX.preload('/animations/leftjumpKicking.fbx');
useFBX.preload('/animations/Outward Block.fbx');
useFBX.preload('/animations/pushKicking.fbx');
useFBX.preload('/animations/turnkick.fbx');
useFBX.preload('/animations/Hit.fbx');
useFBX.preload('/animations/KO.fbx');


export default function BattlePage() {
    const [playerAction, setPlayerAction] = useState('idle');
    const [bossAction, setBossAction] = useState('idle');

    const [playerHp, setPlayerHp] = useState(100);
    const [bossHp, setBossHp] = useState(100);
    const [battleLog, setBattleLog] = useState<{ text: string, type: string }[]>([]);
    const [lastHit, setLastHit] = useState<string | null>(null);

    useEffect(() => {
        setBattleLog([{ text: "🥊 Ready for battle!", type: "system" }]);
    }, []);

    const doAttack = useCallback((attackKey: string) => {
        if (playerAction !== 'idle' || bossAction === 'ko') return;

        const attack = ATTACKS.find(a => a.key === attackKey);
        if (!attack) return;

        // Start player attack animation
        setPlayerAction(attackKey);
        setLastHit(attackKey);
        setBattleLog(prev => [{ text: `🔥 ${attack.emoji} ${attack.label}!`, type: 'player' }, ...prev].slice(0, 5));

        if (attack.damage === 0) {
            // Block: no damage to boss, just play animation
            return;
        }

        // Boss reacts after a short delay
        setTimeout(() => {
            if (bossHp <= 0) return;
            const newHp = Math.max(bossHp - attack.damage, 0);

            setBossHp(newHp);

            if (newHp <= 0) {
                setBossAction('ko');
                setBattleLog(prev => [{ text: `🏆 BOSS DEFEATED!`, type: 'critical' }, ...prev].slice(0, 5));
            } else {
                setBossAction('hit');
                setBattleLog(prev => [{ text: `💥 -${attack.damage} DMG!`, type: 'damage' }, ...prev].slice(0, 5));
            }
        }, 500);
    }, [playerAction, bossAction, bossHp]);

    const handlePlayerFinished = useCallback(() => {
        setPlayerAction('idle');
    }, []);

    const handleBossFinished = useCallback(() => {
        if (bossAction !== 'ko') {
            setBossAction('idle');
        }
    }, [bossAction]);

    const resetBattle = useCallback(() => {
        setPlayerAction('idle');
        setBossAction('idle');
        setPlayerHp(100);
        setBossHp(100);
        setLastHit(null);
        setBattleLog([{ text: "🥊 New battle started!", type: "system" }]);
    }, []);

    return (
        <div className="relative w-full h-[calc(100vh-4rem)] bg-[#0a0a0a] overflow-hidden">

            {/* ─── HUD / UI ─── */}
            <div className="absolute top-0 inset-x-0 z-10 p-6 flex justify-between items-start pointer-events-none">
                {/* Player Stats */}
                <div className="w-1/3">
                    <div className="flex justify-between text-white font-bold mb-1">
                        <span className="text-xl italic">MY FIGHTER</span>
                        <span className="text-blue-400">{playerHp} HP</span>
                    </div>
                    <div className="h-4 bg-gray-900 rounded-full border-2 border-gray-700 overflow-hidden shadow-lg shadow-blue-900/20">
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-700 to-blue-400"
                            initial={{ width: '100%' }}
                            animate={{ width: `${(playerHp / 100) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                <div className="text-4xl font-black italic text-red-600 tracking-widest drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] mt-4">
                    VS
                </div>

                {/* Boss Stats */}
                <div className="w-1/3">
                    <div className="flex justify-between text-white font-bold mb-1">
                        <span className="text-orange-400">{bossHp} HP</span>
                        <span className="text-xl italic">FROG BOSS</span>
                    </div>
                    <div className="h-4 bg-gray-900 rounded-full border-2 border-gray-700 overflow-hidden shadow-lg shadow-orange-900/20 flex justify-end">
                        <motion.div
                            className="h-full bg-gradient-to-l from-orange-600 to-red-500"
                            initial={{ width: '100%' }}
                            animate={{ width: `${(bossHp / 100) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>
            </div>

            {/* ─── Battle Log ─── */}
            <div className="absolute top-24 left-6 z-10 pointer-events-none">
                <AnimatePresence>
                    {battleLog.slice(0, 3).map((log, i) => (
                        <motion.div
                            key={`${log.text}-${i}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1 - i * 0.3, x: 0 }}
                            exit={{ opacity: 0 }}
                            className={`text-sm font-bold mb-1 ${
                                log.type === 'critical' ? 'text-yellow-400 text-lg' :
                                log.type === 'damage' ? 'text-red-400' :
                                log.type === 'player' ? 'text-blue-300' :
                                'text-gray-400'
                            }`}
                        >
                            {log.text}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* ─── 3D Canvas ─── */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-[#111] to-[#050505] cursor-default z-0">
                <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[5, 10, 5]} intensity={2} castShadow />
                    <directionalLight position={[-5, 5, -5]} intensity={1} color="#4338ca" />
                    <Environment preset="city" />

                    <React.Suspense fallback={null}>
                        <PlayerModel action={playerAction} onActionComplete={handlePlayerFinished} />
                        <BossModel action={bossAction} onActionComplete={handleBossFinished} />
                    </React.Suspense>

                    <ContactShadows position={[0, -1.0, 0]} opacity={0.6} scale={20} blur={2} far={4} />
                    <OrbitControls
                        enablePan={false}
                        enableZoom={false}
                        maxPolarAngle={Math.PI / 2}
                        minPolarAngle={Math.PI / 3}
                    />
                </Canvas>
            </div>

            {/* ─── Damage Popup ─── */}
            <AnimatePresence>
                {lastHit && (
                    <motion.div
                        key={lastHit + Date.now()}
                        initial={{ opacity: 1, y: 0, scale: 1.5 }}
                        animate={{ opacity: 0, y: -60, scale: 0.8 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 text-4xl font-black italic text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] pointer-events-none"
                    >
                        {ATTACKS.find(a => a.key === lastHit)?.emoji} {ATTACKS.find(a => a.key === lastHit)?.damage || 'BLOCK'}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Action Buttons ─── */}
            <div className="absolute bottom-6 inset-x-0 z-10 pointer-events-none flex justify-center px-4">
                <div className="flex flex-wrap gap-2 justify-center w-full max-w-5xl pointer-events-auto">
                    {ATTACKS.map((attack) => (
                        <button
                            key={attack.key}
                            onClick={() => doAttack(attack.key)}
                            disabled={playerAction !== 'idle' || bossHp <= 0}
                            className={`px-4 py-3 bg-gradient-to-r ${attack.colorFrom} ${attack.colorTo} ${attack.hoverFrom} ${attack.hoverTo} text-white font-black text-sm italic rounded-xl transition-all ${attack.shadow} ${attack.hoverShadow} disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2 ${
                                attack.key === 'hurricaneKick' ? 'col-span-2 px-6' : ''
                            }`}
                        >
                            <span>{attack.emoji}</span> {attack.label}
                        </button>
                    ))}

                    {/* Reset button when boss is KO */}
                    {bossHp <= 0 && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={resetBattle}
                            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-black text-sm italic rounded-xl transition-all shadow-[0_0_15px_rgba(34,197,94,0.5)] hover:shadow-[0_0_25px_rgba(34,197,94,0.8)] transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
                        >
                            🔄 REMATCH
                        </motion.button>
                    )}
                </div>
            </div>
        </div>
    );
}
