import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  ClipboardCheck,
  Table2,
  NotebookPen,
  Award,
  Settings,
  LogOut,
  X,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { NavTab, SchoolProfile, TeacherProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onLogout: () => void;
  schoolProfile: SchoolProfile;
  teacherProfile: TeacherProfile;
  cloudEmail?: string | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const MENU_ITEMS: {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeBg: string;
  iconRest: string;
  iconActive: string;
}[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    activeBg:
      'bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 shadow-[0_8px_20px_-4px_rgba(99,102,241,0.65)]',
    iconRest: 'text-slate-400 group-hover:text-white',
    iconActive: 'text-white',
  },
  {
    id: 'siswa',
    label: 'Database Siswa',
    icon: Users,
    activeBg:
      'bg-gradient-to-br from-sky-500 to-cyan-500 shadow-[0_8px_20px_-4px_rgba(14,165,233,0.6)]',
    iconRest: 'text-slate-400 group-hover:text-sky-300',
    iconActive: 'text-white',
  },
  {
    id: 'jadwal',
    label: 'Jadwal Mengajar',
    icon: CalendarClock,
    activeBg:
      'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_8px_20px_-4px_rgba(139,92,246,0.6)]',
    iconRest: 'text-slate-400 group-hover:text-violet-300',
    iconActive: 'text-white',
  },
  {
    id: 'absen',
    label: 'Absen Siswa',
    icon: ClipboardCheck,
    activeBg:
      'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-[0_8px_20px_-4px_rgba(16,185,129,0.6)]',
    iconRest: 'text-slate-400 group-hover:text-emerald-300',
    iconActive: 'text-white',
  },
  {
    id: 'rekap',
    label: 'Rekap Kehadiran',
    icon: Table2,
    activeBg:
      'bg-gradient-to-br from-teal-500 to-cyan-500 shadow-[0_8px_20px_-4px_rgba(20,184,166,0.6)]',
    iconRest: 'text-slate-400 group-hover:text-teal-300',
    iconActive: 'text-white',
  },
  {
    id: 'catatan',
    label: 'Catatan Guru',
    icon: NotebookPen,
    activeBg:
      'bg-gradient-to-br from-amber-500 to-orange-500 shadow-[0_8px_20px_-4px_rgba(245,158,11,0.6)]',
    iconRest: 'text-slate-400 group-hover:text-amber-300',
    iconActive: 'text-white',
  },
  {
    id: 'nilai',
    label: 'Daftar Nilai',
    icon: Award,
    activeBg:
      'bg-gradient-to-br from-rose-500 to-pink-500 shadow-[0_8px_20px_-4px_rgba(244,63,94,0.6)]',
    iconRest: 'text-slate-400 group-hover:text-rose-300',
    iconActive: 'text-white',
  },
  {
    id: 'pengaturan',
    label: 'Pengaturan',
    icon: Settings,
    activeBg:
      'bg-gradient-to-br from-indigo-500 to-blue-600 shadow-[0_8px_20px_-4px_rgba(79,70,229,0.6)]',
    iconRest: 'text-slate-400 group-hover:text-indigo-300',
    iconActive: 'text-white',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onLogout,
  schoolProfile,
  teacherProfile,
  cloudEmail,
  mobileOpen,
  onCloseMobile,
}) => {
  const [compactRail, setCompactRail] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  const renderContent = (instancePrefix: string, forceExpanded = false) => {
    const isExpanded = forceExpanded || !compactRail;

    return (
      <div
        className={`relative flex flex-col h-full bg-[#16171d] text-slate-100 border border-white/10 shadow-[0_24px_54px_-18px_rgba(15,23,42,0.55)] ${
          forceExpanded
            ? 'w-64 rounded-r-3xl'
            : isExpanded
            ? 'w-[244px] rounded-[26px]'
            : 'w-[78px] rounded-[26px]'
        }`}
      >
        {/* Expand/Collapse Circular Edge Toggle on Desktop Rail (Matches V18) */}
        {!forceExpanded && (
          <button
            type="button"
            onClick={() => setCompactRail((prev) => !prev)}
            aria-label={isExpanded ? 'Ciutkan sidebar' : 'Lebarkan sidebar'}
            title={isExpanded ? 'Mode Rail Ikon' : 'Tampilkan Label Menu'}
            className="hidden lg:flex absolute -right-3 top-7 z-30 w-6 h-6 rounded-full bg-white text-slate-800 border border-slate-200 shadow-md items-center justify-center hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Brand Header */}
        <div
          className={`py-5 border-b border-white/[0.08] flex items-center ${
            isExpanded ? 'px-5 justify-between gap-2' : 'px-3 justify-center'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              type="button"
              onClick={() => {
                if (!forceExpanded) setCompactRail((prev) => !prev);
              }}
              whileHover={shouldReduceMotion ? undefined : { rotate: -6, scale: 1.06 }}
              transition={{ type: 'spring', stiffness: 450, damping: 20 }}
              title="Administrasi Guru"
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-950/50 cursor-pointer"
            >
              <GraduationCap className="w-5 h-5 text-white" />
            </motion.button>
            {isExpanded && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  Administrasi Guru
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {schoolProfile.namaSekolah}
                </div>
              </div>
            )}
          </div>
          {forceExpanded && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Tutup menu"
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav
          className={`flex-1 py-4 space-y-2 overflow-y-auto overflow-x-visible ${
            isExpanded ? 'px-3' : 'px-2.5'
          }`}
          aria-label="Menu Utama"
        >
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                title={!isExpanded ? item.label : undefined}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : isExpanded
                    ? { x: isActive ? 0 : 3 }
                    : { scale: 1.06 }
                }
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`group relative w-full flex items-center ${
                  isExpanded
                    ? 'justify-between gap-2.5 px-3 py-2.5 rounded-2xl'
                    : 'justify-center p-2.5 rounded-2xl'
                } text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId={`sidebar-active-${instancePrefix}`}
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : {
                            type: 'spring',
                            stiffness: 420,
                            damping: 30,
                            mass: 0.7,
                          }
                    }
                    className={`absolute inset-0 rounded-2xl ${item.activeBg}`}
                    aria-hidden="true"
                  />
                )}

                <span className="relative z-10 flex items-center gap-3 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-150 ${
                      isActive ? item.iconActive : item.iconRest
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  {isExpanded && <span className="truncate text-[13px]">{item.label}</span>}
                </span>

                {isExpanded && (
                  <ChevronRight
                    className={`relative z-10 w-3.5 h-3.5 shrink-0 transition-all duration-150 ${
                      isActive
                        ? 'opacity-90 translate-x-0 text-white'
                        : 'opacity-0 -translate-x-1 group-hover:opacity-70 group-hover:translate-x-0 text-slate-400'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Teacher Summary & Logout */}
        <div
          className={`border-t border-white/[0.08] bg-black/20 rounded-b-[26px] ${
            isExpanded ? 'p-4 space-y-2.5' : 'p-3 flex flex-col items-center gap-2.5'
          }`}
        >
          <div
            className={`flex items-center min-w-0 ${
              isExpanded ? 'gap-3 w-full' : 'justify-center'
            }`}
            title={!isExpanded ? `${teacherProfile.namaGuru} (${cloudEmail || teacherProfile.nip})` : undefined}
          >
            <img
              src={teacherProfile.fotoProfil}
              alt={teacherProfile.namaGuru}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover bg-slate-800 shrink-0 border-2 border-indigo-400/60 shadow-sm"
            />
            {isExpanded && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {teacherProfile.namaGuru}
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  {cloudEmail || `NIP ${teacherProfile.nip}`}
                </div>
              </div>
            )}
          </div>

          {isExpanded && <PWAInstallButton variant="sidebar" />}

          <motion.button
            type="button"
            title="Keluar dari akun"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            onClick={onLogout}
            className={`flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-medium text-slate-300 hover:text-white hover:bg-rose-500/20 hover:border-rose-400/40 transition-colors cursor-pointer ${
              isExpanded ? 'w-full px-3 py-2' : 'w-10 h-10 p-0'
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {isExpanded && <span>Keluar</span>}
          </motion.button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop persistent floating dark rail */}
      <aside className="hidden lg:flex h-[calc(100vh-1.75rem)] sticky top-3.5 my-3.5 ml-3.5 shrink-0 z-30">
        {renderContent('desktop', false)}
      </aside>

      {/* Mobile slide-over drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]"
              onClick={onCloseMobile}
              aria-hidden="true"
            />
            <motion.div
              initial={shouldReduceMotion ? false : { x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              className="relative z-10 h-full"
            >
              {renderContent('mobile', true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
