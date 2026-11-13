import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Download,
  Upload,
  Search,
  Award,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  BarChart3,
  Printer,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  GradesMap,
  SchoolProfile,
  Student,
  TeacherProfile,
} from '../types';
import {
  downloadExcelTemplate,
  exportMultiSheetExcel,
  parseExcelFile,
} from '../utils/excel';
import { exportGradesToPdf } from '../utils/pdfExport';

interface GradesPageProps {
  students: Student[];
  subjects: string[];
  grades: GradesMap;
  schoolProfile: SchoolProfile;
  teacherProfile: TeacherProfile;
  weightTugas: number;
  weightAsas: number;
  onUpdateGradeCell: (
    studentId: string,
    mataPelajaran: string,
    field: { type: 'tugas'; index: number } | { type: 'asas' },
    value: number | null
  ) => void;
  onBulkImportGrades: (
    mataPelajaran: string,
    records: {
      nis: string;
      tugas: (number | null)[];
      asasAsat: number | null;
    }[]
  ) => number;
}

const CLASS_CARD_PALETTES = [
  {
    idle: 'bg-gradient-to-br from-sky-50 to-cyan-100/70 border-sky-200 hover:border-sky-300',
    score: 'text-sky-700',
  },
  {
    idle: 'bg-gradient-to-br from-violet-50 to-indigo-100/70 border-violet-200 hover:border-violet-300',
    score: 'text-violet-700',
  },
  {
    idle: 'bg-gradient-to-br from-emerald-50 to-teal-100/70 border-emerald-200 hover:border-emerald-300',
    score: 'text-emerald-700',
  },
  {
    idle: 'bg-gradient-to-br from-amber-50 to-orange-100/70 border-amber-200 hover:border-amber-300',
    score: 'text-amber-700',
  },
  {
    idle: 'bg-gradient-to-br from-rose-50 to-pink-100/70 border-rose-200 hover:border-rose-300',
    score: 'text-rose-700',
  },
];

function computeStats(
  tugas: (number | null)[],
  asasAsat: number | null,
  weightTugas: number,
  weightAsas: number
) {
  const filledTugas = tugas.filter(
    (v): v is number => v !== null && !Number.isNaN(v)
  );
  const jumlah = filledTugas.reduce((acc, v) => acc + v, 0);
  const rataRata =
    filledTugas.length > 0
      ? Number((jumlah / filledTugas.length).toFixed(1))
      : 0;

  let nilaiRapot = 0;
  if (filledTugas.length > 0 && asasAsat !== null && !Number.isNaN(asasAsat)) {
    const totalW = weightTugas + weightAsas || 100;
    nilaiRapot = Math.round(
      (rataRata * weightTugas + asasAsat * weightAsas) / totalW
    );
  } else if (filledTugas.length > 0) {
    nilaiRapot = Math.round(rataRata);
  } else if (asasAsat !== null && !Number.isNaN(asasAsat)) {
    nilaiRapot = Math.round(asasAsat);
  }

  return { jumlah, rataRata, nilaiRapot };
}

