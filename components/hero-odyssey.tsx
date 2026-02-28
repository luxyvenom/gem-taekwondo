'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginModal } from './login-modal';
import { createClient } from '@/lib/supabase';

// ─────────────────────────────────────────────
// ElasticHueSlider (기존 유지)
// ─────────────────────────────────────────────
interface ElasticHueSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

const ElasticHueSlider: React.FC<ElasticHueSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 360,
  step = 1,
  label = 'Adjust Hue',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const progress = ((value - min) / (max - min));
  const thumbPosition = progress * 100;

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="scale-50 relative w-full max-w-xs flex flex-col items-center" ref={sliderRef}>
      {label && <label htmlFor="hue-slider-native" className="text-gray-300 text-sm mb-1">{label}</label>}
      <div className="relative w-full h-5 flex items-center">
        <input
          id="hue-slider-native"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer z-20"
          style={{ WebkitAppearance: 'none' }}
        />
        <div className="absolute left-0 w-full h-1 bg-gray-700 rounded-full z-0"></div>
        <div
          className="absolute left-0 h-1 bg-red-500 rounded-full z-10"
          style={{ width: `${thumbPosition}%` }}
        ></div>
        <motion.div
          className="absolute top-1/2 transform -translate-y-1/2 z-30"
          style={{ left: `${thumbPosition}%` }}
          animate={{ scale: isDragging ? 1.2 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: isDragging ? 20 : 30 }}
        >
        </motion.div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.2 }}
          className="text-xs text-gray-500 mt-2"
        >
          {value}°
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────
// Lightning (WebGL Shader - 기존 유지)
// ─────────────────────────────────────────────
interface LightningProps {
  hue?: number;
  xOffset?: number;
  speed?: number;
  intensity?: number;
  size?: number;
}

const Lightning: React.FC<LightningProps> = ({
  hue = 230,
  xOffset = 0,
  speed = 1,
  intensity = 1,
  size = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    const vertexShaderSource = `
      attribute vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform float uHue;
      uniform float uXOffset;
      uniform float uSpeed;
      uniform float uIntensity;
      uniform float uSize;
      
      #define OCTAVE_COUNT 10

      vec3 hsv2rgb(vec3 c) {
          vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
          return c.z * mix(vec3(1.0), rgb, c.y);
      }

      float hash11(float p) {
          p = fract(p * .1031);
          p *= p + 33.33;
          p *= p + p;
          return fract(p);
      }

      float hash12(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * .1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
      }

      mat2 rotate2d(float theta) {
          float c = cos(theta);
          float s = sin(theta);
          return mat2(c, -s, s, c);
      }

      float noise(vec2 p) {
          vec2 ip = floor(p);
          vec2 fp = fract(p);
          float a = hash12(ip);
          float b = hash12(ip + vec2(1.0, 0.0));
          float c = hash12(ip + vec2(0.0, 1.0));
          float d = hash12(ip + vec2(1.0, 1.0));
          
          vec2 t = smoothstep(0.0, 1.0, fp);
          return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
      }

      float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < OCTAVE_COUNT; ++i) {
              value += amplitude * noise(p);
              p *= rotate2d(0.45);
              p *= 2.0;
              amplitude *= 0.5;
          }
          return value;
      }

      void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
          vec2 uv = fragCoord / iResolution.xy;
          uv = 2.0 * uv - 1.0;
          uv.x *= iResolution.x / iResolution.y;
          uv.x += uXOffset;
          
          uv += 2.0 * fbm(uv * uSize + 0.8 * iTime * uSpeed) - 1.0;
          
          float dist = abs(uv.x);
          vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, 0.7, 0.8));
          vec3 col = baseColor * pow(mix(0.0, 0.07, hash11(iTime * uSpeed)) / dist, 1.0) * uIntensity;
          col = pow(col, vec3(1.0));
          fragColor = vec4(col, 1.0);
      }

      void main() {
          mainImage(gl_FragColor, gl_FragCoord.xy);
      }
    `;

    const compileShader = (
      source: string,
      type: number
    ): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(
      fragmentShaderSource,
      gl.FRAGMENT_SHADER
    );
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const vertices = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const iResolutionLocation = gl.getUniformLocation(program, "iResolution");
    const iTimeLocation = gl.getUniformLocation(program, "iTime");
    const uHueLocation = gl.getUniformLocation(program, "uHue");
    const uXOffsetLocation = gl.getUniformLocation(program, "uXOffset");
    const uSpeedLocation = gl.getUniformLocation(program, "uSpeed");
    const uIntensityLocation = gl.getUniformLocation(program, "uIntensity");
    const uSizeLocation = gl.getUniformLocation(program, "uSize");

    const startTime = performance.now();
    let animId: number;
    const render = () => {
      resizeCanvas();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(iResolutionLocation, canvas.width, canvas.height);
      const currentTime = performance.now();
      gl.uniform1f(iTimeLocation, (currentTime - startTime) / 1000.0);
      gl.uniform1f(uHueLocation, hue);
      gl.uniform1f(uXOffsetLocation, xOffset);
      gl.uniform1f(uSpeedLocation, speed);
      gl.uniform1f(uIntensityLocation, intensity);
      gl.uniform1f(uSizeLocation, size);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animId);
    };
  }, [hue, xOffset, speed, intensity, size]);

  return <canvas ref={canvasRef} className="w-full h-full relative" />;
};

