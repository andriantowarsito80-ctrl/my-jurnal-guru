import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Download, Search, Table2 } from 'lucide-react';
import {
  AttendanceMap,
  AttendanceStatus,
  HolidayItem,
  Student,
} from '../types';
import {
  MONTH_NAMES_ID,
  getDaysInMonth,
  getHolidayInfo,
} from '../utils/dateUtils';
import { exportArrayToExcel } from '../utils/excel';

interface AttendanceRecapPageProps {
  students: Student[];
  attendance: AttendanceMap;
  holidays: HolidayItem[];
  onCycleAttendance: (
    dateISO: string,
    studentId: string,
    nextStatus: AttendanceStatus | null
  ) => void;
}

const STATUS_SHORT: Record<AttendanceStatus, string> = {
  Hadir: 'H',
  Izin: 'I',
  Sakit: 'S',
  Alpa: 'A',
};

const STATUS_CELL_STYLE: Record<AttendanceStatus, string> = {
  Hadir: 'text-emerald-700 bg-emerald-50/80 font-bold hover:bg-emerald-100',
  Izin: 'text-blue-700 bg-blue-50/80 font-bold hover:bg-blue-100',
  Sakit: 'text-amber-700 bg-amber-50/80 font-bold hover:bg-amber-100',
  Alpa: 'text-red-700 bg-red-100/80 font-bold hover:bg-red-200/80',
};

const CYCLE_ORDER: (AttendanceStatus | null)[] = [
  'Hadir',
  'Izin',
  'Sakit',
  'Alpa',
  null,
];

