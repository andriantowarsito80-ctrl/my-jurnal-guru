import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  Menu,
  LayoutDashboard,
  Users,
  CalendarClock,
  ClipboardCheck,
  Table2,
  NotebookPen,
  Award,
  Settings,
  Cloud,
  CloudOff,
  Loader2,
  RefreshCw,
  FolderArchive,
  RotateCcw,
  ChevronDown,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import {
  AcademicYearArchiveMeta,
  AppState,
  AttendanceStatus,
  NavTab,
  ScheduleItem,
  SchoolProfile,
  SemesterType,
  StartNewAcademicYearParams,
  Student,
  StudentGradeRecord,
  TeacherNote,
  TeacherProfile,
} from './types';
import { createInitialAppState } from './data/initialData';
import { auth, googleProvider } from './firebase';
import {
  addScheduleDoc,
  addStudentDoc,
  archiveCurrentWorkspaceYear,
  bulkAddScheduleDocs,
  bulkAddStudentDocs,
  bulkDeleteScheduleDocs,
  bulkDeleteStudentDocs,
  bulkUpsertGradeDocs,
  deleteArchiveYear,
  deleteAttendanceDoc,
  deleteHolidayDoc,
  deleteNoteDoc,
  deleteScheduleDoc,
  deleteStudentDoc,
  ensureTeacherWorkspace,
  loadArchiveWorkspaceData,
  markAllPresentDocs,
  resetWorkspaceInFirestore,
  sanitizeId,
  setAttendanceDoc,
  startNewAcademicYear,
  subscribeAcademicYearArchives,
  subscribeTeacherWorkspace,
  updateAcademicYearMetaDoc,
  updateSchoolProfileDoc,
  updateTeacherProfileDoc,
  updateWeightsDoc,
  upsertGradeDoc,
  upsertHolidayDoc,
  upsertNoteDoc,
} from './services/firestoreSync';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './components/DashboardPage';
import { StudentsPage } from './components/StudentsPage';
import { SchedulePage } from './components/SchedulePage';
import { AttendancePage } from './components/AttendancePage';
import { AttendanceRecapPage } from './components/AttendanceRecapPage';
import { TeacherNotesPage } from './components/TeacherNotesPage';
import { GradesPage } from './components/GradesPage';
import { SettingsPage } from './components/SettingsPage';
import { AcademicYearModal } from './components/AcademicYearModal';

const STORAGE_KEY = 'administrasi_guru_sman1_majalaya_v1';

const TAB_META: Record<
  NavTab,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeStyle: string;
  }
> = {
  dashboard: {
    label: 'Dashboard',
    icon: LayoutDashboard,
    badgeStyle: 'bg-blue-100 text-blue-700',
  },
  siswa: {
    label: 'Database Siswa',
    icon: Users,
    badgeStyle: 'bg-sky-100 text-sky-700',
  },
  jadwal: {
    label: 'Jadwal Mengajar',
    icon: CalendarClock,
    badgeStyle: 'bg-violet-100 text-violet-700',
  },
  absen: {
    label: 'Absen Siswa',
    icon: ClipboardCheck,
    badgeStyle: 'bg-emerald-100 text-emerald-700',
  },
  rekap: {
    label: 'Rekap Kehadiran',
    icon: Table2,
    badgeStyle: 'bg-teal-100 text-teal-700',
  },
  catatan: {
    label: 'Catatan Guru',
    icon: NotebookPen,
    badgeStyle: 'bg-amber-100 text-amber-700',
  },
  nilai: {
    label: 'Daftar Nilai',
    icon: Award,
    badgeStyle: 'bg-rose-100 text-rose-700',
  },
  pengaturan: {
    label: 'Pengaturan',
    icon: Settings,
    badgeStyle: 'bg-indigo-100 text-indigo-700',
  },
};

