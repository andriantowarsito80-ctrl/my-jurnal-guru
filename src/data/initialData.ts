import { AppState, AttendanceMap, GradesMap, Student } from '../types';
import { toLocalDateISO } from '../utils/dateUtils';
import teacherPortraitImg from '../assets/images/teacher_portrait_1794569693145.jpg';

const INITIAL_STUDENTS: Student[] = [
  { id: 'std-1', nis: '242510001', nama: 'Adinda Putri Rahmawati', kelas: 'XI-A' },
  { id: 'std-2', nis: '242510002', nama: 'Ahmad Fauzan Hakim', kelas: 'XI-A' },
  { id: 'std-3', nis: '242510003', nama: 'Bagas Pratama Wijaya', kelas: 'XI-A' },
  { id: 'std-4', nis: '242510004', nama: 'Citra Dewi Lestari', kelas: 'XI-A' },
  { id: 'std-5', nis: '242510005', nama: 'Daffa Ramadhan Putra', kelas: 'XI-A' },
  { id: 'std-6', nis: '242510006', nama: 'Eka Nuryani', kelas: 'XI-A' },
  { id: 'std-7', nis: '242510007', nama: 'Fajar Maulana Sidik', kelas: 'XI-B' },
  { id: 'std-8', nis: '242510008', nama: 'Gina Septiani', kelas: 'XI-B' },
  { id: 'std-9', nis: '242510009', nama: 'Hendra Kurniawan', kelas: 'XI-B' },
  { id: 'std-10', nis: '242510010', nama: 'Indah Permata Sari', kelas: 'XI-B' },
  { id: 'std-11', nis: '242510011', nama: 'Jihan Nabila Azzahra', kelas: 'XI-B' },
  { id: 'std-12', nis: '242510012', nama: 'Kevin Aditya Nugraha', kelas: 'XI-B' },
  { id: 'std-13', nis: '232410013', nama: 'Lutfi Nurhakim', kelas: 'XII-A' },
  { id: 'std-14', nis: '232410014', nama: 'Melati Kusuma Wardani', kelas: 'XII-A' },
  { id: 'std-15', nis: '232410015', nama: 'Nadia Safitri', kelas: 'XII-A' },
  { id: 'std-16', nis: '232410016', nama: 'Rafi Akbar Maulana', kelas: 'XII-A' },
  { id: 'std-17', nis: '232410017', nama: 'Salsa Bila Khoirunnisa', kelas: 'XII-B' },
  { id: 'std-18', nis: '232410018', nama: 'Taufik Hidayat', kelas: 'XII-B' },
  { id: 'std-19', nis: '232410019', nama: 'Vina Oktaviani', kelas: 'XII-B' },
  { id: 'std-20', nis: '232410020', nama: 'Zahra Aulia Putri', kelas: 'XII-B' },
];

function buildInitialAttendance(): AttendanceMap {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDay = now.getDate();
  const map: AttendanceMap = {};

  const maxSeedDay = Math.min(todayDay, 15);
  for (let d = 1; d <= maxSeedDay; d++) {
    const dt = new Date(year, month, d);
    const dayOfWeek = dt.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Sabtu & Minggu libur
    const iso = toLocalDateISO(dt);

    INITIAL_STUDENTS.forEach((student, idx) => {
      // Seed realistic attendance patterns
      if ((d + idx) % 19 === 0) {
        map[`${iso}::${student.id}`] = 'Sakit';
      } else if ((d + idx) % 23 === 0) {
        map[`${iso}::${student.id}`] = 'Izin';
      } else if ((d * 3 + idx) % 37 === 0) {
        map[`${iso}::${student.id}`] = 'Alpa';
      } else {
        map[`${iso}::${student.id}`] = 'Hadir';
      }
    });
  }
  return map;
}

function buildInitialGrades(): GradesMap {
  const grades: GradesMap = {};
  INITIAL_STUDENTS.forEach((student, idx) => {
    const isGrade12 = student.kelas.startsWith('XII');
    const subject = isGrade12 ? 'Matematika Tingkat Lanjut' : 'Matematika';
    const base = 78 + ((idx * 3) % 16);
    const tugas: (number | null)[] = Array.from({ length: 11 }, (_, tIdx) => {
      if (tIdx >= 6) return null; // Tugas 1-6 sudah dinilai, 7-11 siap diisi
      return Math.min(98, base + ((tIdx * 2 + idx) % 9) - 2);
    });
    grades[`${student.id}::${subject}`] = {
      studentId: student.id,
      mataPelajaran: subject,
      tugas,
      asasAsat: Math.min(96, base + 2),
    };
  });
  return grades;
}

