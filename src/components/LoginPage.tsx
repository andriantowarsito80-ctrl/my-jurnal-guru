import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import {
  AlertCircle,
  BookOpen,
  Cloud,
  Lightbulb,
  Loader2,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import campusImg from '../assets/images/campus_architecture_1794569693784.jpg';
import { SchoolProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface LoginPageProps {
  schoolProfile: SchoolProfile;
  onGoogleLogin: () => Promise<void>;
}

const LIGHT_MOTES = [
  { id: 1, left: '28%', top: '34%', size: 4, delay: 0, duration: 4.2 },
  { id: 2, left: '42%', top: '52%', size: 3, delay: 0.9, duration: 3.8 },
  { id: 3, left: '22%', top: '66%', size: 5, delay: 1.5, duration: 4.8 },
  { id: 4, left: '54%', top: '28%', size: 3, delay: 0.4, duration: 4.4 },
  { id: 5, left: '36%', top: '76%', size: 4, delay: 2.1, duration: 3.9 },
];

export const LoginPage: React.FC<LoginPageProps> = ({
  schoolProfile,
  onGoogleLogin,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isLit, setIsLit] = useState<boolean>(() => Boolean(shouldReduceMotion));
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHoveringLogin, setIsHoveringLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unauthorizedHost, setUnauthorizedHost] = useState<string | null>(null);

  const cordPullY = useMotionValue(0);
  const cordScaleY = useTransform(cordPullY, [0, 44], [1, 1.58]);
  const knobHighlight = useTransform(cordPullY, [0, 36], [1, 1.18]);
  const didDragRef = useRef(false);

  const playCordTugAndToggle = useCallback(
    (nextState?: boolean) => {
      if (!shouldReduceMotion) {
        animate(cordPullY, 24, {
          duration: 0.14,
          ease: [0.16, 1, 0.3, 1],
          onComplete: () => {
            setIsLit((prev) => (typeof nextState === 'boolean' ? nextState : !prev));
            animate(cordPullY, 0, {
              type: 'spring',
              stiffness: 420,
              damping: 20,
            });
          },
        });
      } else {
        setIsLit((prev) => (typeof nextState === 'boolean' ? nextState : !prev));
      }
    },
    [cordPullY, shouldReduceMotion]
  );

  // Cinematic auto-illuminate sequence on arrival (matches pull-cord reveal)
  useEffect(() => {
    if (shouldReduceMotion) {
      setIsLit(true);
      return;
    }

    const pullTimer = window.setTimeout(() => {
      animate(cordPullY, 22, {
        duration: 0.18,
        ease: [0.16, 1, 0.3, 1],
        onComplete: () => {
          setIsLit(true);
          animate(cordPullY, 0, {
            type: 'spring',
            stiffness: 380,
            damping: 18,
          });
        },
      });
    }, 420);

    return () => window.clearTimeout(pullTimer);
  }, [cordPullY, shouldReduceMotion]);

  // Subtle natural eye blink when lamp is awake
  useEffect(() => {
    if (!isLit || shouldReduceMotion) return;

    const interval = window.setInterval(() => {
      setIsBlinking(true);
      window.setTimeout(() => setIsBlinking(false), 150);
    }, 3900);

    return () => window.clearInterval(interval);
  }, [isLit, shouldReduceMotion]);

  const handleGoogleSignIn = async () => {
    if (!isLit) {
      setIsLit(true);
    }
    setError('');
    setUnauthorizedHost(null);
    setLoading(true);
    try {
      await onGoogleLogin();
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code || '')
          : '';
      const msg = err instanceof Error ? err.message : String(err);
      const combined = `${code} ${msg}`;

      if (combined.includes('unauthorized-domain')) {
        const host =
          typeof window !== 'undefined' ? window.location.hostname : 'domain ini';
        setUnauthorizedHost(host);
        setError(
          `Domain "${host}" belum diizinkan di Firebase Authentication. Tambahkan domain ini ke Authorized domains di Firebase Console agar login Google bisa digunakan.`
        );
      } else if (combined.includes('popup-closed-by-user')) {
        setError('Jendela login Google ditutup sebelum selesai. Silakan coba lagi.');
      } else if (combined.includes('cancelled-popup-request')) {
        setError('Permintaan login dibatalkan karena ada jendela login lain yang terbuka.');
      } else if (combined.includes('popup-blocked')) {
        setError('Pop-up diblokir oleh browser. Izinkan pop-up untuk situs ini lalu coba lagi.');
      } else if (combined.includes('operation-not-allowed')) {
        setError('Metode login Google belum diaktifkan pada proyek Firebase Anda.');
      } else if (combined.includes('network-request-failed')) {
        setError('Koneksi internet sedang tidak stabil. Periksa jaringan Anda lalu coba lagi.');
      } else {
        setError(
          `Gagal masuk dengan akun Google${code ? ` (${code})` : ''}. Silakan coba beberapa saat lagi.`
        );
      }
      setIsLit(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050b0d] text-slate-100 overflow-hidden flex flex-col justify-between">
      {/* Subtle Architectural Campus Backdrop + Dark Atmospheric Scrim */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <img
          src={campusImg}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-15 grayscale contrast-125 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#04090b]/95 via-[#071519]/92 to-[#040a0d]/96" />

        {/* Ambient Studio Spotlights */}
        <motion.div
          animate={{
            opacity: isLit ? 0.95 : 0.2,
            scale: isLit ? 1 : 0.88,
          }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[920px] h-[560px] rounded-full bg-[radial-gradient(circle_at_32%_46%,rgba(16,185,129,0.22),rgba(20,184,166,0.1)_38%,transparent_72%)] blur-2xl"
        />
      </div>

      {/* Top Clean Header Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-6 pb-2 flex items-center justify-between gap-6">
        <div className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <BookOpen className="w-4.5 h-4.5 text-slate-950" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">
            Portal Administrasi Guru
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap shrink-0">
          <span className="text-emerald-300/90 font-medium">{schoolProfile.namaSekolah}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">NPSN {schoolProfile.npsn}</span>
        </div>
      </header>

      {/* Main Illuminated Lamp Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl rounded-[28px] border border-emerald-400/20 bg-[#091418]/92 shadow-[0_32px_90px_-24px_rgba(0,0,0,0.85)] overflow-hidden"
        >
          {/* Ambient Rim Glow around the Card when Lamp is Lit */}
          <motion.div
            aria-hidden="true"
            animate={{ opacity: isLit ? 1 : 0 }}
            transition={{ duration: 0.55 }}
            className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_1px_0_0_rgba(110,231,183,0.28),inset_0_0_64px_-28px_rgba(16,185,129,0.24)]"
          />

          {/* Sweeping Volumetric Cone Light from Lamp Shade across Card */}
          <motion.div
            aria-hidden="true"
            animate={{
              opacity: isLit ? 1 : 0,
              scale: isLit ? 1 : 0.92,
            }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_62%_78%_at_24%_32%,rgba(52,211,153,0.24)_0%,rgba(20,184,166,0.11)_42%,rgba(6,182,212,0.03)_68%,transparent_100%)]"
          />

          {/* Floating Light Motes inside the Beam */}
          {isLit && !shouldReduceMotion && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              {LIGHT_MOTES.map((mote) => (
                <motion.span
                  key={mote.id}
                  style={{
                    left: mote.left,
                    top: mote.top,
                    width: mote.size,
                    height: mote.size,
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{
                    opacity: [0, 0.55, 0],
                    y: [-6, -24, -40],
                  }}
                  transition={{
                    duration: mote.duration,
                    delay: mote.delay,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute rounded-full bg-emerald-300/70 blur-[0.5px]"
                />
              ))}
            </div>
          )}

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* LEFT STAGE: Interactive Desk Lamp + Pull Cord + Cute Illuminated Character */}
            <div className="relative lg:col-span-5 flex flex-col items-center justify-center px-6 pt-8 pb-6 lg:py-10 border-b lg:border-b-0 lg:border-r border-white/[0.06]">
              {/* Diagonal Lamp Cone SVG Overlay */}
              <motion.div
                aria-hidden="true"
                animate={{ opacity: isLit ? 0.9 : 0 }}
                transition={{ duration: 0.45 }}
                className="pointer-events-none absolute inset-x-0 top-10 bottom-6 flex justify-center"
              >
                <div className="w-64 h-full bg-gradient-to-b from-emerald-300/20 via-teal-400/10 to-transparent [clip-path:polygon(38%_14%,62%_14%,96%_94%,4%_94%)] blur-md" />
              </motion.div>

              {/* Lamp Character & Pull Cord Interactive Assembly */}
              <div className="relative w-56 h-64 sm:w-64 sm:h-72 select-none flex items-center justify-center">
                {/* Floor Reflection Pool */}
                <motion.div
                  aria-hidden="true"
                  animate={{
                    opacity: isLit ? 0.85 : 0.25,
                    scaleX: isLit ? 1 : 0.72,
                  }}
                  transition={{ duration: 0.45 }}
                  className="absolute bottom-3 w-44 h-7 rounded-full bg-emerald-400/25 blur-md"
                />

                {/* Lamp Stand + Dome Shade SVG */}
                <svg
                  viewBox="0 0 240 260"
                  className="w-full h-full overflow-visible"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="lampShadeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={isLit ? '#34d399' : '#1e293b'} />
                      <stop offset="55%" stopColor={isLit ? '#0d9488' : '#111c22'} />
                      <stop offset="100%" stopColor={isLit ? '#065f46' : '#0b1316'} />
                    </linearGradient>
                    <linearGradient id="lampBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={isLit ? '#134e4a' : '#0f1a1f'} />
                      <stop offset="100%" stopColor={isLit ? '#062c2b' : '#081013'} />
                    </linearGradient>
                    <radialGradient id="bulbGlow" cx="50%" cy="40%" r="60%">
                      <stop offset="0%" stopColor="#ecfdf5" />
                      <stop offset="45%" stopColor="#6ee7b7" />
                      <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                    </radialGradient>
                  </defs>

                  {/* Curved Metal Lamp Neck */}
                  <path
                    d="M 118 228 L 118 196 M 88 228 L 148 228"
                    stroke={isLit ? '#2dd4bf' : '#334155'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M 155 152 C 182 146 186 64 134 42"
                    stroke={isLit ? '#14b8a6' : '#26353d'}
                    strokeWidth="7"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Top Joint Cap */}
                  <circle
                    cx="118"
                    cy="44"
                    r="11"
                    fill={isLit ? '#2dd4bf' : '#1e293b'}
                    stroke={isLit ? '#99f6e4' : '#334155'}
                    strokeWidth="2"
                  />

                  {/* Glowing Bulb Under Shade */}
                  {isLit && (
                    <motion.ellipse
                      cx="118"
                      cy="92"
                      rx="32"
                      ry="14"
                      fill="url(#bulbGlow)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.82, 1, 0.88] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}

                  {/* Lamp Dome / Shade (Clickable to Toggle) */}
                  <g
                    onClick={() => playCordTugAndToggle()}
                    className="cursor-pointer"
                  >
                    <path
                      d="M 60 92 C 62 56 84 42 118 42 C 152 42 174 56 176 92 Z"
                      fill="url(#lampShadeGrad)"
                      stroke={isLit ? '#6ee7b7' : '#334155'}
                      strokeWidth="2.2"
                    />
                    {/* Gloss Highlight on Shade */}
                    <path
                      d="M 76 80 C 80 60 92 52 108 50"
                      stroke={isLit ? 'rgba(236,253,245,0.55)' : 'rgba(148,163,184,0.16)'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                    {/* Bottom Rim of Shade */}
                    <ellipse
                      cx="118"
                      cy="92"
                      rx="58"
                      ry="7"
                      fill={isLit ? '#115e59' : '#0f172a'}
                      stroke={isLit ? '#5eead4' : '#334155'}
                      strokeWidth="1.8"
                    />
                  </g>

                  {/* Cute Rounded Glowing Lamp Character Body */}
                  <g
                    onClick={() => playCordTugAndToggle()}
                    className="cursor-pointer"
                  >
                    <rect
                      x="64"
                      y="112"
                      width="108"
                      height="88"
                      rx="28"
                      fill="url(#lampBodyGrad)"
                      stroke={isLit ? '#34d399' : '#1e293b'}
                      strokeWidth="2.4"
                    />
                    {/* Inner Screen Face Plate */}
                    <rect
                      x="76"
                      y="124"
                      width="84"
                      height="64"
                      rx="20"
                      fill={isLit ? '#042f2e' : '#070f13'}
                      stroke={isLit ? 'rgba(110,231,183,0.38)' : 'rgba(51,65,85,0.4)'}
                      strokeWidth="1.5"
                    />

                    {/* Expressive Eyes & Smile */}
                    {isLit ? (
                      <motion.g
                        animate={{
                          x: isHoveringLogin ? 4 : 0,
                          y: loading ? -1.5 : 0,
                        }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {/* Left Eye */}
                        <motion.ellipse
                          cx="100"
                          cy="151"
                          rx="6.5"
                          ry="7.5"
                          fill="#6ee7b7"
                          animate={{
                            scaleY: isBlinking ? 0.12 : 1,
                          }}
                          transition={{ duration: 0.1 }}
                          style={{ transformOrigin: '100px 151px' }}
                        />
                        <circle cx="102" cy="148.5" r="2" fill="#ecfdf5" />

                        {/* Right Eye */}
                        <motion.ellipse
                          cx="136"
                          cy="151"
                          rx="6.5"
                          ry="7.5"
                          fill="#6ee7b7"
                          animate={{
                            scaleY: isBlinking ? 0.12 : 1,
                          }}
                          transition={{ duration: 0.1 }}
                          style={{ transformOrigin: '136px 151px' }}
                        />
                        <circle cx="138" cy="148.5" r="2" fill="#ecfdf5" />

                        {/* Happy Smile */}
                        <path
                          d={loading ? 'M 108 166 Q 118 176 128 166' : 'M 109 166 Q 118 174 127 166'}
                          stroke="#6ee7b7"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          fill="none"
                        />
                        {/* Rosy Cheek Glow */}
                        <ellipse cx="90" cy="161" rx="5" ry="2.6" fill="rgba(45,212,191,0.3)" />
                        <ellipse cx="146" cy="161" rx="5" ry="2.6" fill="rgba(45,212,191,0.3)" />
                      </motion.g>
                    ) : (
                      /* Sleeping Closed Eyes when Lamp is Off */
                      <g opacity="0.55">
                        <path
                          d="M 94 153 Q 100 158 106 153"
                          stroke="#64748b"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <path
                          d="M 130 153 Q 136 158 142 153"
                          stroke="#64748b"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <path
                          d="M 113 168 L 123 168"
                          stroke="#475569"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </g>
                    )}
                  </g>
                </svg>

                {/* Interactive Draggable Pull Cord */}
                <div
                  className="absolute right-[26px] sm:right-[30px] top-[90px] w-12 h-36 flex flex-col items-center"
                >
                  {/* Elastic Cord Line */}
                  <motion.div
                    aria-hidden="true"
                    style={{
                      scaleY: cordScaleY,
                      transformOrigin: 'top center',
                    }}
                    className={`w-[2.5px] h-16 rounded-full transition-colors ${
                      isLit
                        ? 'bg-gradient-to-b from-emerald-300 to-teal-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]'
                        : 'bg-slate-500'
                    }`}
                  />

                  {/* Draggable & Clickable Pull Tassel Knob */}
                  <motion.button
                    type="button"
                    aria-label={isLit ? 'Tarik untuk mematikan lampu' : 'Tarik untuk menyalakan lampu'}
                    title={isLit ? 'Tarik atau klik untuk matikan lampu' : 'Tarik atau klik untuk nyalakan lampu'}
                    drag={shouldReduceMotion ? false : 'y'}
                    dragConstraints={{ top: 0, bottom: 42 }}
                    dragElastic={0.14}
                    dragSnapToOrigin
                    style={{ y: cordPullY, scale: knobHighlight }}
                    onDragStart={() => {
                      didDragRef.current = true;
                    }}
                    onDragEnd={(_, info) => {
                      if (info.offset.y > 14) {
                        setIsLit((prev) => !prev);
                      }
                      window.setTimeout(() => {
                        didDragRef.current = false;
                      }, 80);
                    }}
                    onClick={() => {
                      if (!didDragRef.current) {
                        playCordTugAndToggle();
                      }
                    }}
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.12 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                    className={`-mt-0.5 w-6 h-8 rounded-full border-2 flex items-center justify-center cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 transition-colors ${
                      isLit
                        ? 'bg-gradient-to-b from-emerald-300 to-teal-500 border-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.75)]'
                        : 'bg-slate-700 border-slate-500 hover:border-emerald-300 shadow-md'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-3 rounded-full ${
                        isLit ? 'bg-white/85' : 'bg-slate-400'
                      }`}
                    />
                  </motion.button>
                </div>
              </div>

              {/* Interactive Cord Hint Caption */}
              <button
                type="button"
                onClick={() => playCordTugAndToggle()}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300/85 hover:text-emerald-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-md px-2 py-1"
              >
                <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isLit
                    ? 'Tarik tali lampu untuk redupkan cahaya'
                    : 'Tarik atau klik tali lampu untuk menyalakan'}
                </span>
              </button>
            </div>

            {/* RIGHT STAGE: Illuminated Login Panel */}
            <div className="relative lg:col-span-7 p-6 sm:p-10 lg:p-11 flex flex-col justify-center">
              <motion.div
                animate={{
                  opacity: isLit ? 1 : 0.28,
                  y: isLit ? 0 : 8,
                  filter: isLit ? 'brightness(1)' : 'brightness(0.72)',
                }}
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <div className="mb-6">
                  <p className="text-xs font-medium text-emerald-300/90 mb-2">
                    {schoolProfile.namaSekolah} · {schoolProfile.statusAkreditasi}
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight [text-wrap:balance]">
                    Selamat Datang.
                  </h1>
                  <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                    Masuk dengan akun Google untuk sinkronisasi data siswa, jadwal, absensi, dan nilai secara otomatis di semua perangkat.
                  </p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={
                        shouldReduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, y: -6, scale: 0.98 }
                      }
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                      role="alert"
                      className="mb-5 rounded-xl border border-red-400/40 bg-red-950/75 px-4 py-3 text-sm text-red-100 space-y-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-300" />
                        <span>{error}</span>
                      </div>
                      {unauthorizedHost && (
                        <div className="pl-6 text-xs text-red-100/90 space-y-1.5">
                          <p>
                            Buka{' '}
                            <strong>
                              Firebase Console → Authentication → Settings → Authorized domains
                            </strong>
                            , klik <strong>Add domain</strong>, lalu masukkan:
                          </p>
                          <div className="font-mono font-semibold bg-black/45 border border-red-400/35 rounded px-2.5 py-1 text-red-100 select-all inline-block">
                            {unauthorizedHost}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-4">
                  <motion.button
                    type="button"
                    disabled={loading}
                    onMouseEnter={() => setIsHoveringLogin(true)}
                    onMouseLeave={() => setIsHoveringLogin(false)}
                    whileHover={shouldReduceMotion || loading ? undefined : { y: -1.5 }}
                    whileTap={shouldReduceMotion || loading ? undefined : { scale: 0.985 }}
                    onClick={handleGoogleSignIn}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:via-teal-300 hover:to-cyan-300 text-slate-950 text-sm font-bold shadow-[0_12px_32px_-8px_rgba(45,212,191,0.55)] flex items-center justify-center gap-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091418] disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                        <span>Menghubungkan ke Google...</span>
                      </>
                    ) : (
                      <>
                        <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-xs shrink-0">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              fill="#4285F4"
                              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                            />
                          </svg>
                        </span>
                        <span>Masuk dengan Google</span>
                      </>
                    )}
                  </motion.button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5 transition-colors hover:border-emerald-400/30">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
                        <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Sinkron Real-Time</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300/85 leading-relaxed">
                        Login dengan akun Google yang sama di HP dan laptop agar data tetap identik.
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5 transition-colors hover:border-teal-400/30">
                      <div className="flex items-center gap-2 text-xs font-semibold text-teal-200">
                        <Smartphone className="w-4 h-4 text-teal-400 shrink-0" />
                        <span>Instal di HP & PC</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300/85 leading-relaxed">
                        Bisa diinstal ke layar utama dan tetap bekerja saat sinyal lemah.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <PWAInstallButton variant="login-dark" />
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Data terenkripsi per akun</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Quick Overlay Prompt if User Explicitly Pulled the Cord OFF */}
              <AnimatePresence>
                {!isLit && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none"
                  >
                    <button
                      type="button"
                      onClick={() => playCordTugAndToggle(true)}
                      className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-emerald-400/35 text-xs font-semibold text-emerald-200 shadow-xl backdrop-blur-sm cursor-pointer transition-colors"
                    >
                      <Lightbulb className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span>Klik atau tarik tali lampu untuk menyalakan login</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-5 pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>Administrasi Guru · Tahun Ajaran Aktif</span>
        <span>Sinkronisasi Cloud & Mode Offline PWA</span>
      </footer>
    </div>
  );
};
