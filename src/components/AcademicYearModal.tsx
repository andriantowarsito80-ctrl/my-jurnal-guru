import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Archive,
  ArrowRight,
  BookmarkCheck,
  CalendarPlus,
  CheckCircle2,
  Eye,
  FolderArchive,
  GraduationCap,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  AcademicYearArchiveMeta,
  AppState,
  SemesterType,
  StartNewAcademicYearParams,
} from '../types';

interface AcademicYearModalProps {
  open: boolean;
  initialTab?: 'archives' | 'new-year';
  onClose: () => void;
  activeState: AppState;
  archives: AcademicYearArchiveMeta[];
  viewingArchiveId: string | null;
  busy: boolean;
  onSaveSnapshot: (label: string) => Promise<void>;
  onOpenArchive: (meta: AcademicYearArchiveMeta) => Promise<void>;
  onReturnToActive: () => void;
  onDeleteArchive: (yearId: string) => Promise<void>;
  onStartNewYear: (params: StartNewAcademicYearParams) => Promise<void>;
}

function suggestNextAcademicYear(current: string): string {
  const match = current.match(/^(\d{4})\s*\/\s*(\d{4})$/);
  if (match) {
    const start = Number(match[1]) + 1;
    const end = Number(match[2]) + 1;
    return `${start}/${end}`;
  }
  const nowYear = new Date().getFullYear();
  return `${nowYear}/${nowYear + 1}`;
}

