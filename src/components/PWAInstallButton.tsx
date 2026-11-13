import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Download, Smartphone, Share, PlusSquare, X, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'login';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  const buttonClass =
    variant === 'sidebar'
      ? 'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-400/35 text-xs font-semibold text-sky-200 hover:text-white hover:from-sky-500/35 hover:to-indigo-500/35 transition-colors cursor-pointer'
      : variant === 'login'
      ? 'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50/80 hover:bg-blue-100/80 text-xs font-semibold text-blue-800 transition-colors cursor-pointer'
      : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer';

  const label = isInstallable
    ? 'Instal di Perangkat'
    : isIOS
    ? 'Instal di iPhone/iPad'
    : 'Instal Aplikasi';

  return (
    <>
      <motion.button
        type="button"
        whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
        onClick={handleClick}
        className={buttonClass}
        title="Instal aplikasi ke layar utama HP atau komputer"
      >
        {isInstallable ? (
          <Download className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
        )}
        <span>{label}</span>
      </motion.button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-blue-200 p-6 shadow-2xl text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Instal Administrasi Guru di HP / Perangkat Lain
                  </h3>
                  <p className="text-xs text-slate-500">
                    Buka langsung seperti aplikasi tanpa browser bar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Tutup panduan instalasi"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-4 space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Buka aplikasi ini menggunakan browser <strong>Safari</strong> di iPhone/iPad Anda.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span className="inline-flex flex-wrap items-center gap-1">
                    Ketuk ikon <Share className="w-4 h-4 text-blue-600 inline" />{' '}
                    <strong>Bagikan (Share)</strong> pada bilah Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span className="inline-flex flex-wrap items-center gap-1">
                    Gulir ke bawah lalu pilih{' '}
                    <PlusSquare className="w-4 h-4 text-blue-600 inline" />{' '}
                    <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-xs text-blue-900">
                  Buka tautan aplikasi ini di <strong>Chrome / Edge</strong> pada HP Android atau komputer lain, lalu:
                </div>
                <ol className="space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Di HP Android (Chrome): ketuk menu titik tiga (⋮) di kanan atas lalu pilih{' '}
                      <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Di Laptop/PC (Chrome/Edge): klik ikon <strong>Instal</strong> di sisi kanan bilah alamat browser.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Masuk dengan <strong>akun Google yang sama</strong> agar seluruh data otomatis tersinkron di semua perangkat.
                    </span>
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg border border-amber-400">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Mode Offline — Perubahan tersimpan lokal & otomatis sinkron saat online</span>
    </div>
  );
};
