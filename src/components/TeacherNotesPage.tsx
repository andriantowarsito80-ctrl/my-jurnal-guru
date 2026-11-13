import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Plus,
  Trash2,
  NotebookPen,
  Search,
  Download,
  Edit3,
  X,
} from 'lucide-react';
import { ScheduleItem, TeacherNote } from '../types';
import {
  formatIndonesianDate,
  getDayNameFromISO,
  toLocalDateISO,
} from '../utils/dateUtils';
import { exportArrayToExcel } from '../utils/excel';

interface TeacherNotesPageProps {
  notes: TeacherNote[];
  schedules: ScheduleItem[];
  onAddNote: (note: Omit<TeacherNote, 'id'>) => void;
  onUpdateNote: (note: TeacherNote) => void;
  onDeleteNote: (id: string) => void;
}

const NOTE_CARD_PALETTES = [
  'bg-gradient-to-br from-amber-50/90 via-white to-orange-50/70 border-amber-200 hover:border-amber-300',
  'bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/70 border-sky-200 hover:border-sky-300',
  'bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 border-emerald-200 hover:border-emerald-300',
  'bg-gradient-to-br from-violet-50/90 via-white to-purple-50/70 border-violet-200 hover:border-violet-300',
  'bg-gradient-to-br from-rose-50/90 via-white to-pink-50/70 border-rose-200 hover:border-rose-300',
];