export const AcademicYearModal: React.FC<AcademicYearModalProps> = ({
  open,
  initialTab = 'archives',
  onClose,
  activeState,
  archives,
  viewingArchiveId,
  busy,
  onSaveSnapshot,
  onOpenArchive,
  onReturnToActive,
  onDeleteArchive,
  onStartNewYear,
}) => {
  const [tab, setTab] = useState<'archives' | 'new-year'>(initialTab);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // New Academic Year Wizard state
  const [archiveLabel, setArchiveLabel] = useState('');
  const [newTahunAjaran, setNewTahunAjaran] = useState('');
  const [newSemester, setNewSemester] = useState<SemesterType>('Ganjil');
  const [subjectsText, setSubjectsText] = useState('');
  const [studentMode, setStudentMode] = useState<'clear' | 'keep'>('clear');
  const [scheduleMode, setScheduleMode] = useState<'clear' | 'keep'>('clear');
  const [confirmTransition, setConfirmTransition] = useState(false);

  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setConfirmDeleteId(null);
    setConfirmTransition(false);
    setSnapshotLabel(
      `Arsip TA ${activeState.activeAcademicYear} (${activeState.activeSemester})`
    );
    setArchiveLabel(
      `TA ${activeState.activeAcademicYear} - Semester ${activeState.activeSemester}`
    );
    if (activeState.activeSemester === 'Ganjil') {
      setNewTahunAjaran(activeState.activeAcademicYear);
      setNewSemester('Genap');
    } else {
      setNewTahunAjaran(suggestNextAcademicYear(activeState.activeAcademicYear));
      setNewSemester('Ganjil');
    }
    setSubjectsText(activeState.teacherProfile.mataPelajaran.join('\n'));
  }, [
    open,
    initialTab,
    activeState.activeAcademicYear,
    activeState.activeSemester,
    activeState.teacherProfile.mataPelajaran,
  ]);

  if (!open) return null;

  const handleSaveSnapshotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    await onSaveSnapshot(
      snapshotLabel.trim() ||
        `TA ${activeState.activeAcademicYear} (${activeState.activeSemester})`
    );
  };

  const handleNewYearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!confirmTransition) {
      setConfirmTransition(true);
      return;
    }
    const parsedSubjects = subjectsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    await onStartNewYear({
      archiveCurrentLabel:
        archiveLabel.trim() ||
        `TA ${activeState.activeAcademicYear} (${activeState.activeSemester})`,
      newTahunAjaran: newTahunAjaran.trim() || '2026/2027',
      newSemester,
      newSubjects:
        parsedSubjects.length > 0
          ? parsedSubjects
          : activeState.teacherProfile.mataPelajaran,
      studentMode,
      scheduleMode,
    });
    setConfirmTransition(false);
    setTab('archives');
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/55 backdrop-blur-xs overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Manajemen Tahun Ajaran dan Arsip"
      >
        <motion.div
          initial={
            shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-3xl bg-white rounded-[28px] border border-slate-200/90 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Modal Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-[#16171d] via-[#211a3d] to-[#341b58] text-white flex items-start justify-between gap-4 shrink-0">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/15 flex items-center justify-center shrink-0">
                <FolderArchive className="w-5 h-5 text-violet-200" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  Tahun Ajaran & Arsip Data Lama
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Simpan riwayat data saat berganti tahun ajaran atau jadwal mengajar, dan buka kembali kapan saja.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Tutup modal"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Navigation Tabs */}
          <div className="px-6 pt-4 pb-2 border-b border-slate-100 flex flex-wrap items-center gap-2 shrink-0 bg-slate-50/60">
            <button
              type="button"
              onClick={() => {
                setTab('archives');
                setConfirmTransition(false);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                tab === 'archives'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Riwayat & Arsip ({archives.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('new-year')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                tab === 'new-year'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Mulai Tahun Ajaran / Jadwal Baru</span>
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {tab === 'archives' ? (
              <>
                {/* Active Year Card */}
                <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/60 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Tahun Ajaran Aktif Saat Ini</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        TA {activeState.activeAcademicYear} · Semester{' '}
                        {activeState.activeSemester}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Mapel: {activeState.teacherProfile.mataPelajaran.join(', ')}
                      </p>
                    </div>

                    {viewingArchiveId && (
                      <button
                        type="button"
                        onClick={() => {
                          onReturnToActive();
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Kembali ke Tahun Aktif</span>
                      </button>
                    )}
                  </div>

                  {/* Quick Stats Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                    {[
                      { label: 'Siswa', value: activeState.students.length },
                      { label: 'Jadwal', value: activeState.schedules.length },
                      {
                        label: 'Presensi',
                        value: Object.keys(activeState.attendance).length,
                      },
                      { label: 'Catatan', value: activeState.notes.length },
                      {
                        label: 'Nilai',
                        value: Object.keys(activeState.grades).length,
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl bg-white border border-slate-200/80 px-3 py-2 text-center"
                      >
                        <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                          {stat.value}
                        </div>
                        <div className="text-[11px] text-slate-500">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Save Snapshot Manually */}
                  <form
                    onSubmit={handleSaveSnapshotSubmit}
                    className="pt-2 border-t border-indigo-100 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
                  >
                    <input
                      type="text"
                      value={snapshotLabel}
                      onChange={(e) => setSnapshotLabel(e.target.value)}
                      placeholder="Nama label arsip (misal: TA 2025/2026 Genap)"
                      className="flex-1 h-9 px-3 rounded-xl border border-indigo-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60 whitespace-nowrap"
                    >
                      {busy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <BookmarkCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Simpan Cadangan Arsip Sekarang</span>
                    </button>
                  </form>
                </div>

                {/* Archived List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">
                      Daftar Arsip Tahun Ajaran Tersimpan
                    </h3>
                    <button
                      type="button"
                      onClick={() => setTab('new-year')}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ganti ke Tahun Ajaran Baru</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {archives.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2 bg-slate-50/50">
                      <GraduationCap className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-semibold text-slate-700">
                        Belum ada arsip tahun ajaran terdahulu
                      </p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Saat tahun ajaran baru dimulai lewat tab{' '}
                        <strong>Mulai Tahun Ajaran / Jadwal Baru</strong>, seluruh data lama akan otomatis tersimpan di sini agar dapat dilihat dan diekspor kapan pun.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {archives.map((arc) => {
                        const isCurrentlyViewing = viewingArchiveId === arc.id;
                        const archivedDate = new Date(arc.archivedAtISO).toLocaleDateString(
                          'id-ID',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }
                        );
                        return (
                          <div
                            key={arc.id}
                            className={`rounded-2xl border p-4 transition-colors ${
                              isCurrentlyViewing
                                ? 'border-amber-300 bg-amber-50/70'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-bold text-slate-900">
                                    {arc.label}
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                    TA {arc.tahunAjaran} · {arc.semester}
                                  </span>
                                  {isCurrentlyViewing && (
                                    <span className="text-[11px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">
                                      Sedang Dibuka
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600">
                                  Diarsipkan {archivedDate} · Mapel:{' '}
                                  <span className="font-medium text-slate-800">
                                    {arc.teacherProfile?.mataPelajaran?.join(', ') || '-'}
                                  </span>
                                </p>
                                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 font-mono">
                                  <span>{arc.summaryStats.studentCount} Siswa</span>
                                  <span>·</span>
                                  <span>{arc.summaryStats.scheduleCount} Jadwal</span>
                                  <span>·</span>
                                  <span>{arc.summaryStats.attendanceCount} Presensi</span>
                                  <span>·</span>
                                  <span>{arc.summaryStats.noteCount} Catatan</span>
                                  <span>·</span>
                                  <span>{arc.summaryStats.gradeCount} Nilai</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {isCurrentlyViewing ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onReturnToActive();
                                      onClose();
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Kembali Aktif</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={async () => {
                                      await onOpenArchive(arc);
                                      onClose();
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                                  >
                                    {busy ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                    <span>Lihat Data Arsip</span>
                                  </button>
                                )}

                                {confirmDeleteId === arc.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={async () => {
                                        await onDeleteArchive(arc.id);
                                        setConfirmDeleteId(null);
                                      }}
                                      className="px-2.5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                                    >
                                      Ya, Hapus
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setConfirmDeleteId(arc.id)}
                                    aria-label={`Hapus arsip ${arc.label}`}
                                    className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* TAB 2: Mulai Tahun Ajaran / Jadwal Baru */
              <form onSubmit={handleNewYearSubmit} className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/75 p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-900 space-y-1">
                    <p className="font-bold">
                      Data lama Anda dijamin tersimpan aman sebelum pindah tahun ajaran
                    </p>
                    <p className="text-emerald-800/90 leading-relaxed">
                      Sistem akan otomatis mengarsipkan seluruh data{' '}
                      <strong>
                        TA {activeState.activeAcademicYear} ({activeState.activeSemester})
                      </strong>{' '}
                      (Daftar Siswa, Jadwal Mengajar, Presensi Harian, Rekap Kehadiran, Catatan Guru, dan Daftar Nilai) ke Cloud sebelum menyiapkan lembar kerja baru.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    1. Nama Arsip untuk Data Saat Ini (Yang Akan Disimpan)
                  </label>
                  <input
                    type="text"
                    required
                    value={archiveLabel}
                    onChange={(e) => setArchiveLabel(e.target.value)}
                    placeholder="Contoh: TA 2025/2026 - Semester Genap"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      2. Tahun Ajaran Baru
                    </label>
                    <input
                      type="text"
                      required
                      value={newTahunAjaran}
                      onChange={(e) => setNewTahunAjaran(e.target.value)}
                      placeholder="Contoh: 2026/2027"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      3. Semester Baru
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Ganjil', 'Genap'] as SemesterType[]).map((sem) => (
                        <button
                          key={sem}
                          type="button"
                          onClick={() => setNewSemester(sem)}
                          className={`h-10 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            newSemester === sem
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Semester {sem}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    4. Mata Pelajaran yang Diampu di Tahun/Semester Baru (1 per baris)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={subjectsText}
                    onChange={(e) => setSubjectsText(e.target.value)}
                    placeholder="Contoh:&#10;Matematika Wajib&#10;Matematika Peminatan"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="block text-xs font-semibold text-slate-700">
                      5. Pengaturan Data Siswa
                    </span>
                    <button
                      type="button"
                      onClick={() => setStudentMode('clear')}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-colors cursor-pointer ${
                        studentMode === 'clear'
                          ? 'border-indigo-500 bg-indigo-50/70 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold">Mulai Kosong (Kelas Baru)</div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Cocok jika siswa kelas baru berubah total (bisa impor Excel baru).
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentMode('keep')}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-colors cursor-pointer ${
                        studentMode === 'keep'
                          ? 'border-indigo-500 bg-indigo-50/70 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold">Pertahankan Daftar Siswa</div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Cocok saat berganti semester dengan siswa yang sama.
                      </div>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-semibold text-slate-700">
                      6. Pengaturan Jadwal Mengajar
                    </span>
                    <button
                      type="button"
                      onClick={() => setScheduleMode('clear')}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-colors cursor-pointer ${
                        scheduleMode === 'clear'
                          ? 'border-indigo-500 bg-indigo-50/70 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold">Kosongkan Jadwal Lama</div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Jadwal lama diarsipkan; isi atau impor jadwal mengajar yang baru.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleMode('keep')}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-colors cursor-pointer ${
                        scheduleMode === 'keep'
                          ? 'border-indigo-500 bg-indigo-50/70 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold">Pertahankan Jadwal</div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Jadwal jam mengajar sama, hanya absen/catatan/nilai yang baru.
                      </div>
                    </button>
                  </div>
                </div>

                {confirmTransition ? (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-amber-950">
                      <p className="font-bold">
                        Konfirmasi Arsipkan Data Lama & Buka TA {newTahunAjaran} ({newSemester})?
                      </p>
                      <p className="mt-0.5 text-amber-800">
                        Absensi, Catatan Guru, dan Nilai pada ruang aktif akan dimulai ulang dari nol setelah arsip selesai disimpan.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                      >
                        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Ya, Arsipkan & Mulai Baru</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmTransition(false)}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setTab('archives')}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Kembali ke Daftar Arsip
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      <span>Arsipkan Tahun Lama & Mulai Tahun Baru</span>
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
