import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Eye, EyeOff, Lock, User, AlertCircle, BookOpen } from 'lucide-react';
import campusImg from '../assets/images/campus_architecture_1794569693784.jpg';
import { AuthCredentials, SchoolProfile } from '../types';

interface LoginPageProps {
  credentials: AuthCredentials;
  schoolProfile: SchoolProfile;
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  credentials,
  schoolProfile,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const shouldReduceMotion = useReducedMotion();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (
      username.trim() === credentials.username &&
      password === credentials.password
    ) {
      onLoginSuccess();
    } else {
      setError('Username atau password tidak sesuai. Periksa kembali kredensial Anda.');
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
            daftar nilai rapot.
          </p>
        </motion.div>
      </div>

      {/* Right Login Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-white">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Masuk ke Sistem
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Silakan masukkan username dan password akun guru Anda.
            </p>
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
                className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="login-username"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  className="w-full h-11 pl-10 pr-12 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              whileHover={shouldReduceMotion ? undefined : { y: -1 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 cursor-pointer"
            >
              Masuk
            </motion.button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Administrasi Guru · Tahun Ajaran Aktif</span>
            <span className="font-mono text-slate-400">5 Hari Kerja</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
