import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  CheckCheck,
  CalendarOff,
  CalendarClock,
  Users,
  Check,
  Clock,
  HeartPulse,
  XCircle,
  X,
  Volume2,
  VolumeX,
  ClipboardCheck,
  Megaphone,
  SkipBack,
  SkipForward,
  RotateCcw,
  Square,
} from 'lucide-react';
import {
  AttendanceMap,
  AttendanceStatus,
  HolidayItem,
  ScheduleItem,
  Student,
} from '../types';
import {
  formatIndonesianDate,
  getDayNameFromISO,
  getHolidayInfo,
  getWeekDatesAround,
  toLocalDateISO,
} from '../utils/dateUtils';
import {
  getAvailableWebSpeechVoices,
  isWebSpeechSupported,
  speakAttendancePhrase,
  stopSpeaking,
  VoiceMode,
} from '../utils/speech';

interface AttendancePageProps {
  students: Student[];
  schedules: ScheduleItem[];
  attendance: AttendanceMap;
  holidays: HolidayItem[];
  onSetAttendance: (
    dateISO: string,
    studentId: string,
    status: AttendanceStatus
  ) => void;
  onMarkAllPresent: (dateISO: string, studentIds: string[]) => void;
}

const STATUS_OPTIONS: {
  value: AttendanceStatus;
  short: string;
  activeBg: string;
  ringColor: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'Hadir',
    short: 'Hadir',
    activeBg: 'bg-emerald-600 border-emerald-600',
    ringColor: 'border-emerald-400',
    icon: Check,
  },
  {
    value: 'Izin',
    short: 'Izin',
    activeBg: 'bg-blue-600 border-blue-600',
    ringColor: 'border-blue-400',
    icon: Clock,
  },
  {
    value: 'Sakit',
    short: 'Sakit',
    activeBg: 'bg-amber-500 border-amber-500',
    ringColor: 'border-amber-400',
    icon: HeartPulse,
  },
  {
    value: 'Alpa',
    short: 'Alpa',
    activeBg: 'bg-red-600 border-red-600',
    ringColor: 'border-red-400',
    icon: XCircle,
  },
];

