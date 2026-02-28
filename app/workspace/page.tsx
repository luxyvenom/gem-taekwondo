'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────
type PipelineStep = 'idle' | 'uploading' | 'generating_warrior' | 'warrior_done' | 'generating_3d' | 'model_done' | 'error';

interface FighterPipeline {
    id: string;
    name: string;
    step: PipelineStep;
    originalPreview: string; // local blob URL
    originalFile: File;
    originalUrl?: string;
    warriorUrl?: string;
    glbUrl?: string;
    thumbnailUrl?: string;
    meshyTaskId?: string;
    progress3d?: number;
    error?: string;
    timestamp: number;
}

// ─── Component ───────────────────────────────────────
export default function WorkspaceHome() {
    const [pipelines, setPipelines] = useState<FighterPipeline[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollingRef = useRef<Record<string, NodeJS.Timeout>>({});

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            Object.values(pollingRef.current).forEach(clearInterval);
        };
    }, []);

    // ─── Update pipeline helper ──────────────────────
    const updatePipeline = useCallback((id: string, updates: Partial<FighterPipeline>) => {
        setPipelines(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }, []);

    // ─── Handle file selection ───────────────────────
    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        const newPipelines: FighterPipeline[] = Array.from(files).map((file) => ({
            id: crypto.randomUUID(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            step: 'idle' as const,
            originalPreview: URL.createObjectURL(file),
            originalFile: file,
            timestamp: Date.now(),
        }));
        setPipelines(prev => [...prev, ...newPipelines]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleRemove = (id: string) => {
        if (pollingRef.current[id]) {
            clearInterval(pollingRef.current[id]);
            delete pollingRef.current[id];
        }
        setPipelines(prev => prev.filter(p => p.id !== id));
    };

    // ─── Step 1: Generate Warrior (Nano Banana / Gemini) ─
    const startStep1 = async (pipeline: FighterPipeline) => {
        updatePipeline(pipeline.id, { step: 'generating_warrior', error: undefined });

        try {
            const formData = new FormData();
            formData.append('image', pipeline.originalFile);
            formData.append('name', pipeline.name);

            const response = await fetch('/api/generate-warrior', {
                method: 'POST',
                body: formData,
                credentials: 'include', // 인증 쿠키 포함
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                updatePipeline(pipeline.id, {
                    step: 'error',
                    error: data.error || 'Failed to generate warrior',
                });
                return;
            }

            updatePipeline(pipeline.id, {
                step: 'warrior_done',
                originalUrl: data.originalUrl,
                warriorUrl: data.warriorBase64 || data.warriorUrl,
                timestamp: data.timestamp,
            });
        } catch (err) {
            updatePipeline(pipeline.id, {
                step: 'error',
                error: err instanceof Error ? err.message : 'Network error',
            });
        }
    };

    // ─── Step 2: Generate 3D Model (MESHY) ───────────
    const startStep2 = async (pipeline: FighterPipeline) => {
        if (!pipeline.warriorUrl) return;

        updatePipeline(pipeline.id, { step: 'generating_3d', progress3d: 0, error: undefined });

        try {
            const response = await fetch('/api/generate-3d', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // 인증 쿠키 포함
                body: JSON.stringify({
                    imageUrl: pipeline.warriorUrl,
                    name: pipeline.name,
                    timestamp: pipeline.timestamp,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                updatePipeline(pipeline.id, {
                    step: 'error',
                    error: data.error || 'Failed to start 3D conversion',
                });
                return;
            }

            updatePipeline(pipeline.id, { meshyTaskId: data.taskId });

            // Start polling
            pollMeshyStatus(pipeline.id, data.taskId, pipeline.name, pipeline.timestamp.toString(), pipeline.originalUrl, pipeline.warriorUrl);
        } catch (err) {
            updatePipeline(pipeline.id, {
                step: 'error',
                error: err instanceof Error ? err.message : 'Network error',
            });
        }
    };

    // ─── Poll MESHY status ───────────────────────────
    const pollMeshyStatus = (pipelineId: string, taskId: string, name: string, timestamp: string, originalUrl?: string, warriorUrl?: string) => {
        const interval = setInterval(async () => {
            try {
                let url = `/api/check-3d?taskId=${taskId}&name=${encodeURIComponent(name)}&timestamp=${timestamp}`;
                if (originalUrl) url += `&originalUrl=${encodeURIComponent(originalUrl)}`;
                if (warriorUrl) url += `&warriorUrl=${encodeURIComponent(warriorUrl)}`;

                const res = await fetch(url, {
                    credentials: 'include' // 인증 쿠키 포함
                });
                const data = await res.json();

                if (data.status === 'SUCCEEDED') {
                    clearInterval(interval);
                    delete pollingRef.current[pipelineId];
                    updatePipeline(pipelineId, {
                        step: 'model_done',
                        glbUrl: data.glbUrl,
                        thumbnailUrl: data.thumbnailUrl,
                        progress3d: 100,
                    });
                } else if (data.status === 'FAILED') {
                    clearInterval(interval);
                    delete pollingRef.current[pipelineId];
                    updatePipeline(pipelineId, {
                        step: 'error',
                        error: data.error || '3D conversion failed',
                    });
                } else {
                    updatePipeline(pipelineId, {
                        progress3d: data.progress || 0,
                    });
                }
            } catch {
                // Network error - keep retrying
            }
        }, 5000);

        pollingRef.current[pipelineId] = interval;
    };

    // ─── Auto-pipeline: upload → warrior → 3D ────────
    const startFullPipeline = (pipeline: FighterPipeline) => {
        startStep1(pipeline);
    };

    // ─── Step label & color ──────────────────────────
    const getStepInfo = (step: PipelineStep) => {
        switch (step) {
            case 'idle': return { label: 'Ready to convert', color: 'text-gray-400', bg: '' };
            case 'uploading': return { label: 'Uploading...', color: 'text-blue-400', bg: 'bg-blue-500/10' };
            case 'generating_warrior': return { label: 'STEP 1 · 나노바나나 생성 중...', color: 'text-purple-400', bg: 'bg-purple-500/10' };
            case 'warrior_done': return { label: 'STEP 1 완료 · 3D 변환 대기', color: 'text-green-400', bg: 'bg-green-500/10' };
            case 'generating_3d': return { label: 'STEP 2 · MESHY 3D 변환 중...', color: 'text-orange-400', bg: 'bg-orange-500/10' };
            case 'model_done': return { label: '✅ FIGHTER READY!', color: 'text-green-400', bg: 'bg-green-500/10' };
            case 'error': return { label: '❌ ERROR', color: 'text-red-400', bg: 'bg-red-500/10' };
            default: return { label: '', color: '', bg: '' };
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-8"
            >
                <h1 className="text-4xl font-black italic text-white tracking-tight">
                    CREATE <span className="text-red-500">FIGHTER</span>
                </h1>
                <p className="text-gray-400 mt-2 tracking-wide">
                    Upload your animal photo → Nano Banana transforms it into a warrior → MESHY converts to 3D
                </p>
            </motion.div>

            {/* Pipeline Steps Visual */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-8 grid grid-cols-3 gap-3"
            >
                {[
                    { step: '1', icon: '📷', title: 'UPLOAD', desc: 'Animal photo', color: 'border-blue-600/40' },
                    { step: '2', icon: '🧬', title: 'NANO BANANA', desc: 'Warrior generation', color: 'border-purple-600/40' },
                    { step: '3', icon: '🧊', title: 'MESHY 3D', desc: 'GLB model export', color: 'border-orange-600/40' },
                ].map((s, i) => (
                    <div key={i} className={`relative bg-[#1a1a1a] border ${s.color} rounded-xl p-4 text-center`}>
                        <div className="absolute -top-2.5 left-3 px-2 bg-[#0a0a0a] text-xs font-bold text-gray-500 tracking-widest">
                            STEP {s.step}
                        </div>
                        <div className="text-3xl mb-1.5">{s.icon}</div>
                        <div className="text-white font-bold text-sm">{s.title}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{s.desc}</div>
                        {i < 2 && (
                            <div className="absolute right-[-18px] top-1/2 -translate-y-1/2 text-gray-600 text-lg z-10 font-bold">→</div>
                        )}
                    </div>
                ))}
            </motion.div>

            {/* Upload Area */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer group
                    ${dragOver
                        ? 'border-red-500 bg-red-500/10 scale-[1.02]'
                        : 'border-gray-700 hover:border-red-500/50 hover:bg-white/[0.02]'
                    }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />

                <div className="flex flex-col items-center gap-4">
                    <motion.div animate={{ y: dragOver ? -10 : 0 }} className="text-6xl">
                        🐸
                    </motion.div>
                    <div>
                        <p className="text-white font-bold text-xl">
                            {dragOver ? 'Drop it here!' : 'Drag & Drop your animal image'}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                            PNG, JPG, WEBP supported • Max 10MB
                        </p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="mt-2 px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold italic rounded-xl transition-colors shadow-[4px_4px_0px_rgba(0,0,0,0.5)]"
                    >
                        SELECT FILE
                    </button>
                </div>

                {/* Decorative corners */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-red-600/40 rounded-tl-lg" />
                <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-red-600/40 rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-red-600/40 rounded-bl-lg" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-red-600/40 rounded-br-lg" />
            </motion.div>

            {/* Pipeline Cards */}
            <AnimatePresence>
                {pipelines.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8"
                    >
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-red-500">▎</span> Conversion Pipeline
                            <span className="text-gray-500 text-sm font-normal">({pipelines.length})</span>
                        </h2>

                        <div className="space-y-4">
                            {pipelines.map((pipeline, index) => {
                                const stepInfo = getStepInfo(pipeline.step);
                                return (
                                    <motion.div
                                        key={pipeline.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-[#1a1a1a] border border-gray-800 rounded-xl overflow-hidden group hover:border-red-600/30 transition-colors"
                                    >
                                        <div className="flex items-stretch">
                                            {/* Original Image */}
                                            <div className="w-32 h-32 flex-shrink-0 relative overflow-hidden">
                                                <img
                                                    src={pipeline.originalPreview}
                                                    alt={pipeline.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                                                    <span className="text-[10px] text-gray-300 font-bold">ORIGINAL</span>
                                                </div>
                                            </div>

                                            {/* Arrow */}
                                            <div className="flex items-center px-2 text-gray-600">→</div>

                                            {/* Warrior Image */}
                                            <div className="w-32 h-32 flex-shrink-0 relative overflow-hidden bg-[#111] flex items-center justify-center">
                                                {pipeline.warriorUrl ? (
                                                    <>
                                                        <img
                                                            src={pipeline.warriorUrl}
                                                            alt={`${pipeline.name} warrior`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                                                            <span className="text-[10px] text-purple-300 font-bold">WARRIOR</span>
                                                        </div>
                                                    </>
                                                ) : pipeline.step === 'generating_warrior' ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                                        <span className="text-[10px] text-purple-400 font-bold">GENERATING</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-700 text-xs text-center px-2">
                                                        <div className="text-2xl mb-1 opacity-30">🧬</div>
                                                        <span className="text-[10px]">Warrior</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Arrow */}
                                            <div className="flex items-center px-2 text-gray-600">→</div>

                                            {/* 3D Model */}
                                            <div className="w-32 h-32 flex-shrink-0 relative overflow-hidden bg-[#111] flex items-center justify-center">
                                                {pipeline.step === 'model_done' ? (
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        {pipeline.thumbnailUrl ? (
                                                            <img
                                                                src={pipeline.thumbnailUrl}
                                                                alt={`${pipeline.name} 3D`}
                                                                className="w-full h-full object-cover absolute inset-0"
                                                            />
                                                        ) : (
                                                            <div className="text-4xl">🧊</div>
                                                        )}
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 z-10">
                                                            <span className="text-[10px] text-orange-300 font-bold">3D MODEL</span>
                                                        </div>
                                                    </div>
                                                ) : pipeline.step === 'generating_3d' ? (
                                                    <div className="flex flex-col items-center gap-2 w-full px-3">
                                                        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                                        <div className="w-full">
                                                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    animate={{ width: `${pipeline.progress3d || 0}%` }}
                                                                    className="h-full bg-orange-500 rounded-full"
                                                                />
                                                            </div>
                                                            <span className="text-[10px] text-orange-400 mt-1 block text-center">
                                                                {pipeline.progress3d || 0}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-700 text-xs text-center px-2">
                                                        <div className="text-2xl mb-1 opacity-30">🧊</div>
                                                        <span className="text-[10px]">3D Model</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info & Actions */}
                                            <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                                                <div>
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-white font-bold truncate">{pipeline.name}</h3>
                                                        <button
                                                            onClick={() => handleRemove(pipeline.id)}
                                                            className="text-gray-600 hover:text-red-500 transition-colors text-sm ml-2 flex-shrink-0"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                    <div className={`text-xs font-bold mt-1 ${stepInfo.color}`}>
                                                        {pipeline.step === 'generating_warrior' && (
                                                            <span className="inline-block mr-1 animate-pulse">⏳</span>
                                                        )}
                                                        {pipeline.step === 'generating_3d' && (
                                                            <span className="inline-block mr-1 animate-pulse">⏳</span>
                                                        )}
                                                        {stepInfo.label}
                                                    </div>
                                                    {pipeline.error && (
                                                        <p className="text-red-400/80 text-xs mt-1 truncate">{pipeline.error}</p>
                                                    )}
                                                </div>

                                                <div className="flex gap-2 mt-2">
                                                    {pipeline.step === 'idle' && (
                                                        <button
                                                            onClick={() => startFullPipeline(pipeline)}
                                                            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold italic rounded-lg transition-colors shadow-[2px_2px_0px_rgba(0,0,0,0.5)]"
                                                        >
                                                            🧬 STEP 1: GENERATE WARRIOR
                                                        </button>
                                                    )}
                                                    {pipeline.step === 'warrior_done' && (
                                                        <button
                                                            onClick={() => startStep2(pipeline)}
                                                            className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold italic rounded-lg transition-colors shadow-[2px_2px_0px_rgba(0,0,0,0.5)]"
                                                        >
                                                            🧊 STEP 2: CONVERT TO 3D
                                                        </button>
                                                    )}
                                                    {pipeline.step === 'model_done' && pipeline.glbUrl && (
                                                        <a
                                                            href={pipeline.glbUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold italic rounded-lg transition-colors shadow-[2px_2px_0px_rgba(0,0,0,0.5)]"
                                                        >
                                                            📥 DOWNLOAD GLB
                                                        </a>
                                                    )}
                                                    {pipeline.step === 'error' && (
                                                        <button
                                                            onClick={() => {
                                                                if (pipeline.warriorUrl) {
                                                                    startStep2(pipeline);
                                                                } else {
                                                                    startFullPipeline(pipeline);
                                                                }
                                                            }}
                                                            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold italic rounded-lg transition-colors shadow-[2px_2px_0px_rgba(0,0,0,0.5)]"
                                                        >
                                                            🔄 RETRY
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Progress bar for active steps */}
                                        {(pipeline.step === 'generating_warrior' || pipeline.step === 'generating_3d') && (
                                            <div className="h-1 bg-gray-800">
                                                {pipeline.step === 'generating_warrior' ? (
                                                    <motion.div
                                                        className="h-full bg-gradient-to-r from-purple-600 to-purple-400"
                                                        animate={{ width: ['0%', '85%', '90%', '85%'] }}
                                                        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                                                    />
                                                ) : (
                                                    <motion.div
                                                        className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
                                                        animate={{ width: `${pipeline.progress3d || 0}%` }}
                                                        transition={{ duration: 0.5 }}
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {/* Completed bar */}
                                        {pipeline.step === 'model_done' && (
                                            <div className="h-1 bg-green-500" />
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State */}
            {pipelines.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 bg-[#1a1a1a] border border-gray-800 rounded-xl p-6"
                >
                    <h3 className="text-sm font-bold text-gray-500 tracking-widest mb-4">HOW IT WORKS</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            {
                                emoji: '📷',
                                title: 'Upload Animal',
                                desc: 'Upload any animal photo (dog, cat, frog, etc.)',
                                color: 'text-blue-400',
                            },
                            {
                                emoji: '🧬',
                                title: 'Nano Banana AI',
                                desc: 'Google Gemini transforms it into a beast warrior',
                                color: 'text-purple-400',
                            },
                            {
                                emoji: '🧊',
                                title: 'MESHY 3D',
                                desc: 'Converts the warrior into a 3D GLB model',
                                color: 'text-orange-400',
                            },
                        ].map((step, i) => (
                            <div key={i} className="flex items-start gap-3 bg-black/20 rounded-lg p-3">
                                <div className="text-2xl flex-shrink-0">{step.emoji}</div>
                                <div>
                                    <div className={`font-bold text-sm ${step.color}`}>{step.title}</div>
                                    <div className="text-gray-500 text-xs mt-0.5">{step.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