export function createInitialAppState(): AppState {
  const now = new Date();
  const todayISO = toLocalDateISO(now);

  return {
    activeAcademicYear: '2025/2026',
    activeSemester: 'Genap',
    schoolProfile: {
      namaSekolah: 'SMA Negeri 1 Majalaya Kabupaten Karawang',
      npsn: '6995810',
      statusAkreditasi: 'Terakreditasi B',
      kepalaSekolah: 'Dr. Ratih Komala, M.Pd.',
      alamat: 'Jl. Raya Majalaya, Kec. Majalaya, Kab. Karawang, Jawa Barat',
    },
    teacherProfile: {
      namaGuru: 'Andrianto S.Pd.',
      nip: '198012142022211010',
      email: 'anhaf14@gmail.com',
      mataPelajaran: ['Matematika', 'Matematika Tingkat Lanjut'],
      fotoProfil: teacherPortraitImg,
    },
    students: INITIAL_STUDENTS,
    schedules: [
      {
        id: 'sch-1',
        hari: 'Senin',
        jamKe: '1-2',
        waktu: '07:00 - 08:30',
        kelas: 'XI-A',
        mataPelajaran: 'Matematika',
      },
      {
        id: 'sch-2',
        hari: 'Senin',
        jamKe: '3-4',
        waktu: '08:30 - 10:00',
        kelas: 'XII-A',
        mataPelajaran: 'Matematika Tingkat Lanjut',
      },
      {
        id: 'sch-3',
        hari: 'Selasa',
        jamKe: '1-2',
        waktu: '07:00 - 08:30',
        kelas: 'XI-B',
        mataPelajaran: 'Matematika',
      },
      {
        id: 'sch-4',
        hari: 'Selasa',
        jamKe: '5-6',
        waktu: '10:15 - 11:45',
        kelas: 'XII-B',
        mataPelajaran: 'Matematika Tingkat Lanjut',
      },
      {
        id: 'sch-5',
        hari: 'Rabu',
        jamKe: '3-4',
        waktu: '08:30 - 10:00',
        kelas: 'XI-A',
        mataPelajaran: 'Matematika',
      },
      {
        id: 'sch-6',
        hari: 'Kamis',
        jamKe: '1-2',
        waktu: '07:00 - 08:30',
        kelas: 'XII-A',
        mataPelajaran: 'Matematika Tingkat Lanjut',
      },
      {
        id: 'sch-7',
        hari: 'Kamis',
        jamKe: '3-4',
        waktu: '08:30 - 10:00',
        kelas: 'XI-B',
        mataPelajaran: 'Matematika',
      },
      {
        id: 'sch-8',
        hari: 'Jumat',
        jamKe: '1-2',
        waktu: '07:00 - 08:20',
        kelas: 'XII-B',
        mataPelajaran: 'Matematika Tingkat Lanjut',
      },
    ],
    attendance: buildInitialAttendance(),
    notes: [
      {
        id: 'note-1',
        tanggal: todayISO,
        hari: 'Senin',
        jamKe: '1-2',
        waktu: '07:00 - 08:30',
        kelas: 'XI-A',
        mataPelajaran: 'Matematika',
        materi: 'Matriks: Determinan dan Invers Ordo 2x2 dan 3x3',
        kegiatan:
          'Diskusi kelompok menyelesaikan soal determinan menggunakan metode Sarrus dan latihan terbimbing di papan tulis.',
        catatan:
          'Sebagian besar siswa sudah memahami konsep determinan. Perlu pendalaman pada operasi invers untuk 3 siswa di pertemuan berikutnya.',
      },
      {
        id: 'note-2',
        tanggal: todayISO,
        hari: 'Senin',
        jamKe: '3-4',
        waktu: '08:30 - 10:00',
        kelas: 'XII-A',
        mataPelajaran: 'Matematika Tingkat Lanjut',
        materi: 'Limit Fungsi Trigonometri dan Aplikasinya',
        kegiatan:
          'Pembuktian rumus dasar limit sin(x)/x, dilanjutkan pengerjaan LKPD secara berpasangan dan presentasi hasil.',
        catatan:
          'Antusiasme kelas sangat baik. Tugas ke-6 telah dibagikan untuk dikumpulkan minggu depan.',
      },
    ],
    grades: buildInitialGrades(),
    holidays: [
      {
        id: 'hol-1',
        tanggal: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-25`,
        keterangan: 'Hari Guru Nasional / Kegiatan Sekolah',
      },
    ],
    credentials: {
      username: 'admin',
      password: '@dmin123',
    },
    gradeWeightTugas: 50,
    gradeWeightAsas: 50,
  };
}