export const GradesPage: React.FC<GradesPageProps> = ({
  students,
  subjects,
  grades,
  schoolProfile,
  teacherProfile,
  weightTugas,
  weightAsas,
  onUpdateGradeCell,
  onBulkImportGrades,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(
    subjects[0] || 'Matematika'
  );
  const [filterKelas, setFilterKelas] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [showChart, setShowChart] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const uniqueClasses = useMemo(
    () => Array.from(new Set(students.map((s) => s.kelas))).sort(),
    [students]
  );

  const classComparisonData = useMemo(() => {
    return uniqueClasses.map((kelasName) => {
      const classStudents = students.filter((s) => s.kelas === kelasName);
      let sumTugas = 0;
      let countTugas = 0;
      let sumAsas = 0;
      let countAsas = 0;
      let sumRapot = 0;
      let countRapot = 0;

      classStudents.forEach((st) => {
        const rec = grades[`${st.id}::${selectedSubject}`];
        const tugas = rec?.tugas ?? Array(11).fill(null);
        const asas = rec?.asasAsat ?? null;
        const hasTugas = tugas.some((v) => v !== null && !Number.isNaN(v));
        const hasAsas = asas !== null && !Number.isNaN(asas);
        const stats = computeStats(tugas, asas, weightTugas, weightAsas);

        if (hasTugas) {
          sumTugas += stats.rataRata;
          countTugas += 1;
        }
        if (hasAsas && asas !== null) {
          sumAsas += asas;
          countAsas += 1;
        }
        if (hasTugas || hasAsas) {
          sumRapot += stats.nilaiRapot;
          countRapot += 1;
        }
      });

      return {
        kelas: kelasName,
        jumlahSiswa: classStudents.length,
        dinilai: countRapot,
        rataTugas: countTugas > 0 ? Number((sumTugas / countTugas).toFixed(1)) : 0,
        rataAsas: countAsas > 0 ? Number((sumAsas / countAsas).toFixed(1)) : 0,
        rataRapot: countRapot > 0 ? Number((sumRapot / countRapot).toFixed(1)) : 0,
      };
    });
  }, [uniqueClasses, students, grades, selectedSubject, weightTugas, weightAsas]);

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

  const parseScoreInput = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (trimmed === '') return null;
    const num = Number(trimmed);
    if (Number.isNaN(num)) return null;
    return Math.max(0, Math.min(100, num));
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'NIS',
      'Nama Siswa',
      'Kelas',
      ...Array.from({ length: 11 }, (_, i) => `Tugas ${i + 1}`),
      'Nilai ASAS / ASAT',
    ];
    const sampleRows = filteredStudents.slice(0, 3).map((s) => [
      s.nis,
      s.nama,
      s.kelas,
      85,
      88,
      82,
      90,
      86,
      84,
      '',
      '',
      '',
      '',
      '',
      87,
    ]);
    downloadExcelTemplate(
      `Template_Daftar_Nilai_${selectedSubject.replace(/\s+/g, '_')}.xlsx`,
      'Daftar Nilai',
      headers,
      sampleRows
    );
  };

  const buildSheetRowsForSubject = (
    subjectName: string,
    targetStudents: Student[]
  ): (string | number)[][] => {
    const metadataRows: (string | number)[][] = [
      ['DAFTAR NILAI SISWA', '', schoolProfile.namaSekolah],
      ['Mata Pelajaran', subjectName, `Guru: ${teacherProfile.namaGuru} (NIP ${teacherProfile.nip})`],
      ['Kelas', filterKelas === 'Semua' ? 'Semua Kelas' : filterKelas, `Rumus Rapot: ${weightTugas}% Tugas + ${weightAsas}% ASAS/ASAT`],
      [],
    ];

    const headers = [
      'No',
      'NIS',
      'Nama Siswa',
      'Kelas',
      ...Array.from({ length: 11 }, (_, i) => `Tugas ${i + 1}`),
      'Jumlah',
      'Rata-rata',
      'Nilai ASAS / ASAT',
      'Nilai Rapot',
    ];

    let totalRata = 0;
    let totalAsas = 0;
    let countAsas = 0;
    let totalRapot = 0;

    const studentRows = targetStudents.map((st, idx) => {
      const rec = grades[`${st.id}::${subjectName}`];
      const tugas = rec?.tugas ?? Array(11).fill(null);
      const asas = rec?.asasAsat ?? null;
      const stats = computeStats(tugas, asas, weightTugas, weightAsas);

      totalRata += stats.rataRata;
      totalRapot += stats.nilaiRapot;
      if (asas !== null && !Number.isNaN(asas)) {
        totalAsas += asas;
        countAsas += 1;
      }

      return [
        idx + 1,
        st.nis,
        st.nama,
        st.kelas,
        ...tugas.map((t) => (t === null ? '' : t)),
        stats.jumlah,
        stats.rataRata,
        asas === null ? '' : asas,
        stats.nilaiRapot,
      ];
    });

    const n = targetStudents.length;
    const summaryRow: (string | number)[] =
      n > 0
        ? [
            '',
            '',
            'Rata-rata Kelas',
            '',
            ...Array(11).fill(''),
            '',
            Number((totalRata / n).toFixed(1)),
            countAsas > 0 ? Number((totalAsas / countAsas).toFixed(1)) : '',
            Number((totalRapot / n).toFixed(1)),
          ]
        : [];

    return [
      ...metadataRows,
      headers,
      ...studentRows,
      ...(summaryRow.length > 0 ? [summaryRow] : []),
    ];
  };

  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Tidak ada data siswa pada filter saat ini untuk diekspor.',
      });
      return;
    }

    const kelasSuffix =
      filterKelas === 'Semua' ? 'Semua_Kelas' : filterKelas.replace(/\s+/g, '_');
    const filename = `Daftar_Nilai_${selectedSubject.replace(/\s+/g, '_')}_${kelasSuffix}.xlsx`;

    exportMultiSheetExcel(filename, [
      {
        sheetName: selectedSubject,
        rows: buildSheetRowsForSubject(selectedSubject, filteredStudents),
      },
    ]);

    setFeedback({
      type: 'success',
      message: `Data nilai ${selectedSubject} (${filteredStudents.length} siswa) berhasil diekspor ke ${filename}.`,
    });
  };

  const handleExportAllSubjects = () => {
    if (filteredStudents.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Tidak ada data siswa pada filter saat ini untuk diekspor.',
      });
      return;
    }

    const kelasSuffix =
      filterKelas === 'Semua' ? 'Semua_Kelas' : filterKelas.replace(/\s+/g, '_');
    const filename = `Daftar_Nilai_Lengkap_${kelasSuffix}.xlsx`;

    const sheets = subjects.map((subjectName) => ({
      sheetName: subjectName,
      rows: buildSheetRowsForSubject(subjectName, filteredStudents),
    }));

    exportMultiSheetExcel(filename, sheets);

    setFeedback({
      type: 'success',
      message: `Seluruh daftar nilai (${subjects.length} mata pelajaran) berhasil diekspor ke ${filename}.`,
    });
  };

  const handleExportPdf = () => {
    if (filteredStudents.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Tidak ada data siswa pada filter saat ini untuk dicetak ke PDF.',
      });
      return;
    }

    const pdfRows = filteredStudents.map((st, idx) => {
      const rec = grades[`${st.id}::${selectedSubject}`];
      const tugas = rec?.tugas ?? Array(11).fill(null);
      const asasAsat = rec?.asasAsat ?? null;
      const stats = computeStats(tugas, asasAsat, weightTugas, weightAsas);
      return {
        no: idx + 1,
        nis: st.nis,
        nama: st.nama,
        kelas: st.kelas,
        tugas,
        jumlah: stats.jumlah,
        rataRata: stats.rataRata,
        asasAsat,
        nilaiRapot: stats.nilaiRapot,
      };
    });

    const filename = exportGradesToPdf({
      schoolProfile,
      teacherProfile,
      subjectName: selectedSubject,
      filterKelas,
      weightTugas,
      weightAsas,
      rows: pdfRows,
    });

    setFeedback({
      type: 'success',
      message: `Rekapitulasi nilai PDF (${selectedSubject}) dengan kop sekolah berhasil dicetak ke ${filename}.`,
    });
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rawRows = await parseExcelFile(file);
      const parsed: {
        nis: string;
        tugas: (number | null)[];
        asasAsat: number | null;
      }[] = [];

      rawRows.forEach((row) => {
        const entries = Object.entries(row).reduce<Record<string, string>>(
          (acc, [k, v]) => {
            acc[k.trim().toLowerCase()] = String(v ?? '').trim();
            return acc;
          },
          {}
        );
        const nis = entries['nis'] || '';
        if (!nis) return;

        const tugas: (number | null)[] = Array.from({ length: 11 }, (_, i) => {
          const val =
            entries[`tugas ${i + 1}`] ??
            entries[`t${i + 1}`] ??
            entries[`tugas ke ${i + 1}`] ??
            '';
          return parseScoreInput(val);
        });
        const asasRaw =
          entries['nilai asas / asat'] ??
          entries['asas/asat'] ??
          entries['asas'] ??
          entries['asat'] ??
          '';
        parsed.push({
          nis,
          tugas,
          asasAsat: parseScoreInput(asasRaw),
        });
      });

      if (parsed.length === 0) {
        setFeedback({
          type: 'error',
          message: 'Tidak ada data nilai valid ditemukan pada file Excel.',
        });
      } else {
        const updated = onBulkImportGrades(selectedSubject, parsed);
        setFeedback({
          type: 'success',
          message: `Berhasil memperbarui nilai untuk ${updated} siswa pada mata pelajaran ${selectedSubject}.`,
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Gagal membaca file Excel daftar nilai.',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Daftar Nilai Siswa
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tugas ke-1 sampai ke-11, Jumlah, Rata-rata, Nilai ASAS / ASAT, dan Nilai Rapot otomatis
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
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>Template Nilai</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-pink-600" />
            <span>Import Excel</span>
          </motion.button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportExcel}
            className="hidden"
          />

          {subjects.length > 1 && (
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              onClick={handleExportAllSubjects}
              disabled={filteredStudents.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Semua Mapel (.xlsx)</span>
            </motion.button>
          )}

          <motion.button
            type="button"
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            onClick={handleExportExcel}
            disabled={filteredStudents.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Nilai (.xlsx)</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
            onClick={handleExportPdf}
            disabled={filteredStudents.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF</span>
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

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-[24px] p-4 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.08)] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {subjects.map((mp) => {
              const isSelected = selectedSubject === mp;
              return (
                <button
                  key={mp}
                  type="button"
                  onClick={() => setSelectedSubject(mp)}
                  className={`relative px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="grades-subject-tab"
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 480, damping: 32 }
                      }
                      className="absolute inset-0 rounded-md bg-gradient-to-r from-rose-600 to-pink-600 shadow-xs"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{mp}</span>
                </button>
              );
            })}
          </div>

          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            aria-label="Filter Kelas"
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700"
          >
            <option value="Semua">Semua Kelas</option>
            {uniqueClasses.map((k) => (
              <option key={k} value={k}>
                Kelas {k}
              </option>
            ))}
          </select>

          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama / NIS..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500">
            Rumus Nilai Rapot: ({weightTugas}% Rata-rata Tugas + {weightAsas}% ASAS/ASAT)
          </span>
          <button
            type="button"
            onClick={() => setShowChart((prev) => !prev)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-700" />
            <span>{showChart ? 'Sembunyikan Grafik' : 'Tampilkan Grafik'}</span>
          </button>
        </div>
      </div>

      {/* Perbandingan Rata-rata Nilai per Kelas (Recharts BarChart) */}
      <AnimatePresence>
        {showChart && (
          <motion.section
            initial={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.99 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.99 }
            }
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-gradient-to-br from-indigo-50/40 via-white to-rose-50/40 border border-indigo-200/80 rounded-xl p-5"
          >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Perbandingan Rata-rata Nilai per Kelas — {selectedSubject}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan rata-rata Tugas (1–11), Nilai ASAS / ASAT, dan Nilai Rapot di setiap kelas · Klik kelas di bawah untuk memfilter tabel
              </p>
            </div>
            {filterKelas !== 'Semua' && (
              <button
                type="button"
                onClick={() => setFilterKelas('Semua')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
              >
                Tampilkan Semua Kelas
              </button>
            )}
          </div>

          {classComparisonData.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Belum ada data kelas untuk ditampilkan pada grafik.
            </div>
          ) : (
            <div className="mt-4">
              <div className="h-[270px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={classComparisonData}
                    margin={{ top: 10, right: 16, left: -12, bottom: 4 }}
                    barGap={6}
                    onClick={(chartState) => {
                      const clickedLabel = chartState?.activeLabel;
                      if (typeof clickedLabel === 'string' && clickedLabel) {
                        setFilterKelas((prev) =>
                          prev === clickedLabel ? 'Semua' : clickedLabel
                        );
                      }
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E2E8F0"
                    />
                    <XAxis
                      dataKey="kelas"
                      tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(241, 245, 249, 0.7)' }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) {
                          return null;
                        }
                        const row = payload[0]?.payload as
                          | {
                              kelas: string;
                              jumlahSiswa: number;
                              dinilai: number;
                              rataTugas: number;
                              rataAsas: number;
                              rataRapot: number;
                            }
                          | undefined;
                        if (!row) return null;
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3.5 py-2.5 text-xs">
                            <div className="font-bold text-slate-900 mb-1">
                              Kelas {label} ·{' '}
                              <span className="font-normal text-slate-500">
                                {row.dinilai}/{row.jumlahSiswa} siswa bernilai
                              </span>
                            </div>
                            <div className="space-y-1 font-mono tabular-nums">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-600 font-sans">
                                  Rata-rata Tugas
                                </span>
                                <span className="font-semibold text-slate-700">
                                  {row.rataTugas}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-teal-700 font-sans">
                                  Rata-rata ASAS / ASAT
                                </span>
                                <span className="font-semibold text-teal-700">
                                  {row.rataAsas}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
                                <span className="text-blue-700 font-sans font-semibold">
                                  Rata-rata Nilai Rapot
                                </span>
                                <span className="font-bold text-blue-700">
                                  {row.rataRapot}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                    />
                    <Bar
                      dataKey="rataTugas"
                      name="Rata-rata Tugas"
                      fill="#64748B"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                    <Bar
                      dataKey="rataAsas"
                      name="Rata-rata ASAS / ASAT"
                      fill="#0F766E"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                    <Bar
                      dataKey="rataRapot"
                      name="Rata-rata Nilai Rapot"
                      fill="#1D4ED8"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Compact per-class numeric strip aligned under chart */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {classComparisonData.map((item, idx) => {
                  const isActiveClass = filterKelas === item.kelas;
                  const palette =
                    CLASS_CARD_PALETTES[idx % CLASS_CARD_PALETTES.length];
                  return (
                    <motion.button
                      key={item.kelas}
                      type="button"
                      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                      onClick={() =>
                        setFilterKelas((prev) =>
                          prev === item.kelas ? 'Semua' : item.kelas
                        )
                      }
                      className={`text-left px-3.5 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                        isActiveClass
                          ? 'bg-gradient-to-br from-rose-100 to-pink-100 border-rose-400 shadow-xs'
                          : palette.idle
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">
                          Kelas {item.kelas}
                        </span>
                        <span className="text-slate-600 tabular-nums">
                          {item.dinilai}/{item.jumlahSiswa} siswa
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-[11px] text-slate-600">
                          Rata-rata Rapot
                        </span>
                        <span
                          className={`text-sm font-bold font-mono tabular-nums ${
                            isActiveClass ? 'text-rose-700' : palette.score
                          }`}
                        >
                          {item.dinilai > 0 ? item.rataRapot : '-'}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Spreadsheet Gradebook Table */}
      <div className="bg-white border border-slate-300 rounded-xl overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="py-14 text-center">
            <Award className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Tidak ada data siswa ditemukan
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto spreadsheet-scroll max-h-[640px]">
            <table className="border-collapse text-xs w-max min-w-full">
              <thead className="sticky top-0 z-20 bg-slate-100">
                <tr>
                  <th className="sticky left-0 z-30 bg-slate-100 border-b border-r border-slate-300 px-2.5 py-3 text-center font-semibold text-slate-700 w-10">
                    No
                  </th>
                  <th className="sticky left-[40px] z-30 bg-slate-100 border-b border-r border-slate-300 px-3 py-3 text-left font-semibold text-slate-700 min-w-[96px]">
                    NIS
                  </th>
                  <th className="sticky left-[136px] z-30 bg-slate-100 border-b border-r border-slate-300 px-3 py-3 text-left font-semibold text-slate-700 min-w-[185px]">
                    Nama Siswa
                  </th>
                  <th className="border-b border-r border-slate-300 px-3 py-3 text-center font-semibold text-slate-700 min-w-[66px]">
                    Kelas
                  </th>
                  {Array.from({ length: 11 }, (_, i) => (
                    <th
                      key={i}
                      className="border-b border-r border-slate-300 px-2 py-3 text-center font-semibold text-slate-700 min-w-[56px]"
                    >
                      T{i + 1}
                    </th>
                  ))}
                  <th className="border-b border-r border-slate-300 px-3 py-3 text-center font-bold text-slate-800 bg-slate-200/60 min-w-[66px]">
                    Jumlah
                  </th>
                  <th className="border-b border-r border-slate-300 px-3 py-3 text-center font-bold text-slate-800 bg-slate-200/60 min-w-[74px]">
                    Rata-rata
                  </th>
                  <th className="border-b border-r border-slate-300 px-2.5 py-3 text-center font-bold text-blue-800 bg-blue-50 min-w-[82px]">
                    ASAS / ASAT
                  </th>
                  <th className="border-b border-slate-300 px-3 py-3 text-center font-bold text-emerald-800 bg-emerald-50 min-w-[82px]">
                    Nilai Rapot
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((st, idx) => {
                  const rec = grades[`${st.id}::${selectedSubject}`];
                  const tugas = rec?.tugas ?? Array(11).fill(null);
                  const asasAsat = rec?.asasAsat ?? null;
                  const stats = computeStats(
                    tugas,
                    asasAsat,
                    weightTugas,
                    weightAsas
                  );

                  return (
                    <tr key={st.id} className="group hover:bg-slate-50/80">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-r border-slate-200 px-2.5 py-2 text-center font-mono text-slate-500 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="sticky left-[40px] z-10 bg-white group-hover:bg-slate-50 border-b border-r border-slate-200 px-3 py-2 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {st.nis}
                      </td>
                      <td className="sticky left-[136px] z-10 bg-white group-hover:bg-slate-50 border-b border-r border-slate-200 px-3 py-2 font-semibold text-slate-900 whitespace-nowrap">
                        {st.nama}
                      </td>
                      <td className="border-b border-r border-slate-200 px-3 py-2 text-center font-medium text-slate-700 whitespace-nowrap">
                        {st.kelas}
                      </td>

                      {tugas.map((score, tIdx) => (
                        <td
                          key={tIdx}
                          className="border-b border-r border-slate-200 p-0"
                        >
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={score === null ? '' : score}
                            onChange={(e) =>
                              onUpdateGradeCell(
                                st.id,
                                selectedSubject,
                                { type: 'tugas', index: tIdx },
                                parseScoreInput(e.target.value)
                              )
                            }
                            placeholder="-"
                            aria-label={`Tugas ${tIdx + 1} ${st.nama}`}
                            className="w-14 h-9 text-center font-mono tabular-nums bg-transparent focus:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-600 text-slate-800"
                          />
                        </td>
                      ))}

                      <td className="border-b border-r border-slate-200 px-2.5 py-2 text-center font-mono font-semibold text-slate-800 bg-slate-50 tabular-nums">
                        {stats.jumlah}
                      </td>
                      <td className="border-b border-r border-slate-200 px-2.5 py-2 text-center font-mono font-semibold text-slate-800 bg-slate-50 tabular-nums">
                        {stats.rataRata}
                      </td>
                      <td className="border-b border-r border-slate-200 p-0 bg-blue-50/30">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={asasAsat === null ? '' : asasAsat}
                          onChange={(e) =>
                            onUpdateGradeCell(
                              st.id,
                              selectedSubject,
                              { type: 'asas' },
                              parseScoreInput(e.target.value)
                            )
                          }
                          placeholder="-"
                          aria-label={`ASAS ASAT ${st.nama}`}
                          className="w-20 h-9 text-center font-mono font-semibold tabular-nums bg-transparent focus:bg-blue-100/60 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-600 text-blue-900"
                        />
                      </td>
                      <td className="border-b border-slate-200 px-3 py-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/50 tabular-nums">
                        {stats.nilaiRapot}
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
