import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  BookOpen,
  Cloud,
  Loader2,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import campusImg from '../assets/images/campus_architecture_1794569693784.jpg';
import { SchoolProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface LoginPageProps {
  schoolProfile: SchoolProfile;
  onGoogleLogin: () => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  schoolProfile,
  onGoogleLogin,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const shouldReduceMotion = useReducedMotion();

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await onGoogleLogin();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setError('Jendela login Google ditutup sebelum selesai. Silakan coba lagi.');
      } else if (msg.includes('popup-blocked')) {
        setError('Pop-up diblokir oleh browser. Izinkan pop-up untuk masuk dengan Google.');
      } else if (msg.includes('network-request-failed')) {
        setError('Koneksi internet sedang tidak stabil. Periksa jaringan Anda lalu coba lagi.');
      } else {
        setError('Gagal masuk dengan akun Google. Silakan coba beberapa saat lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Architectural Panel */}
      <div className="relative lg:w-1/2 min-h-[260px] lg:min-h-screen bg-slate-900 overflow-hidden flex flex-col justify-between">
        <img
          src={campusImg}
          alt={schoolProfile.namaSekolah}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-indigo-950/60 to-blue-950/45"
          aria-hidden="true"
        />

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 p-8 lg:p-12"
        >
          <div className="inline-flex items-center gap-2.5 text-white/95">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-teal-400 flex items-center justify-center shrink-0 shadow-md">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-wide">
              Portal Administrasi Guru
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 p-8 lg:p-12 max-w-xl"
        >
          <p className="text-xs font-medium text-sky-200 mb-2">
            NPSN {schoolProfile.npsn} · {schoolProfile.statusAkreditasi}
          </p>
          <h1 className="text-2xl lg:text-4xl font-bold text-white tracking-tight leading-tight [text-wrap:balance]">
            {schoolProfile.namaSekolah}
          </h1>
          <p className="mt-3 text-sm lg:text-base text-slate-200 leading-relaxed">
            Sistem terpadu pengelolaan data siswa, jadwal mengajar 5 hari kerja,
            absensi harian, rekap kehadiran bulanan, catatan pembelajaran, dan
            daftar nilai rapot yang tersinkron antar perangkat.
          </p>
        </motion.div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-white">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="flex items-start justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Masuk ke Sistem
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Masuk dengan akun Google untuk sinkronisasi data otomatis di HP, tablet, dan komputer.
              </p>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={
                  shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <motion.button
              type="button"
              disabled={loading}
              whileHover={shouldReduceMotion || loading ? undefined : { y: -1 }}
              whileTap={shouldReduceMotion || loading ? undefined : { scale: 0.98 }}
              onClick={handleGoogleSignIn}
              className="w-full h-12 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold shadow-sm flex items-center justify-center gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Menghubungkan ke Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                  <span>Masuk dengan Google</span>
                </>
              )}
            </motion.button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-sky-50/70 border border-blue-200 p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Sinkron Real-Time</span>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Login dengan akun Google yang sama di HP dan laptop agar data tetap identik.
                </p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/70 border border-emerald-200 p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Instal di HP & PC</span>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Bisa diinstal ke layar utama dan tetap bekerja saat sinyal lemah.
                </p>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between gap-3">
              <PWAInstallButton variant="login" />
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Data terenkripsi per akun</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Administrasi Guru · Tahun Ajaran Aktif</span>
            <span className="font-mono text-slate-400">Cloud Sync · PWA</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