export const TeacherNotesPage: React.FC<TeacherNotesPageProps> = ({
  notes,
  schedules,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [tanggal, setTanggal] = useState(() => toLocalDateISO(new Date()));
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    schedules[0]?.id || ''
  );
  const [materi, setMateri] = useState('');
  const [kegiatan, setKegiatan] = useState('');
  const [catatan, setCatatan] = useState('');

  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterMapel, setFilterMapel] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const shouldReduceMotion = useReducedMotion();

  const dayName = getDayNameFromISO(tanggal);

  const matchingSchedules = useMemo(() => {
    const dayMatches = schedules.filter((s) => s.hari === dayName);
    return dayMatches.length > 0 ? dayMatches : schedules;
  }, [schedules, dayName]);

  const activeSchedule = useMemo(() => {
    return (
      schedules.find((s) => s.id === selectedScheduleId) ||
      matchingSchedules[0] ||
      schedules[0]
    );
  }, [schedules, selectedScheduleId, matchingSchedules]);

  const uniqueClasses = useMemo(
    () =>
      Array.from(
        new Set([
          ...schedules.map((s) => s.kelas),
          ...notes.map((n) => n.kelas),
        ])
      ).sort(),
    [schedules, notes]
  );

  const uniqueSubjects = useMemo(
    () =>
      Array.from(
        new Set([
          ...schedules.map((s) => s.mataPelajaran),
          ...notes.map((n) => n.mataPelajaran),
        ])
      ).sort(),
    [schedules, notes]
  );

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...notes]
      .filter((n) => {
        const mKelas = filterKelas === 'Semua' || n.kelas === filterKelas;
        const mMapel =
          filterMapel === 'Semua' || n.mataPelajaran === filterMapel;
        const mSearch =
          !q ||
          n.materi.toLowerCase().includes(q) ||
          n.kegiatan.toLowerCase().includes(q) ||
          n.catatan.toLowerCase().includes(q);
        return mKelas && mMapel && mSearch;
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [notes, filterKelas, filterMapel, searchQuery]);

  const handleDateChange = (newDate: string) => {
    setTanggal(newDate);
    const dName = getDayNameFromISO(newDate);
    const match = schedules.find((s) => s.hari === dName);
    if (match) {
      setSelectedScheduleId(match.id);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setMateri('');
    setKegiatan('');
    setCatatan('');
    setShowForm(false);
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setTanggal(toLocalDateISO(new Date()));
    setMateri('');
    setKegiatan('');
    setCatatan('');
    setShowForm(true);
  };

  useEffect(() => {
    if (!showForm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resetForm();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showForm]);

  const handleStartEdit = (note: TeacherNote) => {
    setEditingId(note.id);
    setTanggal(note.tanggal);
    const matchedSch = schedules.find(
      (s) =>
        s.hari === note.hari &&
        s.kelas === note.kelas &&
        s.jamKe === note.jamKe
    );
    if (matchedSch) setSelectedScheduleId(matchedSch.id);
    setMateri(note.materi);
    setKegiatan(note.kegiatan);
    setCatatan(note.catatan);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materi.trim() || !kegiatan.trim()) return;

    const payload: Omit<TeacherNote, 'id'> = {
      tanggal,
      hari: activeSchedule ? activeSchedule.hari : dayName,
      jamKe: activeSchedule ? activeSchedule.jamKe : '-',
      waktu: activeSchedule ? activeSchedule.waktu : '-',
      kelas: activeSchedule ? activeSchedule.kelas : '-',
      mataPelajaran: activeSchedule ? activeSchedule.mataPelajaran : '-',
      materi: materi.trim(),
      kegiatan: kegiatan.trim(),
      catatan: catatan.trim(),
    };

    if (editingId) {
      onUpdateNote({ id: editingId, ...payload });
    } else {
      onAddNote(payload);
    }
    resetForm();
  };

  const handleExport = () => {
    const rows: (string | number)[][] = [
      [
        'Tanggal',
        'Hari',
        'Jam Ke',
        'Waktu',
        'Kelas',
        'Mata Pelajaran',
        'Materi Pelajaran',
        'Kegiatan Pembelajaran',
        'Catatan Guru',
      ],
      ...filteredNotes.map((n) => [
        n.tanggal,
        n.hari,
        n.jamKe,
        n.waktu,
        n.kelas,
        n.mataPelajaran,
        n.materi,
        n.kegiatan,
        n.catatan,
      ]),
    ];
    exportArrayToExcel('Catatan_Guru.xlsx', 'Catatan Guru', rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <NotebookPen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Catatan Guru
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Jurnal mengajar terintegrasi dengan jadwal mengajar, materi, kegiatan, dan refleksi kelas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>Export Excel</span>
          </motion.button>
          <motion.button
            type="button"
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-semibold shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Catatan</span>
          </motion.button>
        </div>
      </div>

      {/* Animated Floating Modal Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/50 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catatan-modal-title"
            onClick={resetForm}
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
              onSubmit={handleSubmit}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-[24px] shadow-2xl"
            >
              <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <h2
                    id="catatan-modal-title"
                    className="text-base font-bold text-slate-900"
                  >
                    {editingId
                      ? 'Edit Catatan Guru'
                      : 'Tambah Catatan Pembelajaran'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Waktu dan hari otomatis disinkronkan dengan jadwal mengajar
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  aria-label="Tutup form catatan"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Tanggal Pembelajaran
                    </label>
                    <input
                      type="date"
                      value={tanggal}
                      onChange={(e) =>
                        e.target.value && handleDateChange(e.target.value)
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600"
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Hari terdeteksi: <strong>{dayName}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Pilih Slot Jadwal Mengajar (Waktu & Hari Sesuai Jadwal)
                    </label>
                    <select
                      value={activeSchedule?.id || ''}
                      onChange={(e) => setSelectedScheduleId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600"
                    >
                      {schedules.map((sch) => (
                        <option key={sch.id} value={sch.id}>
                          {sch.hari} · Jam {sch.jamKe} ({sch.waktu}) · {sch.kelas}{' '}
                          · {sch.mataPelajaran}
                        </option>
                      ))}
                    </select>
                    {activeSchedule && (
                      <p className="mt-1 text-xs text-amber-700 font-medium">
                        Terpilih: {activeSchedule.hari}, Jam ke-
                        {activeSchedule.jamKe} ({activeSchedule.waktu}) · Kelas{' '}
                        {activeSchedule.kelas}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Materi Pelajaran
                  </label>
                  <input
                    type="text"
                    value={materi}
                    onChange={(e) => setMateri(e.target.value)}
                    placeholder="Contoh: Matriks — Invers dan Penyelesaian SPLDV"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Kegiatan Pembelajaran
                    </label>
                    <textarea
                      rows={4}
                      value={kegiatan}
                      onChange={(e) => setKegiatan(e.target.value)}
                      placeholder="Deskripsikan metode dan aktivitas siswa selama kelas berlangsung..."
                      className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Catatan Guru
                    </label>
                    <textarea
                      rows={4}
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Refleksi, kendala, siswa yang perlu bimbingan khusus, atau tindak lanjut..."
                      className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5 rounded-b-xl">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <motion.button
                  type="submit"
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {editingId ? 'Simpan Perubahan' : 'Simpan Catatan'}
                </motion.button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-[24px] p-4 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.08)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari materi, kegiatan, atau catatan..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600"
            />
          </div>

          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700"
          >
            <option value="Semua">Semua Kelas</option>
            {uniqueClasses.map((k) => (
              <option key={k} value={k}>
                Kelas {k}
              </option>
            ))}
          </select>

          <select
            value={filterMapel}
            onChange={(e) => setFilterMapel(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700"
          >
            <option value="Semua">Semua Mata Pelajaran</option>
            {uniqueSubjects.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500 tabular-nums">
          {filteredNotes.length} catatan tersimpan
        </span>
      </div>

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-14 text-center">
          <NotebookPen className="w-9 h-9 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            Belum ada catatan guru pada filter ini
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Klik "Tambah Catatan" untuk menulis jurnal pembelajaran baru.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note, idx) => {
            const palette = NOTE_CARD_PALETTES[idx % NOTE_CARD_PALETTES.length];
            return (
              <motion.article
                key={note.id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.2,
                  delay: Math.min(idx * 0.04, 0.2),
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={shouldReduceMotion ? undefined : { y: -3 }}
                className={`border rounded-[24px] p-5 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.08)] transition-colors ${palette}`}
              >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">
                    {formatIndonesianDate(note.tanggal)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-slate-700">
                    {note.hari}, Jam ke-{note.jamKe} ({note.waktu})
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-amber-700">
                    Kelas {note.kelas}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-slate-800">
                    {note.mataPelajaran}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <motion.button
                    type="button"
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                    onClick={() => handleStartEdit(note)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-amber-700 hover:bg-amber-50 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                    onClick={() => onDeleteNote(note.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </motion.button>
                </div>
              </div>

              <h3 className="mt-3 text-base font-bold text-slate-900">
                {note.materi}
              </h3>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs font-semibold text-amber-700 mb-1">
                    Kegiatan Pembelajaran
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {note.kegiatan}
                  </p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-orange-700 mb-1">
                    Catatan Guru
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {note.catatan || 'Tidak ada catatan tambahan.'}
                  </p>
                </div>
              </div>
            </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
};