function loadLocalSeedFallback(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialAppState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const fallback = createInitialAppState();
    return {
      ...fallback,
      ...parsed,
      schoolProfile: { ...fallback.schoolProfile, ...parsed.schoolProfile },
      teacherProfile: { ...fallback.teacherProfile, ...parsed.teacherProfile },
      credentials: { ...fallback.credentials, ...parsed.credentials },
    };
  } catch {
    return createInitialAppState();
  }
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadLocalSeedFallback());
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [cloudBooting, setCloudBooting] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [syncMeta, setSyncMeta] = useState<{
    hasPendingWrites: boolean;
    fromCache: boolean;
  }>({ hasPendingWrites: false, fromCache: false });

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [archives, setArchives] = useState<AcademicYearArchiveMeta[]>([]);
  const [viewingArchive, setViewingArchive] = useState<{
    meta: AcademicYearArchiveMeta;
    data: AppState;
  } | null>(null);
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [yearModalInitialTab, setYearModalInitialTab] = useState<
    'archives' | 'new-year'
  >('archives');
  const [yearActionBusy, setYearActionBusy] = useState(false);
  const [yearToast, setYearToast] = useState<string | null>(null);
  const isOnline = useOnlineStatus();
  const shouldReduceMotion = useReducedMotion();

  const showYearToast = (msg: string) => {
    setYearToast(msg);
    setTimeout(() => {
      setYearToast((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setViewingArchive(null);
        setArchives([]);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    let unsubWorkspace: (() => void) | undefined;
    let unsubArchives: (() => void) | undefined;

    const initCloud = async () => {
      setCloudBooting(true);
      setCloudError(null);
      try {
        const seed = loadLocalSeedFallback();
        await ensureTeacherWorkspace(
          firebaseUser.uid,
          seed,
          firebaseUser.email
        );
        if (!active) return;

        unsubWorkspace = subscribeTeacherWorkspace(firebaseUser.uid, {
          onWorkspaceMeta: (meta) => {
            setState((prev) => ({
              ...prev,
              activeAcademicYear: meta.activeAcademicYear,
              activeSemester: meta.activeSemester,
              schoolProfile: meta.schoolProfile,
              teacherProfile: {
                ...meta.teacherProfile,
                fotoProfil:
                  meta.teacherProfile.fotoProfil ||
                  prev.teacherProfile.fotoProfil,
              },
              gradeWeightTugas: meta.gradeWeightTugas,
              gradeWeightAsas: meta.gradeWeightAsas,
            }));
          },
          onStudents: (students) => {
            setState((prev) => ({ ...prev, students }));
          },
          onSchedules: (schedules) => {
            setState((prev) => ({ ...prev, schedules }));
          },
          onAttendance: (attendance) => {
            setState((prev) => ({ ...prev, attendance }));
          },
          onNotes: (notes) => {
            setState((prev) => ({ ...prev, notes }));
          },
          onGrades: (grades) => {
            setState((prev) => ({ ...prev, grades }));
          },
          onHolidays: (holidays) => {
            setState((prev) => ({ ...prev, holidays }));
          },
          onSyncMeta: (meta) => {
            setSyncMeta(meta);
          },
        });

        unsubArchives = subscribeAcademicYearArchives(
          firebaseUser.uid,
          (list) => {
            setArchives(list);
          }
        );
      } catch (err) {
        if (!active) return;
        setCloudError(
          err instanceof Error
            ? err.message
            : 'Gagal menyinkronkan data dengan cloud.'
        );
      } finally {
        if (active) setCloudBooting(false);
      }
    };

    void initCloud();

    return () => {
      active = false;
      if (unsubWorkspace) unsubWorkspace();
      if (unsubArchives) unsubArchives();
    };
  }, [firebaseUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors silently
    }
  }, [state]);

  const isArchiveMode = Boolean(viewingArchive);
  const displayState = viewingArchive ? viewingArchive.data : state;

  const uniqueClasses = useMemo(
    () => Array.from(new Set(displayState.students.map((s) => s.kelas))).sort(),
    [displayState.students]
  );

  const handleGoogleLogin = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await signOut(auth);
  };

  const uid = firebaseUser?.uid;

  const guardReadOnlyArchive = (): boolean => {
    if (!isArchiveMode) return false;
    showYearToast(
      'Mode Arsip (Baca Saja): Kembali ke Tahun Ajaran Aktif terlebih dahulu untuk mengubah data.'
    );
    return true;
  };

  // Academic Year & Archive handlers
  const handleOpenAcademicYearModal = (
    tab: 'archives' | 'new-year' = 'archives'
  ) => {
    setYearModalInitialTab(tab);
    setYearModalOpen(true);
  };

  const handleUpdateAcademicYear = (
    activeAcademicYear: string,
    activeSemester: SemesterType
  ) => {
    if (guardReadOnlyArchive()) return;
    setState((prev) => ({
      ...prev,
      activeAcademicYear,
      activeSemester,
    }));
    if (uid) void updateAcademicYearMetaDoc(uid, activeAcademicYear, activeSemester);
  };

  const handleSaveArchiveSnapshot = async (label: string) => {
    if (!uid) return;
    setYearActionBusy(true);
    try {
      await archiveCurrentWorkspaceYear(uid, state, label);
      showYearToast(`Cadangan "${label}" berhasil disimpan ke Arsip Cloud.`);
    } catch (err) {
      setCloudError(
        err instanceof Error ? err.message : 'Gagal menyimpan arsip tahun ajaran.'
      );
    } finally {
      setYearActionBusy(false);
    }
  };

  const handleOpenArchive = async (meta: AcademicYearArchiveMeta) => {
    if (!uid) return;
    setYearActionBusy(true);
    try {
      const archivedState = await loadArchiveWorkspaceData(uid, meta);
      setViewingArchive({ meta, data: archivedState });
      showYearToast(`Menampilkan arsip: ${meta.label} (Mode Baca Saja).`);
    } catch (err) {
      setCloudError(
        err instanceof Error ? err.message : 'Gagal memuat data arsip.'
      );
    } finally {
      setYearActionBusy(false);
    }
  };

  const handleDeleteArchive = async (yearId: string) => {
    if (!uid) return;
    setYearActionBusy(true);
    try {
      await deleteArchiveYear(uid, yearId);
      if (viewingArchive?.meta.id === yearId) {
        setViewingArchive(null);
      }
      showYearToast('Arsip tahun ajaran berhasil dihapus.');
    } catch (err) {
      setCloudError(
        err instanceof Error ? err.message : 'Gagal menghapus arsip.'
      );
    } finally {
      setYearActionBusy(false);
    }
  };

  const handleStartNewYear = async (params: StartNewAcademicYearParams) => {
    if (!uid) return;
    setYearActionBusy(true);
    try {
      await startNewAcademicYear(uid, state, params);
      setViewingArchive(null);
      showYearToast(
        `Arsip "${params.archiveCurrentLabel}" tersimpan! Ruang aktif siap untuk TA ${params.newTahunAjaran} (${params.newSemester}).`
      );
    } catch (err) {
      setCloudError(
        err instanceof Error ? err.message : 'Gagal memulai tahun ajaran baru.'
      );
    } finally {
      setYearActionBusy(false);
    }
  };

  // Students handlers
  const handleAddStudent = (student: Omit<Student, 'id'>) => {
    if (guardReadOnlyArchive()) return;
    const newStudent: Student = {
      id: sanitizeId(`std-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
      ...student,
    };
    setState((prev) => ({
      ...prev,
      students: [...prev.students, newStudent],
    }));
    if (uid) void addStudentDoc(uid, newStudent);
  };

  const handleBulkAddStudents = (items: Omit<Student, 'id'>[]): number => {
    if (guardReadOnlyArchive()) return 0;
    const existingNis = new Set(
      state.students.map((s) => s.nis.toLowerCase())
    );
    const toAdd: Student[] = [];
    items.forEach((item, idx) => {
      const key = item.nis.toLowerCase();
      if (!existingNis.has(key)) {
        existingNis.add(key);
        toAdd.push({
          id: sanitizeId(
            `std-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
          ),
          ...item,
        });
      }
    });
    if (toAdd.length > 0) {
      setState((prev) => ({
        ...prev,
        students: [...prev.students, ...toAdd],
      }));
      if (uid) void bulkAddStudentDocs(uid, toAdd);
    }
    return toAdd.length;
  };

  const handleDeleteStudent = (id: string) => {
    if (guardReadOnlyArchive()) return;
    setState((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== id),
    }));
    if (uid) void deleteStudentDoc(uid, id);
  };

  const handleBulkDeleteStudents = (ids: string[]) => {
    if (guardReadOnlyArchive()) return;
    const idSet = new Set(ids);
    setState((prev) => ({
      ...prev,
      students: prev.students.filter((s) => !idSet.has(s.id)),
    }));
    if (uid) void bulkDeleteStudentDocs(uid, ids);
  };

  // Schedule handlers
  const handleAddSchedule = (item: Omit<ScheduleItem, 'id'>) => {
    if (guardReadOnlyArchive()) return;
    const newItem: ScheduleItem = {
      id: sanitizeId(`sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
      ...item,
    };
    setState((prev) => ({
      ...prev,
      schedules: [...prev.schedules, newItem],
    }));
    if (uid) void addScheduleDoc(uid, newItem);
  };

  const handleBulkAddSchedules = (items: Omit<ScheduleItem, 'id'>[]): number => {
    if (guardReadOnlyArchive()) return 0;
    const toAdd: ScheduleItem[] = items.map((item, idx) => ({
      id: sanitizeId(
        `sch-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
      ),
      ...item,
    }));
    if (toAdd.length > 0) {
      setState((prev) => ({
        ...prev,
        schedules: [...prev.schedules, ...toAdd],
      }));
      if (uid) void bulkAddScheduleDocs(uid, toAdd);
    }
    return toAdd.length;
  };

  const handleDeleteSchedule = (id: string) => {
    if (guardReadOnlyArchive()) return;
    setState((prev) => ({
      ...prev,
      schedules: prev.schedules.filter((s) => s.id !== id),
    }));
    if (uid) void deleteScheduleDoc(uid, id);
  };

  const handleBulkDeleteSchedules = (ids: string[]) => {
    if (guardReadOnlyArchive()) return;
    const idSet = new Set(ids);
    setState((prev) => ({
      ...prev,
      schedules: prev.schedules.filter((s) => !idSet.has(s.id)),
    }));
    if (uid) void bulkDeleteScheduleDocs(uid, ids);
  };

  // Attendance handlers
  const handleSetAttendance = (
    dateISO: string,
    studentId: string,
    status: AttendanceStatus
  ) => {
    if (guardReadOnlyArchive()) return;
    const alreadyExists = Boolean(state.attendance[`${dateISO}::${studentId}`]);
    setState((prev) => ({
      ...prev,
      attendance: {
        ...prev.attendance,
        [`${dateISO}::${studentId}`]: status,
      },
    }));
    if (uid) void setAttendanceDoc(uid, dateISO, studentId, status, alreadyExists);
  };

  const handleMarkAllPresent = (dateISO: string, studentIds: string[]) => {
    if (guardReadOnlyArchive()) return;
    const snapshotBefore = state.attendance;
    setState((prev) => {
      const next = { ...prev.attendance };
      studentIds.forEach((id) => {
        next[`${dateISO}::${id}`] = 'Hadir';
      });
      return { ...prev, attendance: next };
    });
    if (uid) void markAllPresentDocs(uid, dateISO, studentIds, snapshotBefore);
  };

  const handleCycleAttendance = (
    dateISO: string,
    studentId: string,
    nextStatus: AttendanceStatus | null
  ) => {
    if (guardReadOnlyArchive()) return;
    const alreadyExists = Boolean(state.attendance[`${dateISO}::${studentId}`]);
    setState((prev) => {
      const next = { ...prev.attendance };
      const key = `${dateISO}::${studentId}`;
      if (nextStatus === null) {
        delete next[key];
      } else {
        next[key] = nextStatus;
      }
      return { ...prev, attendance: next };
    });
    if (uid) {
      if (nextStatus === null) {
        void deleteAttendanceDoc(uid, dateISO, studentId);
      } else {
        void setAttendanceDoc(uid, dateISO, studentId, nextStatus, alreadyExists);
      }
    }
  };

  // Notes handlers
  const handleAddNote = (note: Omit<TeacherNote, 'id'>) => {
    if (guardReadOnlyArchive()) return;
    const newNote: TeacherNote = {
      id: sanitizeId(`note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
      ...note,
    };
    setState((prev) => ({
      ...prev,
      notes: [newNote, ...prev.notes],
    }));
    if (uid) void upsertNoteDoc(uid, newNote, true);
  };

  const handleUpdateNote = (note: TeacherNote) => {
    if (guardReadOnlyArchive()) return;
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === note.id ? note : n)),
    }));
    if (uid) void upsertNoteDoc(uid, note, false);
  };

  const handleDeleteNote = (id: string) => {
    if (guardReadOnlyArchive()) return;
    setState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== id),
    }));
    if (uid) void deleteNoteDoc(uid, id);
  };

  // Grades handlers
  const handleUpdateGradeCell = (
    studentId: string,
    mataPelajaran: string,
    field: { type: 'tugas'; index: number } | { type: 'asas' },
    value: number | null
  ) => {
    if (guardReadOnlyArchive()) return;
    const key = `${studentId}::${mataPelajaran}`;
    const alreadyExists = Boolean(state.grades[key]);
    const existing: StudentGradeRecord = state.grades[key] || {
      studentId,
      mataPelajaran,
      tugas: Array(11).fill(null),
      asasAsat: null,
    };

    const updatedRecord: StudentGradeRecord =
      field.type === 'tugas'
        ? {
            ...existing,
            tugas: existing.tugas.map((v, i) =>
              i === field.index ? value : v
            ),
          }
        : {
            ...existing,
            asasAsat: value,
          };

    setState((prev) => ({
      ...prev,
      grades: {
        ...prev.grades,
        [key]: updatedRecord,
      },
    }));
    if (uid) void upsertGradeDoc(uid, updatedRecord, alreadyExists);
  };

  const handleBulkImportGrades = (
    mataPelajaran: string,
    records: {
      nis: string;
      tugas: (number | null)[];
      asasAsat: number | null;
    }[]
  ): number => {
    if (guardReadOnlyArchive()) return 0;
    const nisToStudent = new Map(
      state.students.map((s) => [s.nis.toLowerCase(), s])
    );
    const nextGrades = { ...state.grades };
    const cloudBatch: Array<{ record: StudentGradeRecord; exists: boolean }> = [];

    records.forEach((rec) => {
      const st = nisToStudent.get(rec.nis.toLowerCase());
      if (!st) return;
      const key = `${st.id}::${mataPelajaran}`;
      const exists = Boolean(state.grades[key]);
      const record: StudentGradeRecord = {
        studentId: st.id,
        mataPelajaran,
        tugas: rec.tugas,
        asasAsat: rec.asasAsat,
      };
      nextGrades[key] = record;
      cloudBatch.push({ record, exists });
    });

    if (cloudBatch.length > 0) {
      setState((prev) => ({ ...prev, grades: nextGrades }));
      if (uid) void bulkUpsertGradeDocs(uid, cloudBatch);
    }
    return cloudBatch.length;
  };

  // Settings handlers
  const handleUpdateSchoolProfile = (schoolProfile: SchoolProfile) => {
    if (guardReadOnlyArchive()) return;
    setState((prev) => ({ ...prev, schoolProfile }));
    if (uid) void updateSchoolProfileDoc(uid, schoolProfile);
  };

  const handleUpdateTeacherProfile = (teacherProfile: TeacherProfile) => {
    if (guardReadOnlyArchive()) return;
    setState((prev) => ({ ...prev, teacherProfile }));
    if (uid) void updateTeacherProfileDoc(uid, teacherProfile);
  };

  const handleAddHoliday = (tanggal: string, keterangan: string) => {
    if (guardReadOnlyArchive()) return;
    const existingForDate = state.holidays.find((h) => h.tanggal === tanggal);
    const holiday = {
      id: existingForDate?.id || sanitizeId(`hol-${Date.now()}`),
      tanggal,
      keterangan,
    };
    setState((prev) => ({
      ...prev,
      holidays: [
        ...prev.holidays.filter((h) => h.tanggal !== tanggal),
        holiday,
      ],
    }));
    if (uid) void upsertHolidayDoc(uid, holiday, Boolean(existingForDate));
  };

  const handleDeleteHoliday = (id: string) => {
    if (guardReadOnlyArchive()) return;
    setState((prev) => ({
      ...prev,
      holidays: prev.holidays.filter((h) => h.id !== id),
    }));
    if (uid) void deleteHolidayDoc(uid, id);
  };

  const handleUpdateWeights = (tugas: number, asas: number) => {
    if (guardReadOnlyArchive()) return;
    setState((prev) => ({
      ...prev,
      gradeWeightTugas: tugas,
      gradeWeightAsas: asas,
    }));
    if (uid) void updateWeightsDoc(uid, tugas, asas);
  };

  const handleResetAllData = () => {
    if (guardReadOnlyArchive()) return;
    const fresh = createInitialAppState();
    setState(fresh);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // Ignore storage errors
    }
    if (uid) {
      void resetWorkspaceInFirestore(uid, fresh, firebaseUser?.email);
    }
  };

  const currentTabMeta = TAB_META[activeTab];
  const CurrentTabIcon = currentTabMeta.icon;

  if (!authReady || (firebaseUser && cloudBooting)) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md mb-4">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <h1 className="text-base font-bold text-slate-900">
            Menyiapkan Sinkronisasi Cloud...
          </h1>
          <p className="mt-1 text-xs text-slate-500 max-w-xs">
            Menghubungkan data siswa, jadwal, absensi, dan nilai Anda secara real-time.
          </p>
        </div>
      </MotionConfig>
    );
  }

  if (!firebaseUser) {
    return (
      <MotionConfig reducedMotion="user">
        <LoginPage
          schoolProfile={state.schoolProfile}
          onGoogleLogin={handleGoogleLogin}
        />
        <OfflineIndicator />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex bg-[#f2f4f8] text-slate-900">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onLogout={handleLogout}
          schoolProfile={displayState.schoolProfile}
          teacherProfile={displayState.teacherProfile}
          cloudEmail={firebaseUser.email}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Floating Workspace Top Bar */}
          <header className="sticky top-0 z-20 px-4 sm:px-6 lg:px-8 pt-3.5 pb-1">
            <div className="max-w-[1440px] mx-auto bg-white/85 backdrop-blur-md border border-slate-200/80 rounded-2xl px-4 sm:px-5 h-14 flex items-center justify-between gap-3 shadow-[0_6px_24px_-16px_rgba(15,23,42,0.12)]">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Buka menu navigasi"
                  className="lg:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
                  <span className="text-slate-400 font-medium hidden sm:inline whitespace-nowrap">
                    Administrasi Guru
                  </span>
                  <span className="text-slate-300 hidden sm:inline">/</span>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={
                        shouldReduceMotion ? false : { opacity: 0, y: -4 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldReduceMotion ? undefined : { opacity: 0, y: 4 }}
                      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-center gap-2 min-w-0"
                    >
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${currentTabMeta.badgeStyle}`}
                      >
                        <CurrentTabIcon className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-bold text-slate-900 truncate">
                        {currentTabMeta.label}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                {/* Academic Year Switcher / Archive Trigger */}
                <button
                  type="button"
                  onClick={() => handleOpenAcademicYearModal('archives')}
                  title="Kelola Tahun Ajaran Baru & Buka Arsip Data Lama"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer ${
                    isArchiveMode
                      ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                      : 'bg-indigo-50/80 border-indigo-200 text-indigo-800 hover:bg-indigo-100/80'
                  }`}
                >
                  <FolderArchive className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">
                    {isArchiveMode
                      ? `Arsip: ${viewingArchive?.meta.tahunAjaran} (${viewingArchive?.meta.semester})`
                      : `TA ${state.activeAcademicYear} · ${state.activeSemester}`}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
                </button>

                <div
                  title={
                    !isOnline
                      ? 'Mode Offline: perubahan akan otomatis dikirim saat online'
                      : syncMeta.hasPendingWrites
                      ? 'Mengirim perubahan ke cloud...'
                      : 'Data tersinkron real-time lintas perangkat'
                  }
                  className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-semibold ${
                    !isOnline
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : syncMeta.hasPendingWrites
                      ? 'bg-sky-50 border-sky-200 text-sky-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  {!isOnline ? (
                    <>
                      <CloudOff className="w-3.5 h-3.5 shrink-0" />
                      <span>Offline</span>
                    </>
                  ) : syncMeta.hasPendingWrites ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>Menyinkronkan</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5 shrink-0" />
                      <span>Tersinkron</span>
                    </>
                  )}
                </div>

                <PWAInstallButton variant="header" />

                <span className="hidden xl:inline truncate max-w-[180px] text-slate-500">
                  {displayState.schoolProfile.namaSekolah}
                </span>
                <span className="hidden xl:inline text-slate-300">·</span>
                <div className="hidden md:flex items-center gap-2">
                  {displayState.teacherProfile.fotoProfil && (
                    <img
                      src={displayState.teacherProfile.fotoProfil}
                      alt={displayState.teacherProfile.namaGuru}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                    />
                  )}
                  <span className="font-semibold text-slate-800 whitespace-nowrap">
                    {displayState.teacherProfile.namaGuru}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {cloudError && (
            <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              Terjadi kendala sinkronisasi cloud: {cloudError}
            </div>
          )}

          {yearToast && (
            <div className="mx-4 sm:mx-6 lg:mx-8 mt-3 max-w-[1440px] self-center w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)] rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900 flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{yearToast}</span>
            </div>
          )}

          {/* Archive Mode Read-Only Banner */}
          {viewingArchive && (
            <div className="mx-4 sm:mx-6 lg:mx-8 mt-3 max-w-[1440px] self-center w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)] rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-2.5 text-xs text-amber-950">
                <span className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4" />
                </span>
                <div>
                  <div className="font-bold">
                    Sedang Membuka Arsip: {viewingArchive.meta.label} (Mode Baca Saja)
                  </div>
                  <div className="text-amber-800/90 mt-0.5">
                    TA {viewingArchive.meta.tahunAjaran} · Semester{' '}
                    {viewingArchive.meta.semester} · Anda dapat melihat seluruh riwayat & mengekspor Excel/PDF tanpa mengubah data aktif.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenAcademicYearModal('archives')}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/70 text-amber-900 text-xs font-semibold cursor-pointer"
                >
                  Pilih Arsip Lain
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewingArchive(null);
                    showYearToast(
                      `Kembali ke Tahun Ajaran Aktif (${state.activeAcademicYear} · ${state.activeSemester}).`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Kembali ke Tahun Aktif</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Content Viewport */}
          <main className="flex-1 p-4 sm:p-6 lg:px-8 lg:py-5 max-w-[1440px] w-full mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${viewingArchive?.meta.id || 'active'}`}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeTab === 'dashboard' && (
                  <DashboardPage
                    state={displayState}
                    onNavigate={setActiveTab}
                    archivesCount={archives.length}
                    onOpenAcademicYearModal={handleOpenAcademicYearModal}
                  />
                )}

                {activeTab === 'siswa' && (
                  <StudentsPage
                    students={displayState.students}
                    onAddStudent={handleAddStudent}
                    onBulkAddStudents={handleBulkAddStudents}
                    onDeleteStudent={handleDeleteStudent}
                    onBulkDeleteStudents={handleBulkDeleteStudents}
                  />
                )}

                {activeTab === 'jadwal' && (
                  <SchedulePage
                    schedules={displayState.schedules}
                    subjects={displayState.teacherProfile.mataPelajaran}
                    classes={uniqueClasses}
                    onAddSchedule={handleAddSchedule}
                    onBulkAddSchedules={handleBulkAddSchedules}
                    onDeleteSchedule={handleDeleteSchedule}
                    onBulkDeleteSchedules={handleBulkDeleteSchedules}
                  />
                )}

                {activeTab === 'absen' && (
                  <AttendancePage
                    students={displayState.students}
                    schedules={displayState.schedules}
                    attendance={displayState.attendance}
                    holidays={displayState.holidays}
                    onSetAttendance={handleSetAttendance}
                    onMarkAllPresent={handleMarkAllPresent}
                  />
                )}

                {activeTab === 'rekap' && (
                  <AttendanceRecapPage
                    students={displayState.students}
                    attendance={displayState.attendance}
                    holidays={displayState.holidays}
                    onCycleAttendance={handleCycleAttendance}
                  />
                )}

                {activeTab === 'catatan' && (
                  <TeacherNotesPage
                    notes={displayState.notes}
                    schedules={displayState.schedules}
                    onAddNote={handleAddNote}
                    onUpdateNote={handleUpdateNote}
                    onDeleteNote={handleDeleteNote}
                  />
                )}

                {activeTab === 'nilai' && (
                  <GradesPage
                    students={displayState.students}
                    subjects={displayState.teacherProfile.mataPelajaran}
                    grades={displayState.grades}
                    schoolProfile={displayState.schoolProfile}
                    teacherProfile={displayState.teacherProfile}
                    weightTugas={displayState.gradeWeightTugas}
                    weightAsas={displayState.gradeWeightAsas}
                    onUpdateGradeCell={handleUpdateGradeCell}
                    onBulkImportGrades={handleBulkImportGrades}
                  />
                )}

                {activeTab === 'pengaturan' && (
                  <SettingsPage
                    state={displayState}
                    cloudUserEmail={firebaseUser.email}
                    archivesCount={archives.length}
                    onUpdateSchoolProfile={handleUpdateSchoolProfile}
                    onUpdateTeacherProfile={handleUpdateTeacherProfile}
                    onUpdateAcademicYear={handleUpdateAcademicYear}
                    onOpenAcademicYearModal={handleOpenAcademicYearModal}
                    onAddHoliday={handleAddHoliday}
                    onDeleteHoliday={handleDeleteHoliday}
                    onUpdateWeights={handleUpdateWeights}
                    onResetAllData={handleResetAllData}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <AcademicYearModal
        open={yearModalOpen}
        initialTab={yearModalInitialTab}
        onClose={() => setYearModalOpen(false)}
        activeState={state}
        archives={archives}
        viewingArchiveId={viewingArchive?.meta.id ?? null}
        busy={yearActionBusy}
        onSaveSnapshot={handleSaveArchiveSnapshot}
        onOpenArchive={handleOpenArchive}
        onReturnToActive={() => {
          setViewingArchive(null);
          showYearToast(
            `Kembali ke Tahun Ajaran Aktif (${state.activeAcademicYear} · ${state.activeSemester}).`
          );
        }}
        onDeleteArchive={handleDeleteArchive}
        onStartNewYear={handleStartNewYear}
      />
      <OfflineIndicator />
    </MotionConfig>
  );
}
