import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Save,
  Plus,
  Trash2,
  Upload,
  RotateCcw,
  CheckCircle2,
  CalendarOff,
  Settings,
  Building2,
  UserCheck,
  Sliders,
  ShieldCheck,
  Cloud,
} from 'lucide-react';
import {
  AppState,
  SchoolProfile,
  TeacherProfile,
} from '../types';
import { formatIndonesianDate } from '../utils/dateUtils';
import teacherPortraitImg from '../assets/images/teacher_portrait_1794569693145.jpg';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsPageProps {
  state: AppState;
  cloudUserEmail?: string | null;
  onUpdateSchoolProfile: (profile: SchoolProfile) => void;
  onUpdateTeacherProfile: (profile: TeacherProfile) => void;
  onAddHoliday: (tanggal: string, keterangan: string) => void;
  onDeleteHoliday: (id: string) => void;
  onUpdateWeights: (tugas: number, asas: number) => void;
  onResetAllData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  state,
  cloudUserEmail,
  onUpdateSchoolProfile,
  onUpdateTeacherProfile,
  onAddHoliday,
  onDeleteHoliday,
  onUpdateWeights,
  onResetAllData,
}) => {
  const [schoolForm, setSchoolForm] = useState<SchoolProfile>(
    state.schoolProfile
  );
  const [teacherForm, setTeacherForm] = useState<TeacherProfile>(
    state.teacherProfile
  );
  const [subjectsText, setSubjectsText] = useState<string>(
    state.teacherProfile.mataPelajaran.join('\n')
  );

  const [holidayDate, setHolidayDate] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');

  const [weightTugas, setWeightTugas] = useState(state.gradeWeightTugas);
  const [weightAsas, setWeightAsas] = useState(state.gradeWeightAsas);

  const [confirmReset, setConfirmReset] = useState(false);

  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setSchoolForm(state.schoolProfile);
  }, [state.schoolProfile]);

  useEffect(() => {
    setTeacherForm(state.teacherProfile);
    setSubjectsText(state.teacherProfile.mataPelajaran.join('\n'));
  }, [state.teacherProfile]);

  useEffect(() => {
    setWeightTugas(state.gradeWeightTugas);
    setWeightAsas(state.gradeWeightAsas);
  }, [state.gradeWeightTugas, state.gradeWeightAsas]);

  const showToast = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSchoolProfile(schoolForm);
    showToast('Profil sekolah pada Dashboard berhasil diperbarui.');
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const mapelList = subjectsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    onUpdateTeacherProfile({
      ...teacherForm,
      mataPelajaran: mapelList.length > 0 ? mapelList : ['Matematika'],
    });
    showToast('Profil guru pada Dashboard berhasil diperbarui.');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const img = new Image();
      img.onload = () => {
        const maxSize = 200;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setTeacherForm((prev) => ({
            ...prev,
            fotoProfil: compressed,
          }));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAddHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayDesc.trim()) return;
    onAddHoliday(holidayDate, holidayDesc.trim());
    setHolidayDate('');
    setHolidayDesc('');
    showToast(
      'Hari libur sekolah ditambahkan dan disinkronkan ke Absen & Rekap.'
    );
  };

  const handleSaveWeights = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateWeights(weightTugas, weightAsas);
    showToast('Bobot perhitungan Nilai Rapot berhasil disimpan.');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Pengaturan
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola profil sekolah, profil guru pada dashboard, kalender libur sekolah, dan keamanan akun
          </p>
        </div>
      </div>

      <AnimatePresence>
        {savedNotice && (
          <motion.div
            initial={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-800"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Pengaturan Profil Sekolah & Profil Guru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleSaveSchool}
          className="bg-gradient-to-br from-blue-50/80 via-white to-sky-50/70 border border-blue-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-blue-100">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pengaturan Profil Sekolah
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Ditampilkan pada kartu Profil Sekolah di Dashboard
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Sekolah
            </label>
            <input
              type="text"
              value={schoolForm.namaSekolah}
              onChange={(e) =>
                setSchoolForm({ ...schoolForm, namaSekolah: e.target.value })
              }
              className="w-full h-10 px-3 rounded-lg border border-blue-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                NPSN
              </label>
              <input
                type="text"
                value={schoolForm.npsn}
                onChange={(e) =>
                  setSchoolForm({ ...schoolForm, npsn: e.target.value })
                }
                className="w-full h-10 px-3 rounded-lg border border-blue-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status Akreditasi
              </label>
              <input
                type="text"
                value={schoolForm.statusAkreditasi}
                onChange={(e) =>
                  setSchoolForm({
                    ...schoolForm,
                    statusAkreditasi: e.target.value,
                  })
                }
                className="w-full h-10 px-3 rounded-lg border border-blue-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Kepala Sekolah
            </label>
            <input
              type="text"
              value={schoolForm.kepalaSekolah}
              onChange={(e) =>
                setSchoolForm({ ...schoolForm, kepalaSekolah: e.target.value })
              }
              className="w-full h-10 px-3 rounded-lg border border-blue-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Alamat Sekolah
            </label>
            <input
              type="text"
              value={schoolForm.alamat || ''}
              onChange={(e) =>
                setSchoolForm({ ...schoolForm, alamat: e.target.value })
              }
              className="w-full h-10 px-3 rounded-lg border border-blue-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <motion.button
            type="submit"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Profil Sekolah</span>
          </motion.button>
        </form>

        {/* Profil Guru */}
        <form
          onSubmit={handleSaveTeacher}
          className="bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/70 border border-indigo-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-indigo-100">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pengaturan Profil Guru
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Ditampilkan pada kartu Profil Guru di Dashboard & Sidebar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <img
              src={teacherForm.fotoProfil}
              alt={teacherForm.namaGuru}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-xl object-cover border border-indigo-200 bg-white shrink-0"
            />
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50/60 text-xs font-semibold text-slate-700 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ubah Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setTeacherForm({
                    ...teacherForm,
                    fotoProfil: teacherPortraitImg,
                  })
                }
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Foto Default
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Guru
            </label>
            <input
              type="text"
              value={teacherForm.namaGuru}
              onChange={(e) =>
                setTeacherForm({ ...teacherForm, namaGuru: e.target.value })
              }
              className="w-full h-10 px-3 rounded-lg border border-indigo-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                NIP
              </label>
              <input
                type="text"
                value={teacherForm.nip}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, nip: e.target.value })
                }
                className="w-full h-10 px-3 rounded-lg border border-indigo-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={teacherForm.email}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, email: e.target.value })
                }
                className="w-full h-10 px-3 rounded-lg border border-indigo-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mata Pelajaran yang Diampu (1 per baris)
            </label>
            <textarea
              rows={2}
              value={subjectsText}
              onChange={(e) => setSubjectsText(e.target.value)}
              className="w-full p-3 rounded-lg border border-indigo-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              required
            />
          </div>

          <motion.button
            type="submit"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Profil Guru</span>
          </motion.button>
        </form>
      </div>

      {/* 2. Pengaturan Libur Sekolah */}
      <section className="bg-gradient-to-br from-rose-50/75 via-white to-orange-50/60 border border-rose-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-rose-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-red-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CalendarOff className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pengaturan Libur Sekolah (Kalender 5 Hari Kerja)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Sabtu & Minggu otomatis ditandai libur berwarna merah. Tambahkan tanggal libur nasional atau libur khusus sekolah di bawah ini.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-red-700 self-start sm:self-auto">
            Sabtu & Minggu Otomatis Merah
          </span>
        </div>

        <form
          onSubmit={handleAddHolidaySubmit}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tanggal Libur
            </label>
            <input
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-rose-200 bg-white text-sm font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Keterangan Libur
            </label>
            <input
              type="text"
              value={holidayDesc}
              onChange={(e) => setHolidayDesc(e.target.value)}
              placeholder="Contoh: Libur Nasional / Rapat Guru"
              className="w-full h-10 px-3 rounded-lg border border-rose-200 bg-white text-sm"
              required
            />
          </div>
          <div>
            <motion.button
              type="submit"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Hari Libur</span>
            </motion.button>
          </div>
        </form>

        {state.holidays.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
            <CalendarOff className="w-6 h-6 text-slate-300 mx-auto mb-1" />
            Belum ada hari libur khusus sekolah ditambahkan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Tanggal</th>
                  <th className="py-2.5 px-4">Keterangan Libur</th>
                  <th className="py-2.5 pl-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...state.holidays]
                  .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
                  .map((h) => (
                    <tr key={h.id} className="hover:bg-red-50/40 transition-colors">
                      <td className="py-2.5 pr-4 font-mono text-xs font-semibold text-red-700 whitespace-nowrap">
                        {formatIndonesianDate(h.tanggal)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800">
                        {h.keterangan}
                      </td>
                      <td className="py-2.5 pl-4 text-right">
                        <motion.button
                          type="button"
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                          onClick={() => onDeleteHoliday(h.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </motion.button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. Bobot Nilai Rapot & Pengaturan Akun */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleSaveWeights}
          className="bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/70 border border-emerald-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-emerald-100">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Bobot Nilai Rapot
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Mengatur proporsi rata-rata Tugas 1–11 dan Nilai ASAS / ASAT
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Bobot Rata-rata Tugas (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={weightTugas}
                onChange={(e) => setWeightTugas(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-emerald-200 bg-white text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Bobot ASAS / ASAT (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={weightAsas}
                onChange={(e) => setWeightAsas(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-emerald-200 bg-white text-sm font-mono"
              />
            </div>
          </div>
          <motion.button
            type="submit"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Bobot Nilai</span>
          </motion.button>
        </form>

        <div className="bg-gradient-to-br from-amber-50/75 via-white to-orange-50/50 border border-amber-200 rounded-xl p-6 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-amber-100">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Sinkronisasi Cloud & Perangkat
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Akun Google aktif:{' '}
                  <strong className="font-mono text-slate-900">
                    {cloudUserEmail || state.teacherProfile.email}
                  </strong>
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-white/90 border border-amber-200/80 p-3.5 flex items-start gap-2.5 text-xs text-slate-700">
              <Cloud className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p>
                  Seluruh perubahan data otomatis tersinkron ke cloud. Login dengan email Google yang sama di HP, tablet, atau komputer lain agar data tetap terhubung.
                </p>
                <PWAInstallButton variant="login" />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-amber-100 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Kembalikan seluruh data cloud ke pengaturan awal aplikasi.
            </div>
            {confirmReset ? (
              <div className="flex items-center gap-2 shrink-0">
                <motion.button
                  type="button"
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                  onClick={() => {
                    onResetAllData();
                    setConfirmReset(false);
                    showToast('Data cloud berhasil dikembalikan ke kondisi awal.');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Ya, Reset
                </motion.button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
              </div>
            ) : (
              <motion.button
                type="button"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Data</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