// ─────────────────────────────────────────────
// FeatureItem (철권 스타일 - 기울어지고 거친 느낌)
// ─────────────────────────────────────────────
interface FeatureItemProps {
  name: string;
  value: string;
  position: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ name, value, position }) => {
  return (
    <div className={`absolute ${position} z-10 group transition-all duration-300 hover:scale-110 skew-x-[-10deg]`}>
      <div className="flex items-center gap-3 relative bg-black/60 border-l-4 border-red-600 p-3 backdrop-blur-sm shadow-[5px_5px_0px_rgba(220,38,38,0.3)]">
        <div className="text-white relative">
          <div className="font-black text-xl italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">{name}</div>
          <div className="text-red-400 font-bold text-sm tracking-widest uppercase">{value}</div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// HeroSection (철권 아케이드 스타일)
// ─────────────────────────────────────────────
export const HeroSection: React.FC = () => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lightningHue, setLightningHue] = useState(210);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleEnterArena = () => {
    if (isLoggedIn) {
      router.push('/workspace');
    } else {
      setLoginModalOpen(true);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0, scale: 0.9 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { type: "spring" as const, stiffness: 200, damping: 20 }
    }
  };

  return (
    <div className="relative w-full bg-[#0a0a0a] text-white overflow-hidden font-sans">
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-screen flex flex-col justify-between">

        {/* 아케이드 스타일 상단 UI (체력바/타이머 느낌) */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-between items-start pt-4"
        >
          {/* 좌측 플레이어 정보 */}
          <div className="flex flex-col gap-2 skew-x-[-10deg]">
            <div className="bg-red-600 text-white font-black italic px-6 py-2 text-xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              ARCADE MODE
            </div>
          </div>

          {/* 우측 로그인/입장 버튼 */}
          <div className="flex flex-col items-end gap-2 skew-x-[-10deg]">
            <button
              onClick={isLoggedIn ? () => router.push('/workspace') : () => setLoginModalOpen(true)}
              className={`font-black italic px-8 py-2 text-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-colors ${
                isLoggedIn
                  ? 'bg-green-500 hover:bg-green-400 text-black'
                  : 'bg-yellow-500 hover:bg-yellow-400 text-black animate-pulse'
              }`}
            >
              {isLoggedIn ? 'ENTER' : 'LOG IN'}
            </button>
            <div className={`font-bold tracking-widest text-sm ${isLoggedIn ? 'text-green-500' : 'text-yellow-500'}`}>
              {isLoggedIn ? 'WELCOME FIGHTER' : 'JOIN THE ARENA'}
            </div>
          </div>
        </motion.div>

        {/* 배경에 떠있는 격투 시스템 특징 */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="absolute inset-0 pointer-events-none"
        >
          <motion.div variants={itemVariants}>
            <FeatureItem name="ANIMAL TO 3D" value="MESHY API POWERED" position="left-[3%] top-[35%]" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureItem name="KICK > PUNCH > BLOCK" value="TAEKWONDO COMBAT" position="right-[3%] top-[30%]" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <FeatureItem name="BEAST FIGHTER" value="ANIMAL-HUMAN HYBRID" position="left-[3%] bottom-[25%]" />
          </motion.div>
        </motion.div>

        {/* 메인 타이틀 (격투 게임 로고 스타일) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-30 flex flex-col items-center justify-center flex-grow text-center"
        >
          {/* 철권 특유의 아나운서 대사 */}
          <motion.div
            variants={itemVariants}
            className="text-red-500 font-black italic text-xl md:text-3xl tracking-[0.3em] mb-4 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]"
          >
            GET READY FOR THE NEXT BATTLE
          </motion.div>

          {/* 거칠고 묵직한 메인 로고 */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[9rem] font-black italic tracking-tighter uppercase leading-none skew-x-[-5deg] px-4"
          >
            <span className="text-white drop-shadow-[0_5px_0_rgba(255,0,0,0.8)]">
              TAEKWON
            </span>
            <br />
            <span className="text-red-500 drop-shadow-[0_5px_0_rgba(150,0,0,1)]">
              -CLASH
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-gray-400 font-bold tracking-widest mt-6 uppercase skew-x-[-10deg] bg-black/50 px-6 py-2 border-y-2 border-red-900"
          >
            Upload your animal photo. MESHY turns it into a beast fighter.
          </motion.p>

          {/* 투기장 입장 버튼 (강렬한 타격감 느낌) */}
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.1, textShadow: "0px 0px 8px rgb(255,255,255)" }}
            whileTap={{ scale: 0.9, x: 5 }}
            onClick={handleEnterArena}
            className="mt-12 px-16 py-5 bg-gradient-to-r from-red-700 to-red-600 text-white font-black text-3xl italic uppercase skew-x-[-15deg] border-4 border-white shadow-[10px_10px_0px_rgba(0,0,0,1)] hover:shadow-[15px_15px_0px_rgba(0,0,0,1)] hover:from-red-600 hover:to-red-500 transition-all flex items-center gap-4 cursor-pointer"
          >
            ENTER THE ARENA
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.button>
        </motion.div>
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      {/* 배경 요소: 어두운 투기장(Arena) 느낌 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 z-0 pointer-events-none"
      >
        {/* 거친 비네팅(테두리 어두움) 효과 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(0,0,0,0)_0%,_rgba(0,0,0,0.9)_100%)] z-10"></div>

        {/* 투기장 바닥의 붉은 조명 느낌 */}
        <div className="absolute bottom-[-20%] left-1/2 transform -translate-x-1/2 w-[1200px] h-[600px] rounded-[100%] bg-red-900/20 blur-[100px]"></div>

        {/* 풍신류의 전기(Electric Spark) 번개 이펙트 */}
        <div className="absolute top-0 w-full left-1/2 transform -translate-x-1/2 h-full opacity-60 mix-blend-screen">
          <Lightning hue={lightningHue} xOffset={0} speed={2.5} intensity={1.5} size={3} />
        </div>

        {/* 질감(노이즈/그리드) 추가로 거친 느낌 극대화 */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              rgba(255,255,255,0.03) 0px,
              rgba(255,255,255,0.03) 1px,
              transparent 1px,
              transparent 4px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(255,255,255,0.03) 0px,
              rgba(255,255,255,0.03) 1px,
              transparent 1px,
              transparent 4px
            )`
          }}
        ></div>
      </motion.div>
    </div>
  );
};
