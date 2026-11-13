import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  AppState,
  AttendanceMap,
  AttendanceStatus,
  GradesMap,
  HolidayItem,
  ScheduleItem,
  SchoolProfile,
  Student,
  StudentGradeRecord,
  TeacherNote,
  TeacherProfile,
} from '../types';

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_');
  return (cleaned || 'id').slice(0, 128);
}

function stableHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function attendanceDocId(dateISO: string, studentId: string): string {
  return sanitizeId(`${dateISO}__${studentId}`);
}

export function gradeDocId(studentId: string, mataPelajaran: string): string {
  const safeStudent = sanitizeId(studentId).slice(0, 56);
  const slug = sanitizeId(mataPelajaran).slice(0, 48);
  return sanitizeId(`${safeStudent}__${slug}__${stableHash(mataPelajaran)}`);
}

function clampString(val: string | undefined, maxLen: number, fallback = ''): string {
  const s = (val ?? fallback).trim();
  return s.slice(0, maxLen);
}

function sanitizeSchoolProfile(sp: SchoolProfile): SchoolProfile {
  return {
    namaSekolah: clampString(sp.namaSekolah, 160, 'Sekolah'),
    npsn: clampString(sp.npsn, 30, '-'),
    statusAkreditasi: clampString(sp.statusAkreditasi, 60, '-'),
    kepalaSekolah: clampString(sp.kepalaSekolah, 120, '-'),
    alamat: clampString(sp.alamat, 300, ''),
  };
}

function sanitizeTeacherProfile(tp: TeacherProfile): TeacherProfile {
  const subjects = (tp.mataPelajaran || [])
    .map((m) => clampString(m, 100))
    .filter(Boolean)
    .slice(0, 20);
  return {
    namaGuru: clampString(tp.namaGuru, 120, 'Guru'),
    nip: clampString(tp.nip, 40, '-'),
    email: clampString(tp.email, 120, 'guru@sekolah.sch.id'),
    mataPelajaran: subjects.length > 0 ? subjects : ['Matematika'],
    fotoProfil:
      typeof tp.fotoProfil === 'string' && tp.fotoProfil.length <= 120000
        ? tp.fotoProfil
        : '',
  };
}

async function commitBatchedWrites(
  ops: Array<(batch: ReturnType<typeof writeBatch>) => void>,
  pathContext: string
) {
  const CHUNK_SIZE = 350;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const slice = ops.slice(i, i + CHUNK_SIZE);
    slice.forEach((fn) => fn(batch));
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, pathContext);
    }
  }
}

