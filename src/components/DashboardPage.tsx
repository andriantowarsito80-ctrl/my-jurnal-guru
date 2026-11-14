import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FolderArchive,
  NotebookPen,
  Settings,
  Table2,
  UserCheck,
  Users,
} from 'lucide-react';
import { AppState, NavTab, WorkingDay } from '../types';
import {
  MONTH_NAMES_ID,
  WORKING_DAYS,
  formatIndonesianDate,
  getDayNameFromISO,
  getDaysInMonth,
  getHolidayInfo,
  toLocalDateISO,
} from '../utils/dateUtils';

interface DashboardPageProps {
  state: AppState;
  onNavigate: (tab: NavTab) => void;
  archivesCount?: number;
  onOpenAcademicYearModal?: (tab?: 'archives' | 'new-year') => void;
}

const AVATAR_GRADIENTS = [
  'from-sky-400 to-blue-600',
  'from-violet-400 to-purple-600',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
];

const NOTE_BADGE_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
];

function parseMinutes(waktu: string): number {
  const match = waktu.match(
    /(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/
  );
  if (!match) return 0;
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  return end > start ? end - start : 0;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  state,
  onNavigate,
  archivesCount = 0,
  onOpenAcademicYearModal,
}) => {
  const todayISO = toLocalDateISO(new Date());
  const todayDayName = getDayNameFromISO(todayISO);
  const initialDay: WorkingDay | 'Semua' = WORKING_DAYS.includes(
    todayDayName as WorkingDay
  )
    ? (todayDayName as WorkingDay)
    : 'Semua';

  const [selectedDay, setSelectedDay] = useState<WorkingDay | 'Semua'>(
    initialDay
  );
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [focusedDateISO, setFocusedDateISO] = useState(todayISO);
  const shouldReduceMotion = useReducedMotion();

  const { schoolProfile, teacherProfile } = state;

  const uniqueClasses = useMemo(
    () => Array.from(new Set(state.students.map((s) => s.kelas))).sort(),
    [state.students]
  );

  const filteredSchedules = useMemo(() => {
    const list =
      selectedDay === 'Semua'
        ? state.schedules
        : state.schedules.filter((s) => s.hari === selectedDay);
    return [...list].sort((a, b) => {
      const dayDiff =
        WORKING_DAYS.indexOf(a.hari) - WORKING_DAYS.indexOf(b.hari);
      if (dayDiff !== 0) return dayDiff;
      return a.jamKe.localeCompare(b.jamKe, undefined, { numeric: true });
    });
  }, [state.schedules, selectedDay]);

  const monthAttendanceStats = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-`;
    let total = 0;
    let hadir = 0;
    Object.entries(state.attendance).forEach(([key, status]) => {
      if (key.startsWith(prefix)) {
        total += 1;
        if (status === 'Hadir') hadir += 1;
      }
    });
    const pct = total > 0 ? Math.round((hadir / total) * 100) : 0;
    return { total, hadir, pct };
  }, [state.attendance]);

  const todayScheduleStats = useMemo(() => {
    const holidayInfo = getHolidayInfo(todayISO, state.holidays);
    if (holidayInfo.isHoliday) {
      return {
        sessions: 0,
        totalMinutes: 0,
        hoursLabel: '0j',
        subLabel: holidayInfo.isWeekend
          ? `${todayDayName} · Libur Akhir Pekan`
          : holidayInfo.label || 'Libur Sekolah',
      };
    }

    const todayList = state.schedules.filter((s) => s.hari === todayDayName);
    let totalMinutes = 0;
    todayList.forEach((sch) => {
      totalMinutes += parseMinutes(sch.waktu);
    });

    const hours = (totalMinutes / 60).toFixed(totalMinutes % 60 === 0 ? 0 : 1);
    return {
      sessions: todayList.length,
      totalMinutes,
      hoursLabel: `${hours.replace('.', ',')}j`,
      subLabel:
        todayList.length > 0
          ? `${todayDayName} · ${todayList.length} sesi mengajar`
          : `${todayDayName} · Tidak ada jadwal`,
    };
  }, [state.schedules, state.holidays, todayISO, todayDayName]);

  // Weekly 5-day teaching hours breakdown for Bento mini bar chart
  const weeklyBars = useMemo(() => {
    const days = WORKING_DAYS.map((day) => {
      const items = state.schedules.filter((s) => s.hari === day);
      const mins = items.reduce((acc, item) => acc + parseMinutes(item.waktu), 0);
      return {
        day,
        short: day.slice(0, 3),
        sessions: items.length,
        hours: Number((mins / 60).toFixed(1)),
      };
    });
    const maxHours = Math.max(1, ...days.map((d) => d.hours || d.sessions));
    const totalWeeklyHours = days.reduce((sum, d) => sum + d.hours, 0);
    return {
      days,
      maxHours,
      totalWeeklyLabel: `${totalWeeklyHours.toFixed(1).replace('.', ',')}j`,
    };
  }, [state.schedules]);

  // Monthly Mini Calendar grid
  const calendarGrid = useMemo(() => {
    const days = getDaysInMonth(calendarMonth.year, calendarMonth.month);
    const firstDate = new Date(calendarMonth.year, calendarMonth.month, 1);
    const jsDay = firstDate.getDay(); // 0=Sun..6=Sat
    const mondayOffset = jsDay === 0 ? 6 : jsDay - 1;
    const holidaySet = new Set(state.holidays.map((h) => h.tanggal));

    return {
      leadingEmpty: Array.from({ length: mondayOffset }),
      days: days.map((d) => ({
        ...d,
        isToday: d.dateISO === todayISO,
        isSelected: d.dateISO === focusedDateISO,
        isCustomHoliday: holidaySet.has(d.dateISO),
      })),
    };
  }, [calendarMonth, state.holidays, todayISO, focusedDateISO]);

  const focusedDateInfo = useMemo(() => {
    const holiday = getHolidayInfo(focusedDateISO, state.holidays);
    const dayName = getDayNameFromISO(focusedDateISO);
    const count = holiday.isHoliday
      ? 0
      : state.schedules.filter((s) => s.hari === dayName).length;
    return {
      formatted: formatIndonesianDate(focusedDateISO),
      status: holiday.isHoliday
        ? holiday.label || 'Hari Libur'
        : count > 0
        ? `${count} sesi mengajar terjadwal`
        : 'Hari efektif · Tidak ada jadwal',
      isHoliday: holiday.isHoliday,
    };
  }, [focusedDateISO, state.holidays, state.schedules]);

  const latestNotes = useMemo(
    () =>
      [...state.notes]
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
        .slice(0, 3),
    [state.notes]
  );

  const shiftMonth = (delta: number) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  return (
    <div className="space-y-5">
      {/* BENTO ROW 1: Pastel Hero Welcome Banner + Interactive Mini Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Pastel Hero Card (Matches V18 Lavender-Indigo Hero) */}
        <motion.section
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative lg:col-span-8 rounded-[26px] border border-indigo-200/70 bg-gradient-to-br from-[#dfe6ff] via-[#ece4ff] to-[#f8e1ff] p-6 sm:p-8 flex flex-col justify-between overflow-hidden shadow-[0_10px_30px_-18px_rgba(79,70,229,0.28)]"
        >
          {/* Decorative Soft Pastel Orbs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-14 -top-14 w-64 h-64 rounded-full bg-gradient-to-br from-white/55 to-fuchsia-200/40 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-10 -bottom-16 w-52 h-52 rounded-full bg-gradient-to-tr from-sky-200/45 to-indigo-200/35 blur-2xl"
          />

          <div className="relative z-10 max-w-xl">
            <p className="text-xs font-semibold text-indigo-900/75 mb-2">
              {schoolProfile.namaSekolah} · {formatIndonesianDate(todayISO)}
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-slate-900 tracking-tight leading-tight [text-wrap:balance]">
              Kelola Kelas Lebih Terpadu Hari Ini
            </h1>
            <p className="mt-2.5 text-sm text-slate-700/90 leading-relaxed max-w-lg">
              Selamat datang, <strong className="text-slate-900">{teacherProfile.namaGuru}</strong>. Pantau absensi suara, jadwal 5 hari kerja, catatan pembelajaran, dan nilai rapot siswa secara real-time.
            </p>
          </div>

          <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3">
            <motion.button
              type="button"
              whileHover={shouldReduceMotion ? undefined : { y: -1.5 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              onClick={() => onNavigate('absen')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16171d] hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-400" />
              <span>Mulai Absen Siswa</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={shouldReduceMotion ? undefined : { y: -1.5 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              onClick={() => onNavigate('siswa')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/80 hover:bg-white border border-indigo-200/80 text-slate-800 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Database Siswa</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
            </motion.button>
          </div>
        </motion.section>

        {/* Interactive Mini Calendar Card */}
        <motion.section
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-4 rounded-[26px] bg-white border border-slate-200/80 p-5 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.12)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-bold text-slate-900">
                {MONTH_NAMES_ID[calendarMonth.month]} {calendarMonth.year}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Bulan sebelumnya"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  aria-label="Bulan berikutnya"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 mb-1.5">
              <span>Sen</span>
              <span>Sel</span>
              <span>Rab</span>
              <span>Kam</span>
              <span>Jum</span>
              <span>Sab</span>
              <span>Min</span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs tabular-nums">
              {calendarGrid.leadingEmpty.map((_, i) => (
                <span key={`empty-${i}`} className="h-7" />
              ))}
              {calendarGrid.days.map((d) => {
                const isHoliday = d.isWeekend || d.isCustomHoliday;
                return (
                  <button
                    key={d.dateISO}
                    type="button"
                    onClick={() => setFocusedDateISO(d.dateISO)}
                    className={`h-7 w-7 mx-auto rounded-full flex items-center justify-center font-medium transition-colors cursor-pointer ${
                      d.isToday
                        ? 'bg-[#16171d] text-white font-bold shadow-xs'
                        : d.isSelected
                        ? 'bg-indigo-100 text-indigo-800 font-bold'
                        : isHoliday
                        ? 'text-rose-500/80 hover:bg-rose-50'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {d.day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-slate-700 truncate">
              {focusedDateInfo.formatted}
            </span>
            <span
              className={`shrink-0 font-medium ${
                focusedDateInfo.isHoliday ? 'text-rose-600' : 'text-indigo-600'
              }`}
            >
              {focusedDateInfo.status}
            </span>
          </div>
        </motion.section>
      </div>

      {/* BENTO ROW 2: 3-Column Visual Metric & Activity Row (Matches V18 Middle Row) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* Card 1: Siswa & Kelas Aktif (Overlapping Avatar Stack) */}
        <motion.button
          type="button"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          whileHover={shouldReduceMotion ? undefined : { y: -4 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
          onClick={() => onNavigate('siswa')}
          className="lg:col-span-4 text-left rounded-[26px] bg-white border border-slate-200/80 p-5 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.1)] hover:border-sky-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Siswa Aktif</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tersebar di {uniqueClasses.length} rombongan belajar
              </p>
            </div>
            <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex -space-x-2.5 overflow-hidden">
              {state.students.slice(0, 5).map((st, idx) => (
                <span
                  key={st.id}
                  title={st.nama}
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${
                    AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]
                  } text-white text-xs font-bold flex items-center justify-center ring-2 ring-white shadow-xs`}
                >
                  {st.nama.charAt(0).toUpperCase()}
                </span>
              ))}
              {state.students.length > 5 && (
                <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center ring-2 ring-white tabular-nums">
                  +{state.students.length - 5}
                </span>
              )}
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {state.students.length}
              </div>
              <div className="text-[11px] font-medium text-sky-700">
                Total Siswa
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 truncate">
            {uniqueClasses.length > 0
              ? `Kelas: ${uniqueClasses.join(' · ')}`
              : 'Belum ada kelas terdaftar'}
          </div>
        </motion.button>

        {/* Card 2: Jam Mengajar & Grafik Mingguan (Matches 9,2h Bar Chart Card) */}
        <motion.button
          type="button"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          whileHover={shouldReduceMotion ? undefined : { y: -4 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
          onClick={() => onNavigate('jadwal')}
          className="lg:col-span-4 text-left rounded-[26px] bg-white border border-slate-200/80 p-5 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.1)] hover:border-amber-300 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Jam Mengajar Hari Ini
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
                  {todayScheduleStats.hoursLabel}
                </span>
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  / {weeklyBars.totalWeeklyLabel} minggu
                </span>
              </div>
            </div>
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-4 h-4" />
            </span>
          </div>

          {/* Mini Vertical Bar Chart (Sen - Jum) */}
          <div className="mt-4 grid grid-cols-5 gap-2.5 items-end h-20 pt-2">
            {weeklyBars.days.map((d) => {
              const metric = d.hours || d.sessions;
              const pct = Math.max(14, Math.round((metric / weeklyBars.maxHours) * 100));
              const isToday = d.day === todayDayName;
              return (
                <div
                  key={d.day}
                  className="flex flex-col items-center gap-1.5 h-full justify-end"
                  title={`${d.day}: ${d.sessions} sesi (${d.hours} jam)`}
                >
                  <div className="w-full flex-1 flex items-end justify-center">
                    <div
                      style={{ height: `${pct}%` }}
                      className={`w-full max-w-[26px] rounded-t-lg transition-all ${
                        isToday
                          ? 'bg-gradient-to-t from-orange-500 to-amber-400 shadow-xs'
                          : metric > 0
                          ? 'bg-amber-200/85'
                          : 'bg-slate-100'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold ${
                      isToday ? 'text-orange-600' : 'text-slate-400'
                    }`}
                  >
                    {d.short}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 truncate">
            {todayScheduleStats.subLabel}
          </div>
        </motion.button>

        {/* Card 3: Catatan Pembelajaran Terbaru (Matches Notifications Card) */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          whileHover={shouldReduceMotion ? undefined : { y: -4 }}
          className="md:col-span-2 lg:col-span-4 rounded-[26px] bg-white border border-slate-200/80 p-5 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.1)] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Catatan Guru Terbaru
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('catatan')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Semua ({state.notes.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {latestNotes.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-500">
                Belum ada catatan pembelajaran tersimpan.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('catatan')}
                className="mt-2.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                + Tambah Catatan Pertama
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {latestNotes.map((note, idx) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => onNavigate('catatan')}
                  className="w-full text-left flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      NOTE_BADGE_COLORS[idx % NOTE_BADGE_COLORS.length]
                    }`}
                  >
                    <NotebookPen className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {note.materi}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {note.kelas} · {note.mataPelajaran}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 tabular-nums shrink-0">
                    {note.tanggal.slice(5)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* BENTO ROW 3: Kehadiran & Modul Cepat + Dark Obsidian Spotlight Card (Matches V18 Bottom Row) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Attendance + Quick Jump Module Tiles */}
        <motion.section
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 rounded-[26px] bg-white border border-slate-200/80 p-6 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.1)] flex flex-col justify-between"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ringkasan Kinerja & Akses Modul
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Metrik presensi bulan berjalan serta pintasan modul rekap dan rapot
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
                  {monthAttendanceStats.pct}%
                </div>
                <div className="text-[11px] text-slate-500">
                  Hadir ({monthAttendanceStats.hadir}/{monthAttendanceStats.total})
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-700 font-mono tabular-nums">
                  {state.schedules.length}
                </div>
                <div className="text-[11px] text-slate-500">
                  Sesi / Minggu
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <motion.button
              type="button"
              whileHover={shouldReduceMotion ? undefined : { y: -3 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              onClick={() => onNavigate('rekap')}
              className="text-left rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100/70 border border-emerald-200/80 p-4 flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Table2 className="w-4.5 h-4.5" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    Rekap Kehadiran
                  </div>
                  <div className="text-xs text-emerald-800/80 truncate">
                    Matriks bulanan & ekspor PDF/Excel
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-700 shrink-0" />
            </motion.button>

            <motion.button
              type="button"
              whileHover={shouldReduceMotion ? undefined : { y: -3 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              onClick={() => onNavigate('nilai')}
              className="text-left rounded-2xl bg-gradient-to-br from-rose-50 to-pink-100/70 border border-rose-200/80 p-4 flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Award className="w-4.5 h-4.5" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    Daftar Nilai Rapot
                  </div>
                  <div className="text-xs text-rose-800/80 truncate">
                    11 kolom tugas, ASAS/ASAT & rapor
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-rose-700 shrink-0" />
            </motion.button>
          </div>
        </motion.section>

        {/* Right: Dark Glowing Violet-Obsidian Spotlight Card (Matches "Unleash Your Potential") */}
        <motion.section
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="relative lg:col-span-5 rounded-[26px] bg-gradient-to-br from-[#16171d] via-[#211a3d] to-[#341b58] text-white p-6 shadow-[0_18px_45px_-20px_rgba(49,27,88,0.65)] overflow-hidden flex flex-col justify-between"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-violet-500/25 blur-2xl"
          />

          <div className="relative z-10">
            <p className="text-xs font-medium text-violet-300">
              TA {state.activeAcademicYear} · Semester {state.activeSemester} · NPSN {schoolProfile.npsn}
            </p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white [text-wrap:balance]">
              Arsip Tahun Ajaran & Pengaturan
            </h2>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Berganti tahun ajaran atau jadwal mengajar? Data lama otomatis diarsipkan ({archivesCount} arsip tersimpan) agar tetap bisa dibuka & diekspor kapan saja.
            </p>
          </div>

          <div className="relative z-10 mt-5 flex flex-wrap items-center gap-2.5">
            {onOpenAcademicYearModal && (
              <motion.button
                type="button"
                whileHover={shouldReduceMotion ? undefined : { y: -1.5 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                onClick={() => onOpenAcademicYearModal('archives')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-950 hover:bg-violet-50 text-xs font-bold shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FolderArchive className="w-3.5 h-3.5 text-indigo-700" />
                <span>Tahun Ajaran & Arsip ({archivesCount})</span>
              </motion.button>
            )}
            <motion.button
              type="button"
              whileHover={shouldReduceMotion ? undefined : { y: -1.5 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              onClick={() => onNavigate('pengaturan')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Settings className="w-3.5 h-3.5 text-violet-300" />
              <span>Pengaturan</span>
            </motion.button>
          </div>
        </motion.section>
      </div>

      {/* BENTO ROW 4: Profil Sekolah & Profil Guru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Profil Sekolah */}
        <section className="bg-white border border-slate-200/80 rounded-[26px] p-6 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Profil Sekolah
                  </h2>
                  <p className="text-xs text-slate-500">
                    Identitas resmi satuan pendidikan
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-blue-700">
                {schoolProfile.statusAkreditasi}
              </span>
            </div>

            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1">
                <dt className="text-slate-500 font-medium">Nama Sekolah</dt>
                <dd className="sm:col-span-2 font-semibold text-slate-900">
                  {schoolProfile.namaSekolah}
                </dd>
              </div>
              <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1">
                <dt className="text-slate-500 font-medium">NPSN</dt>
                <dd className="sm:col-span-2 font-mono font-semibold text-slate-900 tabular-nums">
                  {schoolProfile.npsn}
                </dd>
              </div>
              <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1">
                <dt className="text-slate-500 font-medium">Kepala Sekolah</dt>
                <dd className="sm:col-span-2 font-semibold text-slate-900">
                  {schoolProfile.kepalaSekolah}
                </dd>
              </div>
              {schoolProfile.alamat && (
                <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1">
                  <dt className="text-slate-500 font-medium">Alamat</dt>
                  <dd className="sm:col-span-2 text-slate-700">
                    {schoolProfile.alamat}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </section>

        {/* Profil Guru */}
        <section className="bg-white border border-slate-200/80 rounded-[26px] p-6 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.08)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Profil Guru
                  </h2>
                  <p className="text-xs text-slate-500">
                    Biodata pendidik & mata pelajaran diampu
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-5 items-start">
              <motion.div
                whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-indigo-200 bg-slate-100 shrink-0 flex items-center justify-center shadow-xs"
              >
                {teacherProfile.fotoProfil ? (
                  <img
                    src={teacherProfile.fotoProfil}
                    alt={teacherProfile.namaGuru}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-slate-400">
                    {teacherProfile.namaGuru.charAt(0)}
                  </span>
                )}
              </motion.div>

              <dl className="flex-1 w-full divide-y divide-slate-100 text-sm">
                <div className="pb-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
                  <dt className="text-slate-500 font-medium">Nama Guru</dt>
                  <dd className="sm:col-span-2 font-bold text-slate-900">
                    {teacherProfile.namaGuru}
                  </dd>
                </div>
                <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
                  <dt className="text-slate-500 font-medium">NIP</dt>
                  <dd className="sm:col-span-2 font-mono font-semibold text-slate-900 tabular-nums">
                    {teacherProfile.nip}
                  </dd>
                </div>
                <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
                  <dt className="text-slate-500 font-medium">Email</dt>
                  <dd className="sm:col-span-2 text-slate-800 break-all">
                    {teacherProfile.email}
                  </dd>
                </div>
                <div className="pt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
                  <dt className="text-slate-500 font-medium">
                    Mata Pelajaran
                  </dt>
                  <dd className="sm:col-span-2 text-slate-900 font-medium space-y-1">
                    {teacherProfile.mataPelajaran.map((mp, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="font-mono text-xs text-indigo-600 font-semibold">
                          {idx + 1}.
                        </span>
                        <span>{mp}</span>
                      </div>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      </div>

      {/* BENTO ROW 5: Informasi Jadwal Mengajar */}
      <section className="bg-white border border-slate-200/80 rounded-[26px] p-6 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Informasi Jadwal Mengajar
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Terhubung dengan menu Jadwal Mengajar · Hari kerja Senin – Jumat
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {(['Semua', ...WORKING_DAYS] as const).map((day) => {
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="dashboard-day-tab"
                        transition={
                          shouldReduceMotion
                            ? { duration: 0 }
                            : {
                                type: 'spring',
                                stiffness: 480,
                                damping: 32,
                                mass: 0.6,
                              }
                        }
                        className="absolute inset-0 rounded-lg bg-[#16171d] shadow-xs"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">
                      {day === 'Semua' ? 'Semua Hari' : day}
                    </span>
                  </button>
                );
              })}
            </div>

            <motion.button
              type="button"
              whileHover={shouldReduceMotion ? undefined : { x: 2 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              onClick={() => onNavigate('jadwal')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 hover:text-indigo-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Kelola Jadwal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="py-12 text-center">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">
              Tidak ada jadwal mengajar pada hari {selectedDay}.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Tambahkan atau sesuaikan jadwal di menu Jadwal Mengajar.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Hari</th>
                  <th className="py-2.5 px-4">Jam Ke</th>
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-4">Kelas</th>
                  <th className="py-2.5 px-4">Mata Pelajaran</th>
                  <th className="py-2.5 pl-4 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedules.map((sch) => (
                  <tr
                    key={sch.id}
                    className="hover:bg-indigo-50/40 transition-colors"
                  >
                    <td className="py-3 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                      {sch.hari}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      Jam ke-{sch.jamKe}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {sch.waktu}
                    </td>
                    <td className="py-3 px-4 font-semibold text-indigo-700 whitespace-nowrap">
                      {sch.kelas}
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      {sch.mataPelajaran}
                    </td>
                    <td className="py-3 pl-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onNavigate('absen')}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 mr-3 cursor-pointer"
                      >
                        Isi Absen
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('catatan')}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
                      >
                        Catat Jurnal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
