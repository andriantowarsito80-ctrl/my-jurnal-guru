import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react';
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
} from 'lucide-react';
import {
  AppState,
  AttendanceStatus,
  NavTab,
  ScheduleItem,
  SchoolProfile,
  Student,
  TeacherNote,
  TeacherProfile,
} from './types';
import { createInitialAppState } from './data/initialData';
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

const STORAGE_KEY = 'administrasi_guru_sman1_majalaya_v1';
const AUTH_KEY = 'administrasi_guru_sman1_auth_v1';

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

function loadState(): AppState {
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
  const [state, setState] = useState<AppState>(() => loadState());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTH_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors silently
    }
  }, [state]);

  const uniqueClasses = useMemo(
    () => Array.from(new Set(state.students.map((s) => s.kelas))).sort(),
    [state.students]
  );

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    try {
      localStorage.setItem(AUTH_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setMobileMenuOpen(false);
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  // Students handlers
  const handleAddStudent = (student: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      id: `std-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...student,
    };
    setState((prev) => ({
      ...prev,
      students: [...prev.students, newStudent],
    }));
  };

  const handleBulkAddStudents = (items: Omit<Student, 'id'>[]): number => {
    let addedCount = 0;
    setState((prev) => {
      const existingNis = new Set(
        prev.students.map((s) => s.nis.toLowerCase())
      );
      const toAdd: Student[] = [];
      items.forEach((item, idx) => {
        const key = item.nis.toLowerCase();
        if (!existingNis.has(key)) {
          existingNis.add(key);
          toAdd.push({
            id: `std-${Date.now()}-${idx}-${Math.random()
              .toString(36)
              .slice(2, 6)}`,
            ...item,
          });
        }
      });
      addedCount = toAdd.length;
      return {
        ...prev,
        students: [...prev.students, ...toAdd],
      };
    });
    return addedCount;
  };

  const handleDeleteStudent = (id: string) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== id),
    }));
  };

  const handleBulkDeleteStudents = (ids: string[]) => {
    const idSet = new Set(ids);
    setState((prev) => ({
      ...prev,
      students: prev.students.filter((s) => !idSet.has(s.id)),
    }));
  };

  // Schedule handlers
  const handleAddSchedule = (item: Omit<ScheduleItem, 'id'>) => {
    const newItem: ScheduleItem = {
      id: `sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...item,
    };
    setState((prev) => ({
      ...prev,
      schedules: [...prev.schedules, newItem],
    }));
  };

  const handleBulkAddSchedules = (items: Omit<ScheduleItem, 'id'>[]): number => {
    const toAdd: ScheduleItem[] = items.map((item, idx) => ({
      id: `sch-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      ...item,
    }));
    setState((prev) => ({
      ...prev,
      schedules: [...prev.schedules, ...toAdd],
    }));
    return toAdd.length;
  };

  const handleDeleteSchedule = (id: string) => {
    setState((prev) => ({
      ...prev,
      schedules: prev.schedules.filter((s) => s.id !== id),
    }));
  };

  const handleBulkDeleteSchedules = (ids: string[]) => {
    const idSet = new Set(ids);
    setState((prev) => ({
      ...prev,
      schedules: prev.schedules.filter((s) => !idSet.has(s.id)),
    }));
  };

  // Attendance handlers
  const handleSetAttendance = (
    dateISO: string,
    studentId: string,
    status: AttendanceStatus
  ) => {
    setState((prev) => ({
      ...prev,
      attendance: {
        ...prev.attendance,
        [`${dateISO}::${studentId}`]: status,
      },
    }));
  };

  const handleMarkAllPresent = (dateISO: string, studentIds: string[]) => {
    setState((prev) => {
      const next = { ...prev.attendance };
      studentIds.forEach((id) => {
        next[`${dateISO}::${id}`] = 'Hadir';
      });
      return { ...prev, attendance: next };
    });
  };

  const handleCycleAttendance = (
    dateISO: string,
    studentId: string,
    nextStatus: AttendanceStatus | null
  ) => {
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
  };

  // Notes handlers
  const handleAddNote = (note: Omit<TeacherNote, 'id'>) => {
    const newNote: TeacherNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...note,
    };
    setState((prev) => ({
      ...prev,
      notes: [newNote, ...prev.notes],
    }));
  };

  const handleUpdateNote = (note: TeacherNote) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === note.id ? note : n)),
    }));
  };

  const handleDeleteNote = (id: string) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== id),
    }));
  };

  // Grades handlers
  const handleUpdateGradeCell = (
    studentId: string,
    mataPelajaran: string,
    field: { type: 'tugas'; index: number } | { type: 'asas' },
    value: number | null
  ) => {
    const key = `${studentId}::${mataPelajaran}`;
    setState((prev) => {
      const existing = prev.grades[key] || {
        studentId,
        mataPelajaran,
        tugas: Array(11).fill(null),
        asasAsat: null,
      };
      if (field.type === 'tugas') {
        const nextTugas = [...existing.tugas];
        nextTugas[field.index] = value;
        return {
          ...prev,
          grades: {
            ...prev.grades,
            [key]: { ...existing, tugas: nextTugas },
          },
        };
      } else {
        return {
          ...prev,
          grades: {
            ...prev.grades,
            [key]: { ...existing, asasAsat: value },
          },
        };
      }
    });
  };

  const handleBulkImportGrades = (
    mataPelajaran: string,
    records: {
      nis: string;
      tugas: (number | null)[];
      asasAsat: number | null;
    }[]
  ): number => {
    let updatedCount = 0;
    setState((prev) => {
      const nisToStudent = new Map(
        prev.students.map((s) => [s.nis.toLowerCase(), s])
      );
      const nextGrades = { ...prev.grades };

      records.forEach((rec) => {
        const st = nisToStudent.get(rec.nis.toLowerCase());
        if (!st) return;
        const key = `${st.id}::${mataPelajaran}`;
        nextGrades[key] = {
          studentId: st.id,
          mataPelajaran,
          tugas: rec.tugas,
          asasAsat: rec.asasAsat,
        };
        updatedCount += 1;
      });

      return { ...prev, grades: nextGrades };
    });
    return updatedCount;
  };

  // Settings handlers
  const handleUpdateSchoolProfile = (schoolProfile: SchoolProfile) => {
    setState((prev) => ({ ...prev, schoolProfile }));
  };

  const handleUpdateTeacherProfile = (teacherProfile: TeacherProfile) => {
    setState((prev) => ({ ...prev, teacherProfile }));
  };

  const handleAddHoliday = (tanggal: string, keterangan: string) => {
    setState((prev) => ({
      ...prev,
      holidays: [
        ...prev.holidays.filter((h) => h.tanggal !== tanggal),
        {
          id: `hol-${Date.now()}`,
          tanggal,
          keterangan,
        },
      ],
    }));
  };

  const handleDeleteHoliday = (id: string) => {
    setState((prev) => ({
      ...prev,
      holidays: prev.holidays.filter((h) => h.id !== id),
    }));
  };

  const handleUpdateWeights = (tugas: number, asas: number) => {
    setState((prev) => ({
      ...prev,
      gradeWeightTugas: tugas,
      gradeWeightAsas: asas,
    }));
  };

  const handleUpdatePassword = (newPassword: string) => {
    setState((prev) => ({
      ...prev,
      credentials: { ...prev.credentials, password: newPassword },
    }));
  };

  const handleResetAllData = () => {
    const fresh = createInitialAppState();
    setState(fresh);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // Ignore storage errors
    }
  };

  const currentTabMeta = TAB_META[activeTab];
  const CurrentTabIcon = currentTabMeta.icon;

  if (!isAuthenticated) {
    return (
      <MotionConfig reducedMotion="user">
        <LoginPage
          credentials={state.credentials}
          schoolProfile={state.schoolProfile}
          onLoginSuccess={handleLoginSuccess}
        />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex bg-slate-50 text-slate-900">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onLogout={handleLogout}
          schoolProfile={state.schoolProfile}
          teacherProfile={state.teacherProfile}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Workspace Header */}
          <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Buka menu navigasi"
                className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
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
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${currentTabMeta.badgeStyle}`}
                    >
                      <CurrentTabIcon className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-semibold text-slate-900 truncate">
                      {currentTabMeta.label}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
              <span className="hidden md:inline truncate max-w-[260px]">
                {state.schoolProfile.namaSekolah}
              </span>
              <span className="hidden md:inline text-slate-300">·</span>
              <span className="font-semibold text-slate-700 whitespace-nowrap">
                {state.teacherProfile.namaGuru}
              </span>
            </div>
          </header>

          {/* Main Content Viewport */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeTab === 'dashboard' && (
                  <DashboardPage state={state} onNavigate={setActiveTab} />
                )}

                {activeTab === 'siswa' && (
                  <StudentsPage
                    students={state.students}
                    onAddStudent={handleAddStudent}
                    onBulkAddStudents={handleBulkAddStudents}
                    onDeleteStudent={handleDeleteStudent}
                    onBulkDeleteStudents={handleBulkDeleteStudents}
                  />
                )}

                {activeTab === 'jadwal' && (
                  <SchedulePage
                    schedules={state.schedules}
                    subjects={state.teacherProfile.mataPelajaran}
                    classes={uniqueClasses}
                    onAddSchedule={handleAddSchedule}
                    onBulkAddSchedules={handleBulkAddSchedules}
                    onDeleteSchedule={handleDeleteSchedule}
                    onBulkDeleteSchedules={handleBulkDeleteSchedules}
                  />
                )}

                {activeTab === 'absen' && (
                  <AttendancePage
                    students={state.students}
                    schedules={state.schedules}
                    attendance={state.attendance}
                    holidays={state.holidays}
                    onSetAttendance={handleSetAttendance}
                    onMarkAllPresent={handleMarkAllPresent}
                  />
                )}

                {activeTab === 'rekap' && (
                  <AttendanceRecapPage
                    students={state.students}
                    attendance={state.attendance}
                    holidays={state.holidays}
                    onCycleAttendance={handleCycleAttendance}
                  />
                )}

                {activeTab === 'catatan' && (
                  <TeacherNotesPage
                    notes={state.notes}
                    schedules={state.schedules}
                    onAddNote={handleAddNote}
                    onUpdateNote={handleUpdateNote}
                    onDeleteNote={handleDeleteNote}
                  />
                )}

                {activeTab === 'nilai' && (
                  <GradesPage
                    students={state.students}
                    subjects={state.teacherProfile.mataPelajaran}
                    grades={state.grades}
                    schoolProfile={state.schoolProfile}
                    teacherProfile={state.teacherProfile}
                    weightTugas={state.gradeWeightTugas}
                    weightAsas={state.gradeWeightAsas}
                    onUpdateGradeCell={handleUpdateGradeCell}
                    onBulkImportGrades={handleBulkImportGrades}
                  />
                )}

                {activeTab === 'pengaturan' && (
                  <SettingsPage
                    state={state}
                    onUpdateSchoolProfile={handleUpdateSchoolProfile}
                    onUpdateTeacherProfile={handleUpdateTeacherProfile}
                    onAddHoliday={handleAddHoliday}
                    onDeleteHoliday={handleDeleteHoliday}
                    onUpdateWeights={handleUpdateWeights}
                    onUpdatePassword={handleUpdatePassword}
                    onResetAllData={handleResetAllData}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
