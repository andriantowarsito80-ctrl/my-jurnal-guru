import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Building2,
  UserCheck,
  CalendarClock,
  ArrowRight,
  Users,
  BookOpen,
  ClipboardCheck,
  NotebookPen,
  Clock,
  Layers,
  LayoutDashboard,
} from 'lucide-react';
import {
  AppState,
  NavTab,
  WorkingDay,
} from '../types';
import {
  WORKING_DAYS,
  formatIndonesianDate,
  getDayNameFromISO,
  getHolidayInfo,
  toLocalDateISO,
} from '../utils/dateUtils';

interface DashboardPageProps {
  state: AppState;
  onNavigate: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  state,
  onNavigate,
}) => {
  const todayISO = toLocalDateISO(new Date());
  const todayDayName = getDayNameFromISO(todayISO);
  const initialDay: WorkingDay | 'Semua' = WORKING_DAYS.includes(
    todayDayName as WorkingDay
  )
    ? (todayDayName as WorkingDay)
    : 'Semua';

  const [selectedDay, setSelectedDay] = useState<WorkingDay | 'Semua'>(initialDay);
  const shouldReduceMotion = useReducedMotion();

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
        hoursLabel: '0 Jam',
        subLabel: holidayInfo.isWeekend
          ? `${todayDayName} · Libur Akhir Pekan`
          : holidayInfo.label || 'Libur Sekolah',
      };
    }

    const todayList = state.schedules.filter((s) => s.hari === todayDayName);
    let totalMinutes = 0;

    todayList.forEach((sch) => {
      const match = sch.waktu.match(
        /(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/
      );
      if (match) {
        const startMins = Number(match[1]) * 60 + Number(match[2]);
        const endMins = Number(match[3]) * 60 + Number(match[4]);
        if (endMins > startMins) {
          totalMinutes += endMins - startMins;
        }
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const hoursLabel =
      totalMinutes === 0
        ? '0 Jam'
        : mins === 0
        ? `${hours} Jam`
        : `${hours} Jam ${mins} Menit`;

    return {
      sessions: todayList.length,
      totalMinutes,
      hoursLabel,
      subLabel:
        todayList.length > 0
          ? `${todayDayName} · ${todayList.length} sesi mengajar (${totalMinutes} menit)`
          : `${todayDayName} · Tidak ada jadwal mengajar`,
    };
  }, [state.schedules, state.holidays, todayISO, todayDayName]);

  const { schoolProfile, teacherProfile } = state;

  const summaryCards: {
    label: string;
    value: string | number;
    sub: string;
    tab: NavTab;
    icon: React.ComponentType<{ className?: string }>;
    cardBg: string;
    iconBox: string;
    labelColor: string;
    valueColor: string;
    subColor: string;
  }[] = [
    {
      label: 'Total Siswa Aktif',
      value: state.students.length,
      sub: `Tersebar di ${uniqueClasses.length} kelas`,
      tab: 'siswa',
      icon: Users,
      cardBg: 'bg-gradient-to-br from-sky-50 to-cyan-100/80 border-sky-200 hover:border-sky-300',
      iconBox: 'bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-xs',
      labelColor: 'text-sky-900/80',
      valueColor: 'text-sky-800',
      subColor: 'text-sky-800/75',
    },
    {
      label: 'Sesi Mengajar / Minggu',
      value: state.schedules.length,
      sub: `${teacherProfile.mataPelajaran.length} mata pelajaran diampu`,
      tab: 'jadwal',
      icon: CalendarClock,
      cardBg: 'bg-gradient-to-br from-violet-50 to-purple-100/80 border-violet-200 hover:border-violet-300',
      iconBox: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xs',
      labelColor: 'text-violet-900/80',
      valueColor: 'text-violet-800',
      subColor: 'text-violet-800/75',
    },
    {
      label: 'Kehadiran Bulan Ini',
      value: `${monthAttendanceStats.pct}%`,
      sub: `${monthAttendanceStats.hadir} dari ${monthAttendanceStats.total} presensi hadir`,
      tab: 'rekap',
      icon: ClipboardCheck,
      cardBg: 'bg-gradient-to-br from-emerald-50 to-teal-100/80 border-emerald-200 hover:border-emerald-300',
      iconBox: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs',
      labelColor: 'text-emerald-900/80',
      valueColor: 'text-emerald-700',
      subColor: 'text-emerald-800/75',
    },
    {
      label: 'Catatan Pembelajaran',
      value: state.notes.length,
      sub: 'Jurnal & refleksi guru tersimpan',
      tab: 'catatan',
      icon: NotebookPen,
      cardBg: 'bg-gradient-to-br from-amber-50 to-orange-100/80 border-amber-200 hover:border-amber-300',
      iconBox: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xs',
      labelColor: 'text-amber-900/80',
      valueColor: 'text-amber-800',
      subColor: 'text-amber-800/75',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Intro */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard Administrasi Guru
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {formatIndonesianDate(todayISO)} · Tahun Ajaran Aktif · Sekolah 5 Hari Kerja
            </p>
          </div>
        </div>
        <motion.button
          type="button"
          whileHover={shouldReduceMotion ? undefined : { y: -1 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          onClick={() => onNavigate('pengaturan')}
          className="px-4 py-2 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/80 text-xs font-semibold text-indigo-700 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
        >
          Kelola Profil & Libur Sekolah
        </motion.button>
      </div>

      {/* Quick Stats Card */}
      <section
        aria-label="Quick Stats"
        className="bg-gradient-to-br from-blue-50/80 via-white to-emerald-50/70 border border-blue-200/80 rounded-xl p-5 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-blue-100/80">
          <div>
            <h2 className="text-base font-bold text-slate-900">Quick Stats</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Ringkasan cepat jumlah siswa, kelas aktif, dan total jam mengajar hari ini ({todayDayName})
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-blue-700 tabular-nums">
            {formatIndonesianDate(todayISO)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            whileHover={shouldReduceMotion ? undefined : { y: -2 }}
            transition={{ duration: 0.16 }}
            className="rounded-xl bg-gradient-to-br from-sky-50 to-blue-100/70 border border-sky-200 p-4 flex items-start justify-between gap-3"
          >
            <div>
              <div className="text-xs font-semibold text-sky-900/80">
                Total Siswa
              </div>
              <div className="mt-1.5 text-3xl font-bold text-sky-950 font-mono tabular-nums">
                {state.students.length}
              </div>
              <button
                type="button"
                onClick={() => onNavigate('siswa')}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 cursor-pointer"
              >
                <span>Lihat Database Siswa</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-4.5 h-4.5" />
            </div>
          </motion.div>

          <motion.div
            whileHover={shouldReduceMotion ? undefined : { y: -2 }}
            transition={{ duration: 0.16 }}
            className="rounded-xl bg-gradient-to-br from-violet-50 to-indigo-100/70 border border-violet-200 p-4 flex items-start justify-between gap-3"
          >
            <div>
              <div className="text-xs font-semibold text-violet-900/80">
                Jumlah Kelas
              </div>
              <div className="mt-1.5 text-3xl font-bold text-violet-950 font-mono tabular-nums">
                {uniqueClasses.length}
              </div>
              <div className="mt-1.5 text-xs text-violet-800/80 truncate max-w-[240px]">
                {uniqueClasses.length > 0
                  ? uniqueClasses.join(', ')
                  : 'Belum ada kelas terdaftar'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Layers className="w-4.5 h-4.5" />
            </div>
          </motion.div>

          <motion.div
            whileHover={shouldReduceMotion ? undefined : { y: -2 }}
            transition={{ duration: 0.16 }}
            className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100/70 border border-emerald-200 p-4 flex items-start justify-between gap-3"
          >
            <div>
              <div className="text-xs font-semibold text-emerald-900/80">
                Total Jam Mengajar Hari Ini
              </div>
              <div className="mt-1.5 text-3xl font-bold text-emerald-800 font-mono tabular-nums">
                {todayScheduleStats.hoursLabel}
              </div>
              <div className="mt-1.5 text-xs text-emerald-800/80">
                {todayScheduleStats.subLabel}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4-Column Interactive Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.label}
              type="button"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: i * 0.04,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={shouldReduceMotion ? undefined : { y: -3 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              onClick={() => onNavigate(card.tab)}
              className={`text-left border rounded-xl p-4 transition-colors cursor-pointer ${card.cardBg}`}
            >
              <div className={`flex items-center justify-between text-xs font-semibold ${card.labelColor}`}>
                <span>{card.label}</span>
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.iconBox}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
              </div>
              <div
                className={`mt-2 text-2xl font-bold tabular-nums font-mono ${card.valueColor}`}
              >
                {card.value}
              </div>
              <div className={`mt-1 text-xs ${card.subColor}`}>{card.sub}</div>
            </motion.button>
          );
        })}
      </div>

      {/* 2 Profiles Grid: Profil Sekolah & Profil Guru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Profil Sekolah */}
        <section className="bg-gradient-to-br from-blue-50/85 via-white to-sky-50/75 border border-blue-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-blue-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
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

            <dl className="mt-5 divide-y divide-slate-100 text-sm">
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
                <dt className="text-slate-500 font-medium">Status Akreditasi</dt>
                <dd className="sm:col-span-2 font-semibold text-slate-900">
                  {schoolProfile.statusAkreditasi}
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
        <section className="bg-gradient-to-br from-indigo-50/85 via-white to-violet-50/75 border border-indigo-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-indigo-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
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

            <div className="mt-5 flex flex-col sm:flex-row gap-5 items-start">
              <motion.div
                whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-indigo-200 bg-slate-100 shrink-0 flex items-center justify-center shadow-xs"
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

              <dl className="flex-1 w-full divide-y divide-indigo-100/70 text-sm">
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

      {/* Informasi Jadwal Mengajar */}
      <section className="bg-gradient-to-br from-teal-50/60 via-white to-blue-50/40 border border-teal-200/80 rounded-xl p-6">
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
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              {(['Semua', ...WORKING_DAYS] as const).map((day) => {
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`relative px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
                        className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xs"
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
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
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
                    className="hover:bg-blue-50/40 transition-colors"
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