export const AttendanceRecapPage: React.FC<AttendanceRecapPageProps> = ({
  students,
  attendance,
  holidays,
  onCycleAttendance,
}) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [filterKelas, setFilterKelas] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const shouldReduceMotion = useReducedMotion();

  const uniqueClasses = useMemo(
    () => Array.from(new Set(students.map((s) => s.kelas))).sort(),
    [students]
  );

  const monthDays = useMemo(
    () => getDaysInMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students
      .filter((s) => {
        const mKelas = filterKelas === 'Semua' || s.kelas === filterKelas;
        const mSearch =
          !q ||
          s.nama.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q);
        return mKelas && mSearch;
      })
      .sort((a, b) =>
        a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' })
      );
  }, [students, filterKelas, searchQuery]);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  const handleCellClick = (
    dateISO: string,
    studentId: string,
    isHoliday: boolean
  ) => {
    if (isHoliday) return;
    const current = attendance[`${dateISO}::${studentId}`] ?? null;
    const idx = CYCLE_ORDER.indexOf(current);
    const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
    onCycleAttendance(dateISO, studentId, next);
  };

  const handleExportExcel = () => {
    const headerRow = [
      'No',
      'NIS',
      'Nama Siswa',
      'Kelas',
      ...monthDays.map((d) => `${d.day} (${d.shortDay})`),
      'Hadir',
      'Izin',
      'Sakit',
      'Alpa',
      'Persentase (%)',
    ];

    const dataRows = filteredStudents.map((st, idx) => {
      let h = 0,
        i = 0,
        s = 0,
        a = 0;
      const dayCells = monthDays.map((d) => {
        const hInfo = getHolidayInfo(d.dateISO, holidays);
        if (hInfo.isHoliday) return 'LIBUR';
        const status = attendance[`${d.dateISO}::${st.id}`];
        if (status === 'Hadir') {
          h++;
          return 'H';
        }
        if (status === 'Izin') {
          i++;
          return 'I';
        }
        if (status === 'Sakit') {
          s++;
          return 'S';
        }
        if (status === 'Alpa') {
          a++;
          return 'A';
        }
        return '-';
      });
      const totalFilled = h + i + s + a;
      const pct = totalFilled > 0 ? Math.round((h / totalFilled) * 100) : 0;
      return [idx + 1, st.nis, st.nama, st.kelas, ...dayCells, h, i, s, a, pct];
    });

    exportArrayToExcel(
      `Rekap_Kehadiran_${MONTH_NAMES_ID[selectedMonth]}_${selectedYear}.xlsx`,
      'Rekap Kehadiran',
      [headerRow, ...dataRows]
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Table2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Rekap Kehadiran Siswa
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tampilan spreadsheet bulan {MONTH_NAMES_ID[selectedMonth]} {selectedYear} · Terhubung langsung dengan Absen Siswa
            </p>
          </div>
        </div>

        <motion.button
          type="button"
          whileHover={shouldReduceMotion ? undefined : { y: -1 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
          onClick={handleExportExcel}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Excel (.xlsx)</span>
        </motion.button>
      </div>

      {/* Filters & Legend */}
      <div className="bg-white border border-slate-200/80 rounded-[24px] p-4 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.08)] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-teal-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama / NIS..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-teal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
            />
          </div>

          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            aria-label="Filter Kelas"
            className="h-9 px-3 rounded-lg border border-teal-200 bg-white text-sm text-slate-700"
          >
            <option value="Semua">Semua Kelas</option>
            {uniqueClasses.map((k) => (
              <option key={k} value={k}>
                Kelas {k}
              </option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            aria-label="Pilih Bulan"
            className="h-9 px-3 rounded-lg border border-teal-200 bg-white text-sm text-slate-700"
          >
            {MONTH_NAMES_ID.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            aria-label="Pilih Tahun"
            className="h-9 px-3 rounded-lg border border-teal-200 bg-white text-sm font-mono text-slate-700"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span>Klik sel tanggal aktif untuk ubah cepat:</span>
          <span className="font-mono font-bold text-emerald-700">H = Hadir</span>
          <span className="text-slate-300">·</span>
          <span className="font-mono font-bold text-blue-700">I = Izin</span>
          <span className="text-slate-300">·</span>
          <span className="font-mono font-bold text-amber-700">S = Sakit</span>
          <span className="text-slate-300">·</span>
          <span className="font-mono font-bold text-red-700">A = Alpa</span>
          <span className="text-slate-300">·</span>
          <span className="font-semibold text-red-700">
            Kolom Merah = Libur
          </span>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="bg-white border border-slate-200/80 rounded-[24px] shadow-[0_8px_28px_-18px_rgba(15,23,42,0.08)] overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="py-14 text-center">
            <Table2 className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Tidak ada siswa ditemukan
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto spreadsheet-scroll max-h-[640px]">
            <table className="border-collapse text-xs w-max min-w-full">
              <thead className="sticky top-0 z-20 bg-slate-100">
                <tr>
                  <th className="sticky left-0 z-30 bg-slate-100 border-b border-r border-slate-300 px-2.5 py-2.5 text-center font-semibold text-slate-700 w-10">
                    No
                  </th>
                  <th className="sticky left-[40px] z-30 bg-slate-100 border-b border-r border-slate-300 px-3 py-2.5 text-left font-semibold text-slate-700 min-w-[98px]">
                    NIS
                  </th>
                  <th className="sticky left-[138px] z-30 bg-slate-100 border-b border-r border-slate-300 px-3 py-2.5 text-left font-semibold text-slate-700 min-w-[190px]">
                    Nama Siswa
                  </th>
                  <th className="border-b border-r border-slate-300 px-3 py-2.5 text-center font-semibold text-slate-700 min-w-[68px] bg-slate-100">
                    Kelas
                  </th>

                  {monthDays.map((d) => {
                    const hInfo = getHolidayInfo(d.dateISO, holidays);
                    const isRed = d.isWeekend || hInfo.isHoliday;
                    return (
                      <th
                        key={d.dateISO}
                        title={
                          hInfo.label ||
                          `${d.dayName}, ${d.day} ${MONTH_NAMES_ID[selectedMonth]}`
                        }
                        className={`border-b border-r border-slate-300 px-1 py-1.5 text-center min-w-[34px] select-none ${
                          isRed
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="font-mono font-bold tabular-nums leading-tight">
                          {d.day}
                        </div>
                        <div
                          className={`text-[10px] font-medium leading-tight ${
                            isRed ? 'text-red-100' : 'text-slate-500'
                          }`}
                        >
                          {d.shortDay}
                        </div>
                      </th>
                    );
                  })}

                  <th className="border-b border-r border-slate-300 px-2.5 py-2.5 text-center font-bold text-emerald-700 bg-emerald-50 min-w-[38px]">
                    H
                  </th>
                  <th className="border-b border-r border-slate-300 px-2.5 py-2.5 text-center font-bold text-blue-700 bg-blue-50 min-w-[38px]">
                    I
                  </th>
                  <th className="border-b border-r border-slate-300 px-2.5 py-2.5 text-center font-bold text-amber-700 bg-amber-50 min-w-[38px]">
                    S
                  </th>
                  <th className="border-b border-r border-slate-300 px-2.5 py-2.5 text-center font-bold text-red-700 bg-red-50 min-w-[38px]">
                    A
                  </th>
                  <th className="border-b border-slate-300 px-3 py-2.5 text-center font-bold text-teal-800 bg-teal-50 min-w-[56px]">
                    %
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((st, idx) => {
                  let countH = 0;
                  let countI = 0;
                  let countS = 0;
                  let countA = 0;

                  const dayCells = monthDays.map((d) => {
                    const hInfo = getHolidayInfo(d.dateISO, holidays);
                    const isRed = d.isWeekend || hInfo.isHoliday;
                    const status = attendance[`${d.dateISO}::${st.id}`];

                    if (!isRed) {
                      if (status === 'Hadir') countH++;
                      else if (status === 'Izin') countI++;
                      else if (status === 'Sakit') countS++;
                      else if (status === 'Alpa') countA++;
                    }

                    return (
                      <td
                        key={d.dateISO}
                        onClick={() => handleCellClick(d.dateISO, st.id, isRed)}
                        title={
                          isRed
                            ? hInfo.label || 'Hari Libur'
                            : `${st.nama} · ${d.dateISO} (klik untuk ubah)`
                        }
                        className={`border-b border-r border-slate-200 text-center font-mono tabular-nums select-none transition-colors ${
                          isRed
                            ? 'bg-red-100 text-red-700 font-semibold cursor-not-allowed'
                            : status
                            ? `${STATUS_CELL_STYLE[status]} cursor-pointer active:scale-95`
                            : 'bg-white text-slate-300 cursor-pointer hover:bg-teal-50/70 hover:text-teal-700 active:scale-95'
                        }`}
                      >
                        {isRed ? 'L' : status ? STATUS_SHORT[status] : '·'}
                      </td>
                    );
                  });

                  const totalRecorded = countH + countI + countS + countA;
                  const pct =
                    totalRecorded > 0
                      ? Math.round((countH / totalRecorded) * 100)
                      : 0;
                  const pctStyle =
                    totalRecorded === 0
                      ? 'text-slate-500 bg-slate-50'
                      : pct >= 85
                      ? 'text-emerald-700 bg-emerald-50/70'
                      : pct >= 70
                      ? 'text-teal-700 bg-teal-50/70'
                      : 'text-amber-700 bg-amber-50/70';

                  return (
                    <tr key={st.id} className="group hover:bg-teal-50/30">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-teal-50/40 border-b border-r border-slate-200 px-2.5 py-2 text-center font-mono text-slate-500 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="sticky left-[40px] z-10 bg-white group-hover:bg-teal-50/40 border-b border-r border-slate-200 px-3 py-2 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {st.nis}
                      </td>
                      <td className="sticky left-[138px] z-10 bg-white group-hover:bg-teal-50/40 border-b border-r border-slate-200 px-3 py-2 font-semibold text-slate-900 whitespace-nowrap">
                        {st.nama}
                      </td>
                      <td className="border-b border-r border-slate-200 px-3 py-2 text-center font-medium text-teal-700 whitespace-nowrap">
                        {st.kelas}
                      </td>

                      {dayCells}

                      <td className="border-b border-r border-slate-200 px-2 py-2 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40 tabular-nums">
                        {countH}
                      </td>
                      <td className="border-b border-r border-slate-200 px-2 py-2 text-center font-mono font-bold text-blue-700 bg-blue-50/40 tabular-nums">
                        {countI}
                      </td>
                      <td className="border-b border-r border-slate-200 px-2 py-2 text-center font-mono font-bold text-amber-700 bg-amber-50/40 tabular-nums">
                        {countS}
                      </td>
                      <td className="border-b border-r border-slate-200 px-2 py-2 text-center font-mono font-bold text-red-700 bg-red-50/40 tabular-nums">
                        {countA}
                      </td>
                      <td
                        className={`border-b border-slate-200 px-2.5 py-2 text-center font-mono font-bold tabular-nums ${pctStyle}`}
                      >
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