async function seedSubcollections(uid: string, seed: AppState): Promise<void> {
  const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  seed.students.forEach((st) => {
    const id = sanitizeId(st.id);
    const ref = doc(db, 'teachers', uid, 'students', id);
    ops.push((batch) =>
      batch.set(ref, {
        id,
        ownerId: uid,
        nis: clampString(st.nis, 40, '-'),
        nama: clampString(st.nama, 120, 'Siswa'),
        kelas: clampString(st.kelas, 40, '-'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  seed.schedules.forEach((sch) => {
    const id = sanitizeId(sch.id);
    const ref = doc(db, 'teachers', uid, 'schedules', id);
    ops.push((batch) =>
      batch.set(ref, {
        id,
        ownerId: uid,
        hari: sch.hari,
        jamKe: clampString(sch.jamKe, 20, '1'),
        waktu: clampString(sch.waktu, 30, '07:00 - 08:30'),
        kelas: clampString(sch.kelas, 40, '-'),
        mataPelajaran: clampString(sch.mataPelajaran, 100, 'Matematika'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  Object.entries(seed.attendance).forEach(([key, status]) => {
    const [dateISO, studentId] = key.split('::');
    if (!dateISO || !studentId) return;
    const docId = attendanceDocId(dateISO, studentId);
    const ref = doc(db, 'teachers', uid, 'attendance', docId);
    ops.push((batch) =>
      batch.set(ref, {
        ownerId: uid,
        dateISO: clampString(dateISO, 10),
        studentId: sanitizeId(studentId),
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  seed.notes.forEach((note) => {
    const id = sanitizeId(note.id);
    const ref = doc(db, 'teachers', uid, 'notes', id);
    ops.push((batch) =>
      batch.set(ref, {
        id,
        ownerId: uid,
        tanggal: clampString(note.tanggal, 10),
        hari: note.hari,
        jamKe: clampString(note.jamKe, 20),
        waktu: clampString(note.waktu, 30),
        kelas: clampString(note.kelas, 40, '-'),
        mataPelajaran: clampString(note.mataPelajaran, 100, 'Matematika'),
        materi: clampString(note.materi, 500, '-'),
        kegiatan: clampString(note.kegiatan, 2000),
        catatan: clampString(note.catatan, 2000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  Object.values(seed.grades).forEach((rec) => {
    const docId = gradeDocId(rec.studentId, rec.mataPelajaran);
    const ref = doc(db, 'teachers', uid, 'grades', docId);
    const tugas = Array.from({ length: 11 }, (_, idx) => {
      const val = rec.tugas[idx];
      return typeof val === 'number' && !Number.isNaN(val)
        ? Math.max(0, Math.min(100, val))
        : null;
    });
    const asasAsat =
      typeof rec.asasAsat === 'number' && !Number.isNaN(rec.asasAsat)
        ? Math.max(0, Math.min(100, rec.asasAsat))
        : null;
    ops.push((batch) =>
      batch.set(ref, {
        ownerId: uid,
        studentId: sanitizeId(rec.studentId),
        mataPelajaran: clampString(rec.mataPelajaran, 100, 'Matematika'),
        tugas,
        asasAsat,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  seed.holidays.forEach((hol) => {
    const id = sanitizeId(hol.id);
    const ref = doc(db, 'teachers', uid, 'holidays', id);
    ops.push((batch) =>
      batch.set(ref, {
        id,
        ownerId: uid,
        tanggal: clampString(hol.tanggal, 10),
        keterangan: clampString(hol.keterangan, 200, 'Libur Sekolah'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  await commitBatchedWrites(ops, `teachers/${uid}/seed`);
}

export async function ensureTeacherWorkspace(
  uid: string,
  initialSeed: AppState,
  userEmail?: string | null
): Promise<void> {
  const workspacePath = `teachers/${uid}`;
  const workspaceRef = doc(db, 'teachers', uid);

  let snap;
  try {
    snap = await getDoc(workspaceRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, workspacePath);
  }

  if (snap && snap.exists()) {
    return;
  }

  const teacherProfile = sanitizeTeacherProfile({
    ...initialSeed.teacherProfile,
    email: userEmail || initialSeed.teacherProfile.email,
  });

  try {
    await setDoc(workspaceRef, {
      ownerId: uid,
      schoolProfile: sanitizeSchoolProfile(initialSeed.schoolProfile),
      teacherProfile,
      gradeWeightTugas: Math.max(
        0,
        Math.min(100, Number(initialSeed.gradeWeightTugas) || 50)
      ),
      gradeWeightAsas: Math.max(
        0,
        Math.min(100, Number(initialSeed.gradeWeightAsas) || 50)
      ),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, workspacePath);
  }

  await seedSubcollections(uid, initialSeed);
}

export interface WorkspaceSyncCallbacks {
  onWorkspaceMeta: (meta: {
    schoolProfile: SchoolProfile;
    teacherProfile: TeacherProfile;
    gradeWeightTugas: number;
    gradeWeightAsas: number;
  }) => void;
  onStudents: (students: Student[]) => void;
  onSchedules: (schedules: ScheduleItem[]) => void;
  onAttendance: (attendance: AttendanceMap) => void;
  onNotes: (notes: TeacherNote[]) => void;
  onGrades: (grades: GradesMap) => void;
  onHolidays: (holidays: HolidayItem[]) => void;
  onSyncMeta?: (status: { hasPendingWrites: boolean; fromCache: boolean }) => void;
}

export function subscribeTeacherWorkspace(
  uid: string,
  callbacks: WorkspaceSyncCallbacks
): Unsubscribe {
  const unsubscribers: Unsubscribe[] = [];

  const workspacePath = `teachers/${uid}`;
  unsubscribers.push(
    onSnapshot(
      doc(db, 'teachers', uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        callbacks.onSyncMeta?.({
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
        });
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        if (data.schoolProfile && data.teacherProfile) {
          callbacks.onWorkspaceMeta({
            schoolProfile: data.schoolProfile as SchoolProfile,
            teacherProfile: data.teacherProfile as TeacherProfile,
            gradeWeightTugas:
              typeof data.gradeWeightTugas === 'number'
                ? data.gradeWeightTugas
                : 50,
            gradeWeightAsas:
              typeof data.gradeWeightAsas === 'number'
                ? data.gradeWeightAsas
                : 50,
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, workspacePath);
      }
    )
  );

  const studentsPath = `teachers/${uid}/students`;
  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'teachers', uid, 'students'), where('ownerId', '==', uid)),
      (snapshot) => {
        const list: Student[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            nis: String(data.nis ?? ''),
            nama: String(data.nama ?? ''),
            kelas: String(data.kelas ?? ''),
          };
        });
        callbacks.onStudents(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, studentsPath);
      }
    )
  );

  const schedulesPath = `teachers/${uid}/schedules`;
  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'teachers', uid, 'schedules'), where('ownerId', '==', uid)),
      (snapshot) => {
        const list: ScheduleItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            hari: data.hari,
            jamKe: String(data.jamKe ?? ''),
            waktu: String(data.waktu ?? ''),
            kelas: String(data.kelas ?? ''),
            mataPelajaran: String(data.mataPelajaran ?? ''),
          };
        });
        callbacks.onSchedules(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, schedulesPath);
      }
    )
  );

  const attendancePath = `teachers/${uid}/attendance`;
  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'teachers', uid, 'attendance'), where('ownerId', '==', uid)),
      (snapshot) => {
        const map: AttendanceMap = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (data.dateISO && data.studentId && data.status) {
            map[`${data.dateISO}::${data.studentId}`] =
              data.status as AttendanceStatus;
          }
        });
        callbacks.onAttendance(map);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, attendancePath);
      }
    )
  );

  const notesPath = `teachers/${uid}/notes`;
  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'teachers', uid, 'notes'), where('ownerId', '==', uid)),
      (snapshot) => {
        const list: TeacherNote[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              tanggal: String(data.tanggal ?? ''),
              hari: data.hari,
              jamKe: String(data.jamKe ?? ''),
              waktu: String(data.waktu ?? ''),
              kelas: String(data.kelas ?? ''),
              mataPelajaran: String(data.mataPelajaran ?? ''),
              materi: String(data.materi ?? ''),
              kegiatan: String(data.kegiatan ?? ''),
              catatan: String(data.catatan ?? ''),
            };
          })
          .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
        callbacks.onNotes(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, notesPath);
      }
    )
  );

  const gradesPath = `teachers/${uid}/grades`;
  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'teachers', uid, 'grades'), where('ownerId', '==', uid)),
      (snapshot) => {
        const map: GradesMap = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (data.studentId && data.mataPelajaran) {
            const key = `${data.studentId}::${data.mataPelajaran}`;
            map[key] = {
              studentId: String(data.studentId),
              mataPelajaran: String(data.mataPelajaran),
              tugas: Array.isArray(data.tugas)
                ? data.tugas.slice(0, 11)
                : Array(11).fill(null),
              asasAsat:
                typeof data.asasAsat === 'number' ? data.asasAsat : null,
            };
          }
        });
        callbacks.onGrades(map);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, gradesPath);
      }
    )
  );

  const holidaysPath = `teachers/${uid}/holidays`;
  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'teachers', uid, 'holidays'), where('ownerId', '==', uid)),
      (snapshot) => {
        const list: HolidayItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            tanggal: String(data.tanggal ?? ''),
            keterangan: String(data.keterangan ?? ''),
          };
        });
        callbacks.onHolidays(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, holidaysPath);
      }
    )
  );

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

