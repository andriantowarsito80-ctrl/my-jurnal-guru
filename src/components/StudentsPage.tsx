import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Plus,
  Download,
  Upload,
  Trash2,
  Search,
  ArrowUpDown,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Student } from '../types';
import {
  downloadExcelTemplate,
  exportArrayToExcel,
  parseExcelFile,
} from '../utils/excel';

interface StudentsPageProps {
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onBulkAddStudents: (students: Omit<Student, 'id'>[]) => number;
  onDeleteStudent: (id: string) => void;
  onBulkDeleteStudents: (ids: string[]) => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  students,
  onAddStudent,
  onBulkAddStudents,
  onDeleteStudent,
  onBulkDeleteStudents,
}) => {
  const [nis, setNis] = useState('');
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [sortOrder, setSortOrder] = useState<'az' | 'za'>('az');
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

  const uniqueClasses = useMemo(
    () => Array.from(new Set(students.map((s) => s.kelas))).sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = students.filter((s) => {
      const matchClass = filterKelas === 'Semua' || s.kelas === filterKelas;
      const matchSearch =
        !q ||
        s.nama.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q);
      return matchClass && matchSearch;
    });

    return list.sort((a, b) => {
      const cmp = a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
      return sortOrder === 'az' ? cmp : -cmp;
    });
  }, [students, searchQuery, filterKelas, sortOrder]);

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedIds.includes(s.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredStudents.map((s) => s.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const combined = new Set([
        ...selectedIds,
        ...filteredStudents.map((s) => s.id),
      ]);
      setSelectedIds(Array.from(combined));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNis = nis.trim();
    const cleanNama = nama.trim();
    const cleanKelas = kelas.trim();

    if (!cleanNis || !cleanNama || !cleanKelas) {
      setFeedback({
        type: 'error',
        message: 'Harap lengkapi NIS, Nama Siswa, dan Kelas.',
      });
      return;
    }

    if (students.some((s) => s.nis.toLowerCase() === cleanNis.toLowerCase())) {
      setFeedback({
        type: 'error',
        message: `NIS ${cleanNis} sudah terdaftar pada database siswa.`,
      });
      return;
    }

    onAddStudent({ nis: cleanNis, nama: cleanNama, kelas: cleanKelas });
    setNis('');
    setNama('');
    setKelas('');
    setShowAddForm(false);
    setFeedback({
      type: 'success',
      message: `Siswa "${cleanNama}" berhasil ditambahkan.`,
    });
  };

  const handleDownloadTemplate = () => {
    downloadExcelTemplate(
      'Template_Database_Siswa.xlsx',
      'Data Siswa',
      ['NIS', 'Nama Siswa', 'Kelas'],
      [
        ['242510101', 'Budi Santoso', 'XI-A'],
        ['242510102', 'Siti Aminah', 'XI-A'],
        ['242510103', 'Rizky Pratama', 'XI-B'],
      ]
    );
  };

  const handleExportExcel = () => {
    const rows: (string | number)[][] = [
      ['NIS', 'Nama Siswa', 'Kelas'],
      ...filteredStudents.map((s) => [s.nis, s.nama, s.kelas]),
    ];
    exportArrayToExcel('Database_Siswa.xlsx', 'Database Siswa', rows);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rawRows = await parseExcelFile(file);
      const parsed: Omit<Student, 'id'>[] = [];

      rawRows.forEach((row) => {
        const entries = Object.entries(row).reduce<Record<string, string>>(
          (acc, [k, v]) => {
            acc[k.trim().toLowerCase()] = String(v ?? '').trim();
            return acc;
          },
          {}
        );

        const rowNis =
          entries['nis'] || entries['no induk'] || entries['nomor induk'] || '';
        const rowNama =
          entries['nama siswa'] || entries['nama'] || entries['nama lengkap'] || '';
        const rowKelas = entries['kelas'] || entries['rombel'] || '';

        if (rowNis && rowNama && rowKelas) {
          parsed.push({ nis: rowNis, nama: rowNama, kelas: rowKelas });
        }
      });

      if (parsed.length === 0) {
        setFeedback({
          type: 'error',
          message:
            'Tidak ada data valid ditemukan. Pastikan kolom Excel bernama: NIS, Nama Siswa, Kelas.',
        });
      } else {
        const addedCount = onBulkAddStudents(parsed);
        setFeedback({
          type: 'success',
          message: `Berhasil mengimpor ${addedCount} siswa baru dari file Excel (${parsed.length - addedCount} duplikat NIS dilewati).`,
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message:
          'Gagal membaca file Excel. Gunakan format .xlsx atau .xls yang sesuai template.',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    onBulkDeleteStudents(selectedIds);
    setSelectedIds([]);
    setFeedback({
      type: 'success',
      message: `${count} data siswa terpilih berhasil dihapus.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Database Siswa
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Kelola data NIS, Nama Siswa, dan Kelas · Urut otomatis A–Z · Impor masal via Excel
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>Template Excel</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-600" />
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
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Data</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </motion.button>
        </div>
      </div>

      {/* Feedback Banner */}
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
            aria-labelledby="siswa-modal-title"
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
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-sky-200 rounded-xl shadow-xl"
            >
              <div className="sticky top-0 z-10 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-6 py-4 border-b border-sky-100 flex items-center justify-between gap-4">
                <div>
                  <h2
                    id="siswa-modal-title"
                    className="text-base font-bold text-slate-900"
                  >
                    Input Manual Data Siswa
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tambahkan data siswa baru ke database sekolah
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  aria-label="Tutup form siswa"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-sky-100/70 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      NIS
                    </label>
                    <input
                      type="text"
                      value={nis}
                      onChange={(e) => setNis(e.target.value)}
                      placeholder="Contoh: 242510021"
                      className="w-full h-10 px-3 rounded-lg border border-sky-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Kelas
                    </label>
                    <input
                      type="text"
                      value={kelas}
                      onChange={(e) => setKelas(e.target.value)}
                      placeholder="Contoh: XI-A"
                      list="kelas-suggestions"
                      className="w-full h-10 px-3 rounded-lg border border-sky-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600"
                      required
                    />
                    <datalist id="kelas-suggestions">
                      {uniqueClasses.map((k) => (
                        <option key={k} value={k} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Lengkap Siswa
                  </label>
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama lengkap siswa"
                    className="w-full h-10 px-3 rounded-lg border border-sky-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600"
                    required
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gradient-to-r from-sky-50/70 to-cyan-50/70 border-t border-sky-100 flex justify-end gap-2.5 rounded-b-xl">
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
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Simpan Siswa
                </motion.button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Toolbar & Multi-delete */}
      <div className="bg-gradient-to-b from-sky-50/40 via-white to-white border border-sky-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-sky-50/80 via-cyan-50/50 to-white border-b border-sky-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-sky-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa atau NIS..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-sky-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600"
              />
            </div>

            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              aria-label="Filter Kelas"
              className="h-9 px-3 rounded-lg border border-sky-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600"
            >
              <option value="Semua">Semua Kelas</option>
              {uniqueClasses.map((k) => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>

            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              onClick={() =>
                setSortOrder((prev) => (prev === 'az' ? 'za' : 'az'))
              }
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-sky-600" />
              <span>Urut Nama: {sortOrder === 'az' ? 'A - Z' : 'Z - A'}</span>
            </motion.button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 tabular-nums">
              Menampilkan {filteredStudents.length} dari {students.length} siswa
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
                <span>Hapus Terpilih ({selectedIds.length})</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Students Table */}
        {filteredStudents.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <Users className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Tidak ada data siswa yang cocok
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Ubah filter pencarian atau tambahkan siswa baru secara manual / Excel.
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
                      aria-label="Pilih semua siswa yang tampil"
                      className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 w-14">No</th>
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 pl-4 pr-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => {
                  const checked = selectedIds.includes(student.id);
                  return (
                    <tr
                      key={student.id}
                      className={`transition-colors ${
                        checked ? 'bg-sky-50/80' : 'hover:bg-sky-50/40'
                      }`}
                    >
                      <td className="py-2.5 pl-4 pr-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectOne(student.id)}
                          aria-label={`Pilih ${student.nama}`}
                          className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-500 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs font-medium text-slate-700 tabular-nums whitespace-nowrap">
                        {student.nis}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {student.nama}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-sky-700 whitespace-nowrap">
                        {student.kelas}
                      </td>
                      <td className="py-2.5 pl-4 pr-4 text-right whitespace-nowrap">
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                          onClick={() => {
                            onDeleteStudent(student.id);
                            setSelectedIds((prev) =>
                              prev.filter((id) => id !== student.id)
                            );
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title={`Hapus ${student.nama}`}
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