export const AttendancePage: React.FC<AttendancePageProps> = ({
  students,
  schedules,
  attendance,
  holidays,
  onSetAttendance,
  onMarkAllPresent,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    toLocalDateISO(new Date())
  );

  const uniqueClasses = useMemo(
    () => Array.from(new Set(students.map((s) => s.kelas))).sort(),
    [students]
  );

  const [selectedKelas, setSelectedKelas] = useState<string>(
    uniqueClasses[0] || 'Semua'
  );
  const [recentClick, setRecentClick] = useState<{
    key: string;
    nonce: number;
  } | null>(null);
  const [attendanceFeedback, setAttendanceFeedback] = useState<{
    id: number;
    status: AttendanceStatus;
    title: string;
    subtitle: string;
  } | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ag_attendance_voice_enabled');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(() => {
    const supported = isWebSpeechSupported();
    try {
      const saved = localStorage.getItem('ag_attendance_voice_mode');
      if (
        (saved === 'webspeech-ibu' || saved === 'webspeech-pak') &&
        supported
      ) {
        return saved;
      }
      if (saved === 'gemini-kore' || saved === 'gemini-puck') {
        return saved;
      }
    } catch {
      // ignore storage read error
    }
    return supported ? 'webspeech-ibu' : 'gemini-kore';
  });
  const [webSpeechVoices, setWebSpeechVoices] = useState<
    SpeechSynthesisVoice[]
  >(() => getAvailableWebSpeechVoices());
  const [selectedWebSpeechURI, setSelectedWebSpeechURI] = useState<string>(
    () => {
      try {
        return localStorage.getItem('ag_attendance_webspeech_uri') || '';
      } catch {
        return '';
      }
    }
  );
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [rollCallActive, setRollCallActive] = useState<boolean>(false);
  const [callingStudentId, setCallingStudentId] = useState<string | null>(null);
  const [autoAdvanceRollCall, setAutoAdvanceRollCall] = useState<boolean>(true);
  const [onlyUnmarkedRollCall, setOnlyUnmarkedRollCall] = useState<boolean>(false);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const rollCallActiveRef = useRef<boolean>(false);
  const webSpeechAvailable = useMemo(() => isWebSpeechSupported(), []);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    rollCallActiveRef.current = rollCallActive;
  }, [rollCallActive]);

  useEffect(() => {
    if (!webSpeechAvailable) return;
    const syncVoices = () => {
      setWebSpeechVoices(getAvailableWebSpeechVoices());
    };
    syncVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', syncVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', syncVoices);
    };
  }, [webSpeechAvailable]);

  useEffect(() => {
    try {
      localStorage.setItem('ag_attendance_voice_enabled', String(voiceEnabled));
    } catch {
      // ignore
    }
  }, [voiceEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('ag_attendance_voice_mode', voiceMode);
    } catch {
      // ignore
    }
  }, [voiceMode]);

  useEffect(() => {
    try {
      localStorage.setItem('ag_attendance_webspeech_uri', selectedWebSpeechURI);
    } catch {
      // ignore
    }
  }, [selectedWebSpeechURI]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        window.clearTimeout(autoAdvanceTimerRef.current);
      }
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!attendanceFeedback) return;
    const timer = window.setTimeout(() => {
      setAttendanceFeedback(null);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [attendanceFeedback]);

  const clearAutoAdvanceTimer = () => {
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  };

  const callStudentName = (student: Student) => {
    clearAutoAdvanceTimer();
    if (!voiceEnabled) {
      setVoiceEnabled(true);
    }
    setCallingStudentId(student.id);
    rowRefs.current[student.id]?.scrollIntoView({
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });

    const promptText = `${student.nama}, hadirkah hari ini?`;
    void speakAttendancePhrase({
      text: promptText,
      style:
        'Warm, clear, friendly Indonesian school teacher calling attendance in class',
      mode: voiceMode,
      webSpeechVoiceURI: selectedWebSpeechURI || undefined,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  };

  const triggerAttendanceMessage = (
    status: AttendanceStatus,
    studentName: string,
    onAfterSpeech?: () => void
  ) => {
    const messages: Record<
      AttendanceStatus,
      { title: string; subtitle: string; spoken: string; style: string }
    > = {
      Hadir: {
        title: `Terima kasih telah hadir hari ini, ${studentName}!`,
        subtitle: 'Semangat mengikuti pembelajaran hari ini.',
        spoken: `Hadir, ${studentName}. Terima kasih telah hadir hari ini!`,
        style: 'Warm, cheerful, encouraging Indonesian teacher voice',
      },
      Izin: {
        title: `Izin tercatat untuk ${studentName}`,
        subtitle: 'Semoga segala urusan atau keperluannya berjalan lancar.',
        spoken: `Izin, ${studentName}. Semoga urusannya berjalan lancar.`,
        style: 'Calm, polite, supportive Indonesian teacher voice',
      },
      Sakit: {
        title: `Semoga lekas sembuh, ${studentName}`,
        subtitle: 'Istirahat yang cukup agar segera sehat dan dapat belajar kembali.',
        spoken: `Sakit, ${studentName}. Semoga lekas sembuh ya!`,
        style: 'Gentle, empathetic, caring Indonesian teacher voice',
      },
      Alpa: {
        title: `Ketidakhadiran dicatat untuk ${studentName}`,
        subtitle: 'Semoga dapat hadir kembali pada pertemuan berikutnya.',
        spoken: `Alpa, ${studentName}. Ketidakhadiran dicatat.`,
        style: 'Calm, clear, gentle Indonesian teacher voice',
      },
    };
    const msg = messages[status];
    setAttendanceFeedback({
      id: Date.now(),
      status,
      title: msg.title,
      subtitle: msg.subtitle,
    });

    if (voiceEnabled) {
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        setIsSpeaking(false);
        onAfterSpeech?.();
      };
      if (onAfterSpeech) {
        clearAutoAdvanceTimer();
        autoAdvanceTimerRef.current = window.setTimeout(done, 3200);
      }
      void speakAttendancePhrase({
        text: msg.spoken,
        style: msg.style,
        mode: voiceMode,
        webSpeechVoiceURI: selectedWebSpeechURI || undefined,
        onStart: () => setIsSpeaking(true),
        onEnd: () => {
          clearAutoAdvanceTimer();
          if (onAfterSpeech) {
            autoAdvanceTimerRef.current = window.setTimeout(done, 320);
          } else {
            done();
          }
        },
      });
    } else if (onAfterSpeech) {
      clearAutoAdvanceTimer();
      autoAdvanceTimerRef.current = window.setTimeout(onAfterSpeech, 650);
    }
  };

  const dayName = getDayNameFromISO(selectedDate);
  const holidayInfo = getHolidayInfo(selectedDate, holidays);
  const weekStrip = useMemo(
    () => getWeekDatesAround(selectedDate),
    [selectedDate]
  );

  // Jadwal mengajar yang sesuai dengan Hari yang dipilih
  const daySchedules = useMemo(
    () =>
      schedules
        .filter((s) => s.hari === dayName)
        .sort((a, b) =>
          a.jamKe.localeCompare(b.jamKe, undefined, { numeric: true })
        ),
    [schedules, dayName]
  );

  // Jadwal mengajar untuk kelas yang sedang difilter pada hari ini
  const classDaySchedules = useMemo(() => {
    if (selectedKelas === 'Semua') return daySchedules;
    return daySchedules.filter((s) => s.kelas === selectedKelas);
  }, [daySchedules, selectedKelas]);

  // Siswa di kelas terpilih, terurut A-Z
  const filteredStudents = useMemo(() => {
    const list =
      selectedKelas === 'Semua'
        ? students
        : students.filter((s) => s.kelas === selectedKelas);
    return [...list].sort((a, b) =>
      a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' })
    );
  }, [students, selectedKelas]);

  const summary = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;
    filteredStudents.forEach((st) => {
      const val = attendance[`${selectedDate}::${st.id}`];
      if (val === 'Hadir') hadir++;
      else if (val === 'Izin') izin++;
      else if (val === 'Sakit') sakit++;
      else if (val === 'Alpa') alpa++;
    });
    return { hadir, izin, sakit, alpa };
  }, [filteredStudents, attendance, selectedDate]);

  const rollCallList = useMemo(() => {
    if (!onlyUnmarkedRollCall) return filteredStudents;
    const unmarked = filteredStudents.filter(
      (st) => !attendance[`${selectedDate}::${st.id}`]
    );
    return unmarked.length > 0 ? unmarked : filteredStudents;
  }, [filteredStudents, onlyUnmarkedRollCall, attendance, selectedDate]);

  const currentCallingStudent = useMemo(
    () =>
      filteredStudents.find((s) => s.id === callingStudentId) ||
      rollCallList[0] ||
      null,
    [filteredStudents, rollCallList, callingStudentId]
  );

  const currentCallingIndex = useMemo(() => {
    if (!currentCallingStudent) return -1;
    return filteredStudents.findIndex((s) => s.id === currentCallingStudent.id);
  }, [filteredStudents, currentCallingStudent]);

  const stopRollCall = () => {
    clearAutoAdvanceTimer();
    stopSpeaking();
    setIsSpeaking(false);
    setRollCallActive(false);
    setCallingStudentId(null);
  };

  const startRollCall = () => {
    if (holidayInfo.isHoliday || filteredStudents.length === 0) return;
    const first =
      filteredStudents.find((st) => !attendance[`${selectedDate}::${st.id}`]) ||
      filteredStudents[0];
    if (!first) return;
    setRollCallActive(true);
    rollCallActiveRef.current = true;
    callStudentName(first);
  };

  const stepRollCall = (direction: 1 | -1, fromStudentId?: string) => {
    if (filteredStudents.length === 0) return;
    const anchorId = fromStudentId || callingStudentId;
    const idx = anchorId
      ? filteredStudents.findIndex((s) => s.id === anchorId)
      : -1;
    let nextStudent: Student | undefined;

    if (direction === 1) {
      if (onlyUnmarkedRollCall) {
        nextStudent =
          filteredStudents
            .slice(idx + 1)
            .find((st) => !attendance[`${selectedDate}::${st.id}`]) ||
          filteredStudents.find(
            (st) =>
              st.id !== anchorId && !attendance[`${selectedDate}::${st.id}`]
          );
      } else {
        nextStudent = filteredStudents[idx + 1];
      }
      if (!nextStudent) {
        setRollCallActive(false);
        setCallingStudentId(null);
        setAttendanceFeedback({
          id: Date.now(),
          status: 'Hadir',
          title: 'Pemanggilan absen selesai!',
          subtitle: 'Seluruh siswa pada daftar kelas ini telah dipanggil.',
        });
        if (voiceEnabled) {
          void speakAttendancePhrase({
            text: 'Pemanggilan absen selesai. Terima kasih anak-anak!',
            style: 'Warm, cheerful Indonesian school teacher voice',
            mode: voiceMode,
            webSpeechVoiceURI: selectedWebSpeechURI || undefined,
            onStart: () => setIsSpeaking(true),
            onEnd: () => setIsSpeaking(false),
          });
        }
        return;
      }
    } else {
      const prevIdx = idx <= 0 ? 0 : idx - 1;
      nextStudent = filteredStudents[prevIdx];
    }

    if (nextStudent) {
      callStudentName(nextStudent);
    }
  };

  const handleMarkStudentAttendance = (
    st: Student,
    status: AttendanceStatus
  ) => {
    onSetAttendance(selectedDate, st.id, status);
    const shouldAutoNext =
      rollCallActiveRef.current &&
      autoAdvanceRollCall &&
      callingStudentId === st.id;

    triggerAttendanceMessage(
      status,
      st.nama,
      shouldAutoNext
        ? () => {
            if (!rollCallActiveRef.current) return;
            stepRollCall(1, st.id);
          }
        : undefined
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Absen Siswa
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Presensi harian sesuai jadwal mengajar · Sekolah 5 hari (Sabtu & Minggu libur ditandai merah)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => {
                setVoiceEnabled((prev) => {
                  const next = !prev;
                  if (!next) {
                    stopSpeaking();
                    setIsSpeaking(false);
                  }
                  return next;
                });
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                voiceEnabled
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={voiceEnabled ? 'Matikan suara manusia' : 'Aktifkan suara manusia'}
            >
              {voiceEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span>{voiceEnabled ? 'Suara Aktif' : 'Suara Mati'}</span>
            </button>

            {voiceEnabled && (
              <>
                <select
                  value={voiceMode}
                  onChange={(e) => setVoiceMode(e.target.value as VoiceMode)}
                  aria-label="Pilih mode suara presensi"
                  className="h-7 px-2 rounded-md border-l border-slate-200 bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  {webSpeechAvailable && (
                    <optgroup label="Web Speech API (Instan)">
                      <option value="webspeech-ibu">Web Speech · Ibu Guru</option>
                      <option value="webspeech-pak">Web Speech · Pak Guru</option>
                    </optgroup>
                  )}
                  <optgroup label="Suara Alami AI">
                    <option value="gemini-kore">Suara Alami · Ibu Guru</option>
                    <option value="gemini-puck">Suara Alami · Pak Guru</option>
                  </optgroup>
                </select>

                {(voiceMode === 'webspeech-ibu' ||
                  voiceMode === 'webspeech-pak') &&
                  webSpeechVoices.length > 0 && (
                    <select
                      value={selectedWebSpeechURI}
                      onChange={(e) => setSelectedWebSpeechURI(e.target.value)}
                      aria-label="Pilih suara browser Web Speech"
                      className="hidden sm:block h-7 max-w-[165px] px-2 rounded-md border-l border-slate-200 bg-transparent text-xs text-slate-600 focus:outline-none cursor-pointer truncate"
                    >
                      <option value="">Suara Otomatis (id-ID)</option>
                      {webSpeechVoices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  )}
              </>
            )}
          </div>

          <button
            type="button"
            disabled={holidayInfo.isHoliday || filteredStudents.length === 0}
            onClick={() => {
              if (rollCallActive) {
                stopRollCall();
              } else {
                startRollCall();
              }
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed ${
              rollCallActive
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-xs'
            }`}
          >
            {rollCallActive ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>Hentikan Panggil</span>
              </>
            ) : (
              <>
                <Megaphone className="w-4 h-4" />
                <span>Panggil Absen</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={holidayInfo.isHoliday || filteredStudents.length === 0}
            onClick={() => {
              if (rollCallActive) stopRollCall();
              onMarkAllPresent(
                selectedDate,
                filteredStudents.map((s) => s.id)
              );
              setAttendanceFeedback({
                id: Date.now(),
                status: 'Hadir',
                title: 'Terima kasih telah hadir hari ini!',
                subtitle: `Seluruh ${filteredStudents.length} siswa tercatat hadir penuh.`,
              });
              if (voiceEnabled) {
                void speakAttendancePhrase({
                  text: `Hadir semua. Terima kasih anak-anak telah hadir hari ini!`,
                  style: 'Warm, cheerful, encouraging Indonesian teacher voice',
                  mode: voiceMode,
                  webSpeechVoiceURI: selectedWebSpeechURI || undefined,
                  onStart: () => setIsSpeaking(true),
                  onEnd: () => setIsSpeaking(false),
                });
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Hadir Semua ({filteredStudents.length})</span>
          </button>
        </div>
      </div>

      {/* 7-Day Week Strip (Senin - Minggu; Sabtu & Minggu kolom berwarna merah) */}
      <div className="bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/70 border border-emerald-200/80 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <span className="text-xs font-semibold text-slate-600">
            Kalender Mingguan (5 Hari Kerja · Kolom Sabtu & Minggu Libur Merah)
          </span>
          <span className="text-xs font-medium text-slate-500">
            {formatIndonesianDate(selectedDate)}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekStrip.map((item) => {
            const hInfo = getHolidayInfo(item.dateISO, holidays);
            const isSelected = item.dateISO === selectedDate;
            const isRedDay = item.isWeekend || hInfo.isHoliday;

            return (
              <motion.button
                key={item.dateISO}
                type="button"
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                onClick={() => setSelectedDate(item.dateISO)}
                className={`relative p-2.5 rounded-lg border text-center transition-colors cursor-pointer ${
                  isRedDay
                    ? isSelected
                      ? 'bg-red-600 text-white border-red-700 shadow-xs'
                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    : isSelected
                    ? 'text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50/60'
                }`}
              >
                {isSelected && !isRedDay && (
                  <motion.span
                    layoutId="attendance-week-day"
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 460, damping: 30 }
                    }
                    className="absolute inset-0 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 shadow-xs"
                    aria-hidden="true"
                  />
                )}
                <div className="relative z-10 text-[11px] font-semibold truncate">
                  {item.dayName}
                </div>
                <div className="relative z-10 text-base font-bold font-mono tabular-nums mt-0.5">
                  {item.dayNumber}
                </div>
                <div className="relative z-10 text-[10px] mt-0.5 font-medium truncate">
                  {isRedDay ? 'Libur' : 'Aktif'}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Filter Hari, Tanggal, Kelas & Jadwal Mengajar */}
      <div className="bg-gradient-to-r from-sky-50/60 via-white to-emerald-50/50 border border-sky-200/80 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Filter Tanggal
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Hari (Otomatis dari Tanggal / Pilih Minggu Ini)
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
            >
              {weekStrip.map((w) => (
                <option key={w.dateISO} value={w.dateISO}>
                  {w.dayName} ({w.dateISO}){w.isWeekend ? ' - LIBUR' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Filter Kelas
            </label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
            >
              <option value="Semua">Semua Kelas</option>
              {uniqueClasses.map((k) => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Jadwal Mengajar Sinkron */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 text-xs text-slate-600">
            <CalendarClock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5 sm:mt-0" />
            {holidayInfo.isHoliday ? (
              <span className="font-semibold text-red-700">
                {holidayInfo.label}
              </span>
            ) : daySchedules.length === 0 ? (
              <span>
                Tidak ada jadwal mengajar terdaftar pada hari <strong>{dayName}</strong>.
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800">
                  Jadwal Mengajar Hari {dayName}:
                </span>
                {daySchedules.map((sch) => (
                  <button
                    key={sch.id}
                    type="button"
                    onClick={() => setSelectedKelas(sch.kelas)}
                    className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                      selectedKelas === sch.kelas
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sch.kelas} · Jam {sch.jamKe} ({sch.waktu}) · {sch.mataPelajaran}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!holidayInfo.isHoliday &&
            selectedKelas !== 'Semua' &&
            classDaySchedules.length === 0 &&
            daySchedules.length > 0 && (
              <span className="text-xs text-amber-700 font-medium">
                Catatan: Tidak ada jadwal di kelas {selectedKelas} pada hari {dayName}
              </span>
            )}
        </div>
      </div>

      {/* Holiday Red Alert Banner */}
      {holidayInfo.isHoliday && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-5 py-4 flex items-center gap-3 text-red-800">
          <CalendarOff className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <div className="text-sm font-bold">
              Hari Libur Sekolah — {holidayInfo.label}
            </div>
            <div className="text-xs text-red-700 mt-0.5">
              Sekolah menerapkan 5 hari kerja (Senin s.d. Jumat). Kolom absensi pada hari Sabtu, Minggu, dan Libur Sekolah ditandai warna merah.
            </div>
          </div>
        </div>
      )}

      {/* Attendance Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div
          whileHover={shouldReduceMotion ? undefined : { y: -2 }}
          className="bg-gradient-to-br from-emerald-50 to-green-100/80 border border-emerald-200 rounded-xl px-4 py-3.5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold text-emerald-900">Hadir</span>
          </div>
          <motion.span
            key={`hadir-${summary.hadir}`}
            initial={shouldReduceMotion ? false : { scale: 1.25, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl font-bold text-emerald-700 font-mono tabular-nums"
          >
            {summary.hadir}
          </motion.span>
        </motion.div>

        <motion.div
          whileHover={shouldReduceMotion ? undefined : { y: -2 }}
          className="bg-gradient-to-br from-blue-50 to-sky-100/80 border border-blue-200 rounded-xl px-4 py-3.5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold text-blue-900">Izin</span>
          </div>
          <motion.span
            key={`izin-${summary.izin}`}
            initial={shouldReduceMotion ? false : { scale: 1.25, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl font-bold text-blue-700 font-mono tabular-nums"
          >
            {summary.izin}
          </motion.span>
        </motion.div>

        <motion.div
          whileHover={shouldReduceMotion ? undefined : { y: -2 }}
          className="bg-gradient-to-br from-amber-50 to-orange-100/80 border border-amber-200 rounded-xl px-4 py-3.5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
              <HeartPulse className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold text-amber-900">Sakit</span>
          </div>
          <motion.span
            key={`sakit-${summary.sakit}`}
            initial={shouldReduceMotion ? false : { scale: 1.25, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl font-bold text-amber-700 font-mono tabular-nums"
          >
            {summary.sakit}
          </motion.span>
        </motion.div>

        <motion.div
          whileHover={shouldReduceMotion ? undefined : { y: -2 }}
          className="bg-gradient-to-br from-rose-50 to-red-100/80 border border-red-200 rounded-xl px-4 py-3.5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold text-red-900">Alpa</span>
          </div>
          <motion.span
            key={`alpa-${summary.alpa}`}
            initial={shouldReduceMotion ? false : { scale: 1.25, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl font-bold text-red-700 font-mono tabular-nums"
          >
            {summary.alpa}
          </motion.span>
        </motion.div>
      </div>

      {/* Guided Roll-Call Panel */}
      <AnimatePresence>
        {rollCallActive && currentCallingStudent && !holidayInfo.isHoliday && (
          <motion.div
            initial={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.99 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.99 }
            }
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-4 shadow-sm space-y-3"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700 font-mono tabular-nums">
                      Siswa {currentCallingIndex + 1} / {filteredStudents.length}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-semibold text-slate-600">
                      Kelas {currentCallingStudent.kelas}
                    </span>
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    “{currentCallingStudent.nama}, hadirkah hari ini?”
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => stepRollCall(-1)}
                  disabled={currentCallingIndex <= 0}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold text-slate-700 cursor-pointer"
                  title="Siswa sebelumnya"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>

                <button
                  type="button"
                  onClick={() => callStudentName(currentCallingStudent)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-indigo-700 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Panggil Ulang</span>
                </button>

                <button
                  type="button"
                  onClick={() => stepRollCall(1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <span>Berikutnya</span>
                  <SkipForward className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={stopRollCall}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Selesai</span>
                </button>
              </div>
            </div>

            <div className="pt-2.5 border-t border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 mr-1">
                  Tandai cepat:
                </span>
                {STATUS_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isCurrent =
                    attendance[`${selectedDate}::${currentCallingStudent.id}`] ===
                    opt.value;
                  return (
                    <motion.button
                      key={`rc-${opt.value}`}
                      type="button"
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                      onClick={() =>
                        handleMarkStudentAttendance(
                          currentCallingStudent,
                          opt.value
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        isCurrent
                          ? `${opt.activeBg} text-white shadow-xs`
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{opt.short}</span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoAdvanceRollCall}
                    onChange={(e) => setAutoAdvanceRollCall(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 cursor-pointer"
                  />
                  <span>Otomatis panggil siswa berikutnya</span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyUnmarkedRollCall}
                    onChange={(e) => setOnlyUnmarkedRollCall(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 cursor-pointer"
                  />
                  <span>Lewati yang sudah diabsen</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="py-14 text-center">
            <Users className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Belum ada siswa di kelas ini
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 w-12">No</th>
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th
                    className={`py-3 px-4 text-center ${
                      holidayInfo.isHoliday
                        ? 'bg-red-100 text-red-800'
                        : ''
                    }`}
                  >
                    {holidayInfo.isHoliday
                      ? `Status (${dayName} · LIBUR)`
                      : 'Keterangan (Hadir / Izin / Sakit / Alpa)'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st, idx) => {
                  const currentStatus = attendance[`${selectedDate}::${st.id}`];
                  const isBeingCalled = callingStudentId === st.id;
                  return (
                    <tr
                      key={st.id}
                      ref={(el) => {
                        rowRefs.current[st.id] = el;
                      }}
                      className={`transition-colors ${
                        isBeingCalled
                          ? 'bg-indigo-50/90'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-500 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {st.nis}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center justify-between gap-2">
                          <span>{st.nama}</span>
                          {!holidayInfo.isHoliday && (
                            <motion.button
                              type="button"
                              whileTap={
                                shouldReduceMotion ? undefined : { scale: 0.92 }
                              }
                              onClick={() => callStudentName(st)}
                              title={`Panggil ${st.nama}: "${st.nama}, hadirkah hari ini?"`}
                              aria-label={`Panggil nama ${st.nama}`}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors shrink-0 cursor-pointer ${
                                isBeingCalled
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-indigo-50/70 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                              }`}
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>Panggil</span>
                            </motion.button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                        {st.kelas}
                      </td>
                      <td
                        className={`py-2 px-4 text-center ${
                          holidayInfo.isHoliday ? 'bg-red-50/90' : ''
                        }`}
                      >
                        {holidayInfo.isHoliday ? (
                          <div className="text-center text-xs font-bold text-red-700 py-1">
                            LIBUR
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center gap-1.5 p-1 rounded-lg bg-slate-100/90 border border-slate-200/80 mx-auto">
                            {STATUS_OPTIONS.map((opt) => {
                              const isActive = currentStatus === opt.value;
                              const clickKey = `${selectedDate}::${st.id}::${opt.value}`;
                              const isJustClicked =
                                recentClick?.key === clickKey;
                              const Icon = opt.icon;

                              return (
                                <motion.button
                                  key={opt.value}
                                  type="button"
                                  whileTap={
                                    shouldReduceMotion ? undefined : { scale: 0.92 }
                                  }
                                  onClick={() => {
                                    setRecentClick({
                                      key: clickKey,
                                      nonce: Date.now(),
                                    });
                                    handleMarkStudentAttendance(st, opt.value);
                                  }}
                                  className={`relative px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                    isActive
                                      ? 'text-white'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {isActive && (
                                    <motion.span
                                      layoutId={`status-pill-${selectedDate}-${st.id}`}
                                      transition={
                                        shouldReduceMotion
                                          ? { duration: 0 }
                                          : {
                                              type: 'spring',
                                              stiffness: 520,
                                              damping: 32,
                                              mass: 0.6,
                                            }
                                      }
                                      className={`absolute inset-0 rounded-md border shadow-xs ${opt.activeBg}`}
                                      aria-hidden="true"
                                    />
                                  )}

                                  {isJustClicked && !shouldReduceMotion && (
                                    <motion.span
                                      key={recentClick?.nonce}
                                      initial={{ scale: 0.85, opacity: 0.7 }}
                                      animate={{ scale: 1.28, opacity: 0 }}
                                      transition={{
                                        duration: 0.36,
                                        ease: 'easeOut',
                                      }}
                                      className={`absolute inset-0 rounded-md border-2 pointer-events-none ${opt.ringColor}`}
                                      aria-hidden="true"
                                    />
                                  )}

                                  <span className="relative z-10 inline-flex items-center gap-1">
                                    {isActive && (
                                      <motion.span
                                        initial={
                                          shouldReduceMotion
                                            ? false
                                            : { scale: 0.3, opacity: 0 }
                                        }
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{
                                          type: 'spring',
                                          stiffness: 550,
                                          damping: 24,
                                        }}
                                        className="inline-flex"
                                      >
                                        <Icon className="w-3.5 h-3.5" />
                                      </motion.span>
                                    )}
                                    <span>{opt.short}</span>
                                  </span>
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Animated Contextual Greeting Toast */}
      <AnimatePresence mode="wait">
        {attendanceFeedback && (
          <motion.div
            key={attendanceFeedback.id}
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 24, scale: 0.94 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 16, scale: 0.96 }
            }
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 28,
              mass: 0.7,
            }}
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm"
          >
            {(() => {
              const styleMap: Record<
                AttendanceStatus,
                {
                  wrapper: string;
                  iconBg: string;
                  title: string;
                  subtitle: string;
                  bar: string;
                  Icon: React.ComponentType<{ className?: string }>;
                }
              > = {
                Hadir: {
                  wrapper: 'bg-white border-emerald-200 shadow-lg',
                  iconBg: 'bg-emerald-100 text-emerald-700',
                  title: 'text-slate-900',
                  subtitle: 'text-emerald-700',
                  bar: 'bg-emerald-500',
                  Icon: Check,
                },
                Izin: {
                  wrapper: 'bg-white border-blue-200 shadow-lg',
                  iconBg: 'bg-blue-100 text-blue-700',
                  title: 'text-slate-900',
                  subtitle: 'text-blue-700',
                  bar: 'bg-blue-500',
                  Icon: Clock,
                },
                Sakit: {
                  wrapper: 'bg-white border-amber-200 shadow-lg',
                  iconBg: 'bg-amber-100 text-amber-700',
                  title: 'text-slate-900',
                  subtitle: 'text-amber-700',
                  bar: 'bg-amber-500',
                  Icon: HeartPulse,
                },
                Alpa: {
                  wrapper: 'bg-white border-red-200 shadow-lg',
                  iconBg: 'bg-red-100 text-red-700',
                  title: 'text-slate-900',
                  subtitle: 'text-red-700',
                  bar: 'bg-red-500',
                  Icon: XCircle,
                },
              };
              const cfg = styleMap[attendanceFeedback.status];
              const ToastIcon = cfg.Icon;

              return (
                <div
                  className={`relative overflow-hidden rounded-xl border p-4 ${cfg.wrapper}`}
                >
                  <div className="flex items-start gap-3">
                    <motion.div
                      initial={
                        shouldReduceMotion ? false : { scale: 0.4, rotate: -15 }
                      }
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 20,
                      }}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}
                    >
                      <ToastIcon className="w-5 h-5" />
                    </motion.div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold leading-snug ${cfg.title}`}>
                          {attendanceFeedback.title}
                        </p>
                        {isSpeaking && !shouldReduceMotion && (
                          <span
                            className="inline-flex items-end gap-0.5 h-3 shrink-0"
                            aria-label="Sedang berbicara"
                          >
                            <motion.span
                              animate={{ scaleY: [0.4, 1, 0.5] }}
                              transition={{ repeat: Infinity, duration: 0.55 }}
                              className={`w-0.5 h-full rounded-full ${cfg.bar}`}
                            />
                            <motion.span
                              animate={{ scaleY: [1, 0.45, 1] }}
                              transition={{ repeat: Infinity, duration: 0.48 }}
                              className={`w-0.5 h-full rounded-full ${cfg.bar}`}
                            />
                            <motion.span
                              animate={{ scaleY: [0.5, 1, 0.4] }}
                              transition={{ repeat: Infinity, duration: 0.6 }}
                              className={`w-0.5 h-full rounded-full ${cfg.bar}`}
                            />
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${cfg.subtitle}`}>
                        {attendanceFeedback.subtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        stopSpeaking();
                        setIsSpeaking(false);
                        setAttendanceFeedback(null);
                      }}
                      aria-label="Tutup pesan presensi"
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {!shouldReduceMotion && (
                    <motion.div
                      initial={{ scaleX: 1 }}
                      animate={{ scaleX: 0 }}
                      transition={{ duration: 4.5, ease: 'linear' }}
                      style={{ transformOrigin: 'left' }}
                      className={`absolute bottom-0 left-0 right-0 h-0.5 ${cfg.bar}`}
                    />
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
