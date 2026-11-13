import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Plus,
  Download,
  Upload,
  Trash2,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { ScheduleItem, WorkingDay } from '../types';
import { WORKING_DAYS } from '../utils/dateUtils';
import {
  downloadExcelTemplate,
  exportArrayToExcel,
  parseExcelFile,
} from '../utils/excel';

interface SchedulePageProps {
  schedules: ScheduleItem[];
  subjects: string[];
  classes: string[];
  onAddSchedule: (item: Omit<ScheduleItem, 'id'>) => void;
  onBulkAddSchedules: (items: Omit<ScheduleItem, 'id'>[]) => number;
  onDeleteSchedule: (id: string) => void;
  onBulkDeleteSchedules: (ids: string[]) => void;
}

const DAY_TEXT_COLOR: Record<WorkingDay, string> = {
  Senin: 'text-blue-700',
  Selasa: 'text-teal-700',
  Rabu: 'text-violet-700',
  Kamis: 'text-amber-700',
  Jumat: 'text-emerald-700',
};

export const SchedulePage: React.FC<SchedulePageProps> = ({
  schedules,
  subjects,
  classes,
  onAddSchedule,
  onBulkAddSchedules,
  onDeleteSchedule,
  onBulkDeleteSchedules,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [hari, setHari] = useState<WorkingDay>('Senin');
  const [jamKe, setJamKe] = useState('1-2');
  const [jamMulai, setJamMulai] = useState('07:00');
  const [jamSelesai, setJamSelesai] = useState('08:30');
  const [kelas, setKelas] = useState(classes[0] || 'XI-A');
  const [mataPelajaran, setMataPelajaran] = useState(
    subjects[0] || 'Matematika'
  );

  const [filterHari, setFilterHari] = useState<string>('Semua');
  const [filterJamKe, setFilterJamKe] = useState<string>('Semua');
  const [filterKelas, setFilterKelas] = useState<string>('Semua');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!showAddForm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddForm(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showAddForm]);

  const allClasses = useMemo(() => {
    const combined = new Set([
      ...classes,
      ...schedules.map((s) => s.kelas),
    ]);
    return Array.from(combined).sort();
  }, [classes, schedules]);

  const allJamKe = useMemo(() => {
    return Array.from(new Set(schedules.map((s) => s.jamKe))).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    return schedules
      .filter((s) => {
        const mHari = filterHari === 'Semua' || s.hari === filterHari;
        const mJam = filterJamKe === 'Semua' || s.jamKe === filterJamKe;
        const mKelas = filterKelas === 'Semua' || s.kelas === filterKelas;
        return mHari && mJam && mKelas;
      })
      .sort((a, b) => {
        const dDiff =
          WORKING_DAYS.indexOf(a.hari) - WORKING_DAYS.indexOf(b.hari);
        if (dDiff !== 0) return dDiff;
        return a.jamKe.localeCompare(b.jamKe, undefined, { numeric: true });
      });
  }, [schedules, filterHari, filterJamKe, filterKelas]);

  const allFilteredSelected =
    filteredSchedules.length > 0 &&
    filteredSchedules.every((s) => selectedIds.includes(s.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const fSet = new Set(filteredSchedules.map((s) => s.id));
      setSelectedIds((prev) => prev.filter((id) => !fSet.has(id)));
    } else {
      setSelectedIds(
        Array.from(
          new Set([...selectedIds, ...filteredSchedules.map((s) => s.id)])
        )
      );
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !jamKe.trim() ||
      !jamMulai ||
      !jamSelesai ||
      !kelas.trim() ||
      !mataPelajaran.trim()
    ) {
      setFeedback({
        type: 'error',
        message: 'Harap lengkapi seluruh kolom jadwal mengajar.',
      });
      return;
    }

    onAddSchedule({
      hari,
      jamKe: jamKe.trim(),
      waktu: `${jamMulai} - ${jamSelesai}`,
      kelas: kelas.trim(),
      mataPelajaran: mataPelajaran.trim(),
    });
    setShowAddForm(false);
    setFeedback({
      type: 'success',
      message: `Jadwal ${hari} Jam ke-${jamKe.trim()} (${kelas.trim()}) berhasil ditambahkan.`,
    });
  };

  const handleDownloadTemplate = () => {
    downloadExcelTemplate(
      'Template_Jadwal_Mengajar.xlsx',
      'Jadwal Mengajar',
      ['Hari', 'Jam Ke', 'Waktu', 'Kelas', 'Mata Pelajaran'],
      [
        ['Senin', '1-2', '07:00 - 08:30', 'XI-A', 'Matematika'],
        ['Selasa', '3-4', '08:30 - 10:00', 'XII-A', 'Matematika Tingkat Lanjut'],
      ]
    );
  };

  const handleExportExcel = () => {
    const rows: (string | number)[][] = [
      ['Hari', 'Jam Ke', 'Waktu', 'Kelas', 'Mata Pelajaran'],
      ...filteredSchedules.map((s) => [
        s.hari,
        s.jamKe,
        s.waktu,
        s.kelas,
        s.mataPelajaran,
      ]),
    ];
    exportArrayToExcel('Jadwal_Mengajar.xlsx', 'Jadwal Mengajar', rows);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rawRows = await parseExcelFile(file);
      const parsed: Omit<ScheduleItem, 'id'>[] = [];

      rawRows.forEach((row) => {
        const entries = Object.entries(row).reduce<Record<string, string>>(
          (acc, [k, v]) => {
            acc[k.trim().toLowerCase()] = String(v ?? '').trim();
            return acc;
          },
          {}
        );

        const rawHari = entries['hari'] || '';
        const normalizedHari = WORKING_DAYS.find(
          (d) => d.toLowerCase() === rawHari.toLowerCase()
        );
        const rowJamKe = entries['jam ke'] || entries['jam'] || '';
        const rowWaktu = entries['waktu'] || entries['jam pelajaran'] || '';
        const rowKelas = entries['kelas'] || entries['mengajar di kelas'] || '';
        const rowMapel = entries['mata pelajaran'] || entries['mapel'] || '';

        if (normalizedHari && rowJamKe && rowWaktu && rowKelas && rowMapel) {
          parsed.push({
            hari: normalizedHari,
            jamKe: rowJamKe,
            waktu: rowWaktu,
            kelas: rowKelas,
            mataPelajaran: rowMapel,
          });
        }
      });

      if (parsed.length === 0) {
        setFeedback({
          type: 'error',
          message:
            'Tidak ada baris jadwal valid. Pastikan kolom: Hari (Senin-Jumat), Jam Ke, Waktu, Kelas, Mata Pelajaran.',
        });
      } else {
        const count = onBulkAddSchedules(parsed);
        setFeedback({
          type: 'success',
          message: `Berhasil mengimpor ${count} jadwal mengajar dari Excel.`,
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Gagal memproses file Excel. Pastikan format file valid.',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    onBulkDeleteSchedules(selectedIds);
    setSelectedIds([]);
    setFeedback({
      type: 'success',
      message: `${count} jadwal mengajar terpilih berhasil dihapus.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Jadwal Mengajar
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Atur jadwal mengajar 5 hari kerja (Senin – Jumat) · Terhubung ke Absen & Catatan Guru
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-violet-600" />
            <span>Template Excel</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-purple-600" />
            <span>Import Excel</span>
          </motion.button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileImport}
            className="hidden"
          />

          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Jadwal</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs font-semibold shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jadwal</span>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-semibold underline cursor-pointer"
            >
              Tutup
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Floating Modal Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/50 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="jadwal-modal-title"
            onClick={() => setShowAddForm(false)}
          >
            <motion.form
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.95, y: 12 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.96, y: 8 }
              }
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              onSubmit={handleManualSubmit}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl"
            >
              <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <h2
                    id="jadwal-modal-title"
                    className="text-base font-bold text-slate-900"
                  >
                    Tambah Jadwal Mengajar
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Atur hari kerja, jam pelajaran, kelas, dan mata pelajaran
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  aria-label="Tutup form jadwal"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Hari
                    </label>
                    <select
                      value={hari}
                      onChange={(e) => setHari(e.target.value as WorkingDay)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/20 focus:border-violet-600"
                    >
                      {WORKING_DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Jam Ke
                    </label>
                    <input
                      type="text"
                      value={jamKe}
                      onChange={(e) => setJamKe(e.target.value)}
                      placeholder="Contoh: 1 atau 1-2"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-600/20 focus:border-violet-600"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Jam Mulai
                    </label>
                    <input
                      type="time"
                      value={jamMulai}
                      onChange={(e) => setJamMulai(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-600/20 focus:border-violet-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Jam Selesai
                    </label>
                    <input
                      type="time"
                      value={jamSelesai}
                      onChange={(e) => setJamSelesai(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-600/20 focus:border-violet-600"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mengajar di Kelas
                    </label>
                    <input
                      type="text"
                      value={kelas}
                      onChange={(e) => setKelas(e.target.value)}
                      list="schedule-classes"
                      placeholder="Contoh: XI-A"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/20 focus:border-violet-600"
                      required
                    />
                    <datalist id="schedule-classes">
                      {allClasses.map((k) => (
                        <option key={k} value={k} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mata Pelajaran
                    </label>
                    <input
                      type="text"
                      value={mataPelajaran}
                      onChange={(e) => setMataPelajaran(e.target.value)}
                      list="schedule-subjects"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/20 focus:border-violet-600"
                      required
                    />
                    <datalist id="schedule-subjects">
                      {subjects.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <motion.button
                  type="submit"
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Simpan Jadwal
                </motion.button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Bar & Table */}
      <div className="bg-gradient-to-b from-violet-50/40 via-white to-white border border-violet-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-violet-50/80 via-purple-50/50 to-white border-b border-violet-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterHari}
              onChange={(e) => setFilterHari(e.target.value)}
              aria-label="Filter Hari"
              className="h-9 px-3 rounded-lg border border-violet-200 bg-white text-sm text-slate-700"
            >
              <option value="Semua">Semua Hari</option>
              {WORKING_DAYS.map((d) => (
                <option key={d} value={d}>
                  Hari {d}
                </option>
              ))}
            </select>

            <select
              value={filterJamKe}
              onChange={(e) => setFilterJamKe(e.target.value)}
              aria-label="Filter Jam Ke"
              className="h-9 px-3 rounded-lg border border-violet-200 bg-white text-sm text-slate-700"
            >
              <option value="Semua">Semua Jam Ke</option>
              {allJamKe.map((j) => (
                <option key={j} value={j}>
                  Jam ke-{j}
                </option>
              ))}
            </select>

            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              aria-label="Filter Kelas"
              className="h-9 px-3 rounded-lg border border-violet-200 bg-white text-sm text-slate-700"
            >
              <option value="Semua">Semua Kelas</option>
              {allClasses.map((k) => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 tabular-nums">
              {filteredSchedules.length} jadwal ditemukan
            </span>
            {selectedIds.length > 0 && (
              <motion.button
                type="button"
                initial={shouldReduceMotion ? false : { scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                onClick={handleDeleteSelected}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Jadwal Terpilih ({selectedIds.length})</span>
              </motion.button>
            )}
          </div>
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <CalendarClock className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Tidak ada jadwal mengajar pada filter ini
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Ubah filter Hari, Jam Ke, atau Kelas, atau tambahkan jadwal baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 pl-4 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      aria-label="Pilih semua jadwal"
                      className="w-4 h-4 rounded border-slate-300 text-violet-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 w-12">No</th>
                  <th className="py-3 px-4">Hari</th>
                  <th className="py-3 px-4">Jam Ke</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Mengajar di Kelas</th>
                  <th className="py-3 px-4">Mata Pelajaran</th>
                  <th className="py-3 pl-4 pr-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedules.map((sch, idx) => {
                  const checked = selectedIds.includes(sch.id);
                  return (
                    <tr
                      key={sch.id}
                      className={`transition-colors ${
                        checked ? 'bg-violet-50/80' : 'hover:bg-violet-50/40'
                      }`}
                    >
                      <td className="py-2.5 pl-4 pr-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectOne(sch.id)}
                          aria-label={`Pilih jadwal ${sch.hari} ${sch.kelas}`}
                          className="w-4 h-4 rounded border-slate-300 text-violet-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-500 tabular-nums">
                        {idx + 1}
                      </td>
                      <td
                        className={`py-2.5 px-4 font-bold whitespace-nowrap ${
                          DAY_TEXT_COLOR[sch.hari]
                        }`}
                      >
                        {sch.hari}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        Jam ke-{sch.jamKe}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {sch.waktu}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-violet-700 whitespace-nowrap">
                        {sch.kelas}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800">
                        {sch.mataPelajaran}
                      </td>
                      <td className="py-2.5 pl-4 pr-4 text-right whitespace-nowrap">
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                          onClick={() => {
                            onDeleteSchedule(sch.id);
                            setSelectedIds((prev) =>
                              prev.filter((id) => id !== sch.id)
                            );
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </motion.button>
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
