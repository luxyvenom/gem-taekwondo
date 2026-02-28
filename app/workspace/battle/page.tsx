'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useFBX, useAnimations, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// ─── 3D Player Component ─────────────────────────────────────
function PlayerModel({ action, onActionComplete }: { action: string, onActionComplete: () => void }) {
    const group = useRef<THREE.Group>(null);
    const { scene } = useGLTF('/my/my.glb');

    const idleFbx = useFBX('/animations/Ready Idle.fbx');
    const punchFbx = useFBX('/animations/Hook Punch.fbx');
    const kickFbx = useFBX('/animations/sideKick.fbx');

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
            processClip(kickFbx.animations[0], 'kick'),
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
    // Clone scene to avoid shared materials issue if we eventually add more bosses, but here we just need one boss scene
    const { scene } = useGLTF('/boss/frogboss.glb');

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
useFBX.preload('/animations/Hit.fbx');
useFBX.preload('/animations/KO.fbx');


export default function BattlePage() {
    const [playerAction, setPlayerAction] = useState('idle');
    const [bossAction, setBossAction] = useState('idle');

    const [playerHp, setPlayerHp] = useState(100);
    const [bossHp, setBossHp] = useState(100);
    const [battleActive, setBattleActive] = useState(false);
    const [battleLog, setBattleLog] = useState<{ text: string, type: string }[]>([]);

    useEffect(() => {
        // Init battle text
        setBattleLog([{ text: "🥊 Ready for final demo battle!", type: "system" }]);
    }, []);

    const doAttack = (type: 'punch' | 'kick') => {
        if (playerAction !== 'idle' || bossAction === 'ko') return;

        // Start player attack
        setPlayerAction(type);
        setBattleLog(prev => [{ text: `🔥 You used ${type.toUpperCase()}!`, type: 'player' }, ...prev].slice(0, 5));

        // Let the animation play slightly before Boss reacts
        setTimeout(() => {
            if (bossHp <= 0) return;
            const dmg = type === 'punch' ? 15 : 25;
            const newHp = Math.max(bossHp - dmg, 0);

            setBossHp(newHp);

            if (newHp <= 0) {
                setBossAction('ko');
                setBattleLog(prev => [{ text: `🏆 BOSS DEFEATED!`, type: 'critical' }, ...prev].slice(0, 5));
            } else {
                setBossAction('hit');
            }
        }, 500); // 500ms delay to sync impact roughly
    };

    const handlePlayerFinished = () => {
        setPlayerAction('idle');
    };

    const handleBossFinished = () => {
        if (bossAction !== 'ko') {
            setBossAction('idle');
        }
    };

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
                        <span className="text-xl italic">DRAGON EMPEROR</span>
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

            {/* ─── Controls ─── */}
            <div className="absolute bottom-12 inset-x-0 z-10 pointer-events-none flex justify-center px-4">
                <div className="flex gap-4 justify-center w-full max-w-4xl h-20 pointer-events-auto">
                    <button
                        onClick={() => doAttack('punch')}
                        disabled={playerAction !== 'idle' || bossHp <= 0}
                        className="flex-1 max-w-[300px] h-full bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white font-black text-2xl italic rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.5)] hover:shadow-[0_0_25px_rgba(79,70,229,0.8)] disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3"
                    >
                        <span>👊</span> LIGHT PUNCH
                    </button>
                    <button
                        onClick={() => doAttack('kick')}
                        disabled={playerAction !== 'idle' || bossHp <= 0}
                        className="flex-1 max-w-[300px] h-full bg-gradient-to-r from-red-700 to-orange-600 hover:from-red-600 hover:to-orange-500 text-white font-black text-2xl italic rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.5)] hover:shadow-[0_0_25px_rgba(220,38,38,0.8)] disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3"
                    >
                        <span>🦶</span> HEAVY KICK
                    </button>
                </div>
            </div>
        </div>
    );
}