// CRUD Mutations

export async function addStudentDoc(uid: string, student: Student): Promise<void> {
  const id = sanitizeId(student.id);
  const path = `teachers/${uid}/students/${id}`;
  try {
    await setDoc(doc(db, 'teachers', uid, 'students', id), {
      id,
      ownerId: uid,
      nis: clampString(student.nis, 40, '-'),
      nama: clampString(student.nama, 120, 'Siswa'),
      kelas: clampString(student.kelas, 40, '-'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function bulkAddStudentDocs(
  uid: string,
  students: Student[]
): Promise<void> {
  if (students.length === 0) return;
  const ops = students.map((st) => {
    const id = sanitizeId(st.id);
    const ref = doc(db, 'teachers', uid, 'students', id);
    return (batch: ReturnType<typeof writeBatch>) =>
      batch.set(ref, {
        id,
        ownerId: uid,
        nis: clampString(st.nis, 40, '-'),
        nama: clampString(st.nama, 120, 'Siswa'),
        kelas: clampString(st.kelas, 40, '-'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
  });
  await commitBatchedWrites(ops, `teachers/${uid}/students`);
}

export async function deleteStudentDoc(uid: string, id: string): Promise<void> {
  const safeId = sanitizeId(id);
  const path = `teachers/${uid}/students/${safeId}`;
  try {
    await deleteDoc(doc(db, 'teachers', uid, 'students', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function bulkDeleteStudentDocs(
  uid: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const ops = ids.map((id) => {
    const ref = doc(db, 'teachers', uid, 'students', sanitizeId(id));
    return (batch: ReturnType<typeof writeBatch>) => batch.delete(ref);
  });
  await commitBatchedWrites(ops, `teachers/${uid}/students`);
}

export async function addScheduleDoc(
  uid: string,
  item: ScheduleItem
): Promise<void> {
  const id = sanitizeId(item.id);
  const path = `teachers/${uid}/schedules/${id}`;
  try {
    await setDoc(doc(db, 'teachers', uid, 'schedules', id), {
      id,
      ownerId: uid,
      hari: item.hari,
      jamKe: clampString(item.jamKe, 20, '1'),
      waktu: clampString(item.waktu, 30, '07:00 - 08:30'),
      kelas: clampString(item.kelas, 40, '-'),
      mataPelajaran: clampString(item.mataPelajaran, 100, 'Matematika'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function bulkAddScheduleDocs(
  uid: string,
  items: ScheduleItem[]
): Promise<void> {
  if (items.length === 0) return;
  const ops = items.map((item) => {
    const id = sanitizeId(item.id);
    const ref = doc(db, 'teachers', uid, 'schedules', id);
    return (batch: ReturnType<typeof writeBatch>) =>
      batch.set(ref, {
        id,
        ownerId: uid,
        hari: item.hari,
        jamKe: clampString(item.jamKe, 20, '1'),
        waktu: clampString(item.waktu, 30, '07:00 - 08:30'),
        kelas: clampString(item.kelas, 40, '-'),
        mataPelajaran: clampString(item.mataPelajaran, 100, 'Matematika'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
  });
  await commitBatchedWrites(ops, `teachers/${uid}/schedules`);
}

export async function deleteScheduleDoc(uid: string, id: string): Promise<void> {
  const safeId = sanitizeId(id);
  const path = `teachers/${uid}/schedules/${safeId}`;
  try {
    await deleteDoc(doc(db, 'teachers', uid, 'schedules', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function bulkDeleteScheduleDocs(
  uid: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const ops = ids.map((id) => {
    const ref = doc(db, 'teachers', uid, 'schedules', sanitizeId(id));
    return (batch: ReturnType<typeof writeBatch>) => batch.delete(ref);
  });
  await commitBatchedWrites(ops, `teachers/${uid}/schedules`);
}

export async function setAttendanceDoc(
  uid: string,
  dateISO: string,
  studentId: string,
  status: AttendanceStatus,
  alreadyExists: boolean
): Promise<void> {
  const docId = attendanceDocId(dateISO, studentId);
  const path = `teachers/${uid}/attendance/${docId}`;
  const ref = doc(db, 'teachers', uid, 'attendance', docId);
  try {
    if (alreadyExists) {
      await updateDoc(ref, {
        status,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ownerId: uid,
        dateISO: clampString(dateISO, 10),
        studentId: sanitizeId(studentId),
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      alreadyExists ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function markAllPresentDocs(
  uid: string,
  dateISO: string,
  studentIds: string[],
  existingAttendance: AttendanceMap
): Promise<void> {
  if (studentIds.length === 0) return;
  const ops = studentIds.map((studentId) => {
    const docId = attendanceDocId(dateISO, studentId);
    const ref = doc(db, 'teachers', uid, 'attendance', docId);
    const exists = Boolean(existingAttendance[`${dateISO}::${studentId}`]);
    return (batch: ReturnType<typeof writeBatch>) => {
      if (exists) {
        batch.update(ref, {
          status: 'Hadir',
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(ref, {
          ownerId: uid,
          dateISO: clampString(dateISO, 10),
          studentId: sanitizeId(studentId),
          status: 'Hadir',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    };
  });
  await commitBatchedWrites(ops, `teachers/${uid}/attendance`);
}

export async function deleteAttendanceDoc(
  uid: string,
  dateISO: string,
  studentId: string
): Promise<void> {
  const docId = attendanceDocId(dateISO, studentId);
  const path = `teachers/${uid}/attendance/${docId}`;
  try {
    await deleteDoc(doc(db, 'teachers', uid, 'attendance', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertNoteDoc(
  uid: string,
  note: TeacherNote,
  isNew: boolean
): Promise<void> {
  const id = sanitizeId(note.id);
  const path = `teachers/${uid}/notes/${id}`;
  const ref = doc(db, 'teachers', uid, 'notes', id);
  try {
    if (isNew) {
      await setDoc(ref, {
        id,
        ownerId: uid,
        tanggal: clampString(note.tanggal, 10),
        hari: note.hari,
        jamKe: clampString(note.jamKe, 20),
        waktu: clampString(note.waktu, 30),
        kelas: clampString(note.kelas, 40, '-'),
        mataPelajaran: clampString(note.mataPelajaran, 100, 'Matematika'),
        materi: clampString(note.materi, 500, '-'),
        kegiatan: clampString(note.kegiatan, 2000),
        catatan: clampString(note.catatan, 2000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        tanggal: clampString(note.tanggal, 10),
        hari: note.hari,
        jamKe: clampString(note.jamKe, 20),
        waktu: clampString(note.waktu, 30),
        kelas: clampString(note.kelas, 40, '-'),
        mataPelajaran: clampString(note.mataPelajaran, 100, 'Matematika'),
        materi: clampString(note.materi, 500, '-'),
        kegiatan: clampString(note.kegiatan, 2000),
        catatan: clampString(note.catatan, 2000),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      path
    );
  }
}

export async function deleteNoteDoc(uid: string, id: string): Promise<void> {
  const safeId = sanitizeId(id);
  const path = `teachers/${uid}/notes/${safeId}`;
  try {
    await deleteDoc(doc(db, 'teachers', uid, 'notes', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertGradeDoc(
  uid: string,
  record: StudentGradeRecord,
  alreadyExists: boolean
): Promise<void> {
  const docId = gradeDocId(record.studentId, record.mataPelajaran);
  const path = `teachers/${uid}/grades/${docId}`;
  const ref = doc(db, 'teachers', uid, 'grades', docId);
  const tugas = Array.from({ length: 11 }, (_, idx) => {
    const val = record.tugas[idx];
    return typeof val === 'number' && !Number.isNaN(val)
      ? Math.max(0, Math.min(100, val))
      : null;
  });
  const asasAsat =
    typeof record.asasAsat === 'number' && !Number.isNaN(record.asasAsat)
      ? Math.max(0, Math.min(100, record.asasAsat))
      : null;
  try {
    if (alreadyExists) {
      await updateDoc(ref, {
        tugas,
        asasAsat,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ownerId: uid,
        studentId: sanitizeId(record.studentId),
        mataPelajaran: clampString(record.mataPelajaran, 100, 'Matematika'),
        tugas,
        asasAsat,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      alreadyExists ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function bulkUpsertGradeDocs(
  uid: string,
  records: Array<{ record: StudentGradeRecord; exists: boolean }>
): Promise<void> {
  if (records.length === 0) return;
  const ops = records.map(({ record, exists }) => {
    const docId = gradeDocId(record.studentId, record.mataPelajaran);
    const ref = doc(db, 'teachers', uid, 'grades', docId);
    const tugas = Array.from({ length: 11 }, (_, idx) => {
      const val = record.tugas[idx];
      return typeof val === 'number' && !Number.isNaN(val)
        ? Math.max(0, Math.min(100, val))
        : null;
    });
    const asasAsat =
      typeof record.asasAsat === 'number' && !Number.isNaN(record.asasAsat)
        ? Math.max(0, Math.min(100, record.asasAsat))
        : null;
    return (batch: ReturnType<typeof writeBatch>) => {
      if (exists) {
        batch.update(ref, {
          tugas,
          asasAsat,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(ref, {
          ownerId: uid,
          studentId: sanitizeId(record.studentId),
          mataPelajaran: clampString(record.mataPelajaran, 100, 'Matematika'),
          tugas,
          asasAsat,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    };
  });
  await commitBatchedWrites(ops, `teachers/${uid}/grades`);
}

export async function upsertHolidayDoc(
  uid: string,
  holiday: HolidayItem,
  alreadyExists: boolean
): Promise<void> {
  const id = sanitizeId(holiday.id);
  const path = `teachers/${uid}/holidays/${id}`;
  const ref = doc(db, 'teachers', uid, 'holidays', id);
  try {
    if (alreadyExists) {
      await updateDoc(ref, {
        tanggal: clampString(holiday.tanggal, 10),
        keterangan: clampString(holiday.keterangan, 200, 'Libur Sekolah'),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id,
        ownerId: uid,
        tanggal: clampString(holiday.tanggal, 10),
        keterangan: clampString(holiday.keterangan, 200, 'Libur Sekolah'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      alreadyExists ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function deleteHolidayDoc(uid: string, id: string): Promise<void> {
  const safeId = sanitizeId(id);
  const path = `teachers/${uid}/holidays/${safeId}`;
  try {
    await deleteDoc(doc(db, 'teachers', uid, 'holidays', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateSchoolProfileDoc(
  uid: string,
  schoolProfile: SchoolProfile
): Promise<void> {
  const path = `teachers/${uid}`;
  try {
    await updateDoc(doc(db, 'teachers', uid), {
      schoolProfile: sanitizeSchoolProfile(schoolProfile),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateTeacherProfileDoc(
  uid: string,
  teacherProfile: TeacherProfile
): Promise<void> {
  const path = `teachers/${uid}`;
  try {
    await updateDoc(doc(db, 'teachers', uid), {
      teacherProfile: sanitizeTeacherProfile(teacherProfile),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateWeightsDoc(
  uid: string,
  tugas: number,
  asas: number
): Promise<void> {
  const path = `teachers/${uid}`;
  try {
    await updateDoc(doc(db, 'teachers', uid), {
      gradeWeightTugas: Math.max(0, Math.min(100, Number(tugas) || 0)),
      gradeWeightAsas: Math.max(0, Math.min(100, Number(asas) || 0)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resetWorkspaceInFirestore(
  uid: string,
  fresh: AppState,
  userEmail?: string | null
): Promise<void> {
  const subcollections = [
    'students',
    'schedules',
    'attendance',
    'notes',
    'grades',
    'holidays',
  ] as const;

  const deleteOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  for (const sub of subcollections) {
    const colPath = `teachers/${uid}/${sub}`;
    try {
      const snap = await getDocs(
        query(collection(db, 'teachers', uid, sub), where('ownerId', '==', uid))
      );
      snap.docs.forEach((d) => {
        deleteOps.push((batch) => batch.delete(d.ref));
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  }
  await commitBatchedWrites(deleteOps, `teachers/${uid}/reset`);

  try {
    await updateDoc(doc(db, 'teachers', uid), {
      schoolProfile: sanitizeSchoolProfile(fresh.schoolProfile),
      teacherProfile: sanitizeTeacherProfile({
        ...fresh.teacherProfile,
        email: userEmail || fresh.teacherProfile.email,
      }),
      gradeWeightTugas: fresh.gradeWeightTugas,
      gradeWeightAsas: fresh.gradeWeightAsas,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `teachers/${uid}`);
  }

  await seedSubcollections(uid, fresh);
}
