export type DayName = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';

export type WorkingDay = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';

export type AttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';

export interface SchoolProfile {
  namaSekolah: string;
  npsn: string;
  statusAkreditasi: string;
  kepalaSekolah: string;
  alamat?: string;
}

export interface TeacherProfile {
  namaGuru: string;
  nip: string;
  email: string;
  mataPelajaran: string[];
  fotoProfil: string;
}

export interface Student {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
}

export interface ScheduleItem {
  id: string;
  hari: WorkingDay;
  jamKe: string; // e.g., "1", "1-2", "3"
  waktu: string; // e.g., "07:00 - 07:45"
  kelas: string;
  mataPelajaran: string;
}

// Key format: `${dateISO}::${studentId}` where dateISO is YYYY-MM-DD
export type AttendanceMap = Record<string, AttendanceStatus>;

export interface TeacherNote {
  id: string;
  tanggal: string; // YYYY-MM-DD
  hari: DayName;
  jamKe: string;
  waktu: string;
  kelas: string;
  mataPelajaran: string;
  materi: string;
  kegiatan: string;
  catatan: string;
}

export interface StudentGradeRecord {
  // Keyed by `${studentId}::${mataPelajaran}`
  studentId: string;
  mataPelajaran: string;
  tugas: (number | null)[]; // length 11 (Tugas 1 - 11)
  asasAsat: number | null;
}

export type GradesMap = Record<string, StudentGradeRecord>;

export interface HolidayItem {
  id: string;
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export type SemesterType = 'Ganjil' | 'Genap';

export type NavTab =
  | 'dashboard'
  | 'siswa'
  | 'jadwal'
  | 'absen'
  | 'rekap'
  | 'catatan'
  | 'nilai'
  | 'pengaturan';

export interface ArchiveSummaryStats {
  studentCount: number;
  scheduleCount: number;
  attendanceCount: number;
  noteCount: number;
  gradeCount: number;
  holidayCount?: number;
}

export interface AcademicYearArchiveMeta {
  id: string;
  label: string;
  tahunAjaran: string;
  semester: SemesterType;
  schoolProfile: SchoolProfile;
  teacherProfile: TeacherProfile;
  gradeWeightTugas: number;
  gradeWeightAsas: number;
  summaryStats: ArchiveSummaryStats;
  archivedAtISO: string;
}

export interface StartNewAcademicYearParams {
  archiveCurrentLabel: string;
  newTahunAjaran: string;
  newSemester: SemesterType;
  newSubjects: string[];
  studentMode: 'clear' | 'keep';
  scheduleMode: 'clear' | 'keep';
}

export interface AppState {
  activeAcademicYear: string;
  activeSemester: SemesterType;
  schoolProfile: SchoolProfile;
  teacherProfile: TeacherProfile;
  students: Student[];
  schedules: ScheduleItem[];
  attendance: AttendanceMap;
  notes: TeacherNote[];
  grades: GradesMap;
  holidays: HolidayItem[];
  credentials: AuthCredentials;
  gradeWeightTugas: number; // percentage 0-100, default 50
  gradeWeightAsas: number; // percentage 0-100, default 50
}
