import React from 'react';
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
} from 'lucide-react';
import { NavTab, SchoolProfile, TeacherProfile } from '../types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onLogout: () => void;
  schoolProfile: SchoolProfile;
  teacherProfile: TeacherProfile;
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
    activeBg: 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-950/40',
    iconRest: 'bg-blue-500/15 text-blue-300 group-hover:bg-blue-500/25 group-hover:text-blue-200',
    iconActive: 'bg-white/20 text-white',
  },
  {
    id: 'siswa',
    label: 'Database Siswa',
    icon: Users,
    activeBg: 'bg-gradient-to-r from-sky-600 to-cyan-600 shadow-md shadow-sky-950/40',
    iconRest: 'bg-sky-500/15 text-sky-300 group-hover:bg-sky-500/25 group-hover:text-sky-200',
    iconActive: 'bg-white/20 text-white',
  },
  {
    id: 'jadwal',
    label: 'Jadwal Mengajar',
    icon: CalendarClock,
    activeBg: 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-md shadow-violet-950/40',
    iconRest: 'bg-violet-500/15 text-violet-300 group-hover:bg-violet-500/25 group-hover:text-violet-200',
    iconActive: 'bg-white/20 text-white',
  },
  {
    id: 'absen',
    label: 'Absen Siswa',
    icon: ClipboardCheck,
    activeBg: 'bg-gradient-to-r from-emerald-600 to-green-600 shadow-md shadow-emerald-950/40',
    iconRest: 'bg-emerald-500/15 text-emerald-300 group-hover:bg-emerald-500/25 group-hover:text-emerald-200',
    iconActive: 'bg-white/20 text-white',
  },
  {
    id: 'rekap',
    label: 'Rekap Kehadiran',
    icon: Table2,
    activeBg: 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-md shadow-teal-950/40',
    iconRest: 'bg-teal-500/15 text-teal-300 group-hover:bg-teal-500/25 group-hover:text-teal-200',
    iconActive: 'bg-white/20 text-white',
  },
  {
    id: 'catatan',
    label: 'Catatan Guru',
    icon: NotebookPen,
    activeBg: 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-md shadow-amber-950/40',
    iconRest: 'bg-amber-500/15 text-amber-300 group-hover:bg-amber-500/25 group-hover:text-amber-200',
    iconActive: 'bg-white/20 text-white',
  },
  {
    id: 'nilai',
    label: 'Daftar Nilai',
    icon: Award,
    activeBg: 'bg-gradient-to-r from-rose-600 to-pink-600 shadow-md shadow-rose-950/40',
    iconRest: 'bg-rose-500/15 text-rose-300 group-hover:bg-rose-500/25 group-hover:text-rose-200',
    iconActive: 'bg-white/20 text-white',
  },
  {
    id: 'pengaturan',
    label: 'Pengaturan',
    icon: Settings,
    activeBg: 'bg-gradient-to-r from-indigo-600 to-slate-700 shadow-md shadow-indigo-950/40',
    iconRest: 'bg-indigo-500/15 text-indigo-300 group-hover:bg-indigo-500/25 group-hover:text-indigo-200',
    iconActive: 'bg-white/20 text-white',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onLogout,
  schoolProfile,
  teacherProfile,
  mobileOpen,
  onCloseMobile,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const renderContent = (instancePrefix: string) => (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 w-64 shrink-0 border-r border-slate-800/90">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            whileHover={shouldReduceMotion ? undefined : { rotate: -6, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
            className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-teal-400 flex items-center justify-center shrink-0 shadow-sm"
          >
            <GraduationCap className="w-5 h-5 text-white" />
          </motion.div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">
              Administrasi Guru
            </div>
            <div className="text-xs text-slate-400 truncate">
              {schoolProfile.namaSekolah}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Tutup menu"
          className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav
        className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto"
        aria-label="Menu Utama"
      >
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              type="button"
              whileHover={shouldReduceMotion ? undefined : { x: isActive ? 0 : 4 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`group relative w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
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
                          damping: 32,
                          mass: 0.7,
                        }
                  }
                  className={`absolute inset-0 rounded-xl ${item.activeBg}`}
                  aria-hidden="true"
                />
              )}

              <span className="relative z-10 flex items-center gap-3 min-w-0">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                    isActive ? item.iconActive : item.iconRest
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="truncate">{item.label}</span>
              </span>

              <ChevronRight
                className={`relative z-10 w-3.5 h-3.5 shrink-0 transition-all duration-150 ${
                  isActive
                    ? 'opacity-90 translate-x-0 text-white'
                    : 'opacity-0 -translate-x-1 group-hover:opacity-70 group-hover:translate-x-0 text-slate-400'
                }`}
                aria-hidden="true"
              />
            </motion.button>
          );
        })}
      </nav>

      {/* Teacher Summary & Logout */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950/40">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={teacherProfile.fotoProfil}
            alt={teacherProfile.namaGuru}
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-cover bg-slate-700 shrink-0 border-2 border-indigo-400/50"
          />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {teacherProfile.namaGuru}
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              NIP {teacherProfile.nip}
            </div>
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700/80 bg-slate-900/60 text-xs font-medium text-slate-300 hover:text-white hover:bg-rose-600/20 hover:border-rose-500/40 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </motion.button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:flex h-screen sticky top-0 shrink-0">
        {renderContent('desktop')}
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
              {renderContent('mobile')}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
