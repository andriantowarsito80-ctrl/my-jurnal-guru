import { DayName, HolidayItem } from '../types';

export const WORKING_DAYS: ('Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat')[] = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
];

export const ALL_DAYS: DayName[] = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function toLocalDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateISO: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getDayNameFromISO(dateISO: string): DayName {
  const d = parseLocalDate(dateISO);
  return ALL_DAYS[d.getDay()];
}

export function isWeekendISO(dateISO: string): boolean {
  const day = parseLocalDate(dateISO).getDay();
  return day === 0 || day === 6; // Minggu = 0, Sabtu = 6
}

export function getHolidayInfo(
  dateISO: string,
  holidays: HolidayItem[]
): { isHoliday: boolean; isWeekend: boolean; label: string | null } {
  const day = parseLocalDate(dateISO).getDay();
  const isWeekend = day === 0 || day === 6;
  const customHoliday = holidays.find((h) => h.tanggal === dateISO);

  if (customHoliday && isWeekend) {
    return {
      isHoliday: true,
      isWeekend: true,
      label: `${ALL_DAYS[day]} (Libur Akhir Pekan · ${customHoliday.keterangan})`,
    };
  }
  if (isWeekend) {
    return {
      isHoliday: true,
      isWeekend: true,
      label: `${ALL_DAYS[day]} · Libur Akhir Pekan (Sekolah 5 Hari)`,
    };
  }
  if (customHoliday) {
    return {
      isHoliday: true,
      isWeekend: false,
      label: `Libur Sekolah: ${customHoliday.keterangan}`,
    };
  }
  return { isHoliday: false, isWeekend: false, label: null };
}

export function getDaysInMonth(year: number, monthIndex0: number): {
  day: number;
  dateISO: string;
  dayName: DayName;
  shortDay: string;
  isWeekend: boolean;
}[] {
  const totalDays = new Date(year, monthIndex0 + 1, 0).getDate();
  const result = [];
  const shortMap: Record<DayName, string> = {
    Minggu: 'Min',
    Senin: 'Sen',
    Selasa: 'Sel',
    Rabu: 'Rab',
    Kamis: 'Kam',
    Jumat: 'Jum',
    Sabtu: 'Sab',
  };

  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, monthIndex0, d);
    const dateISO = toLocalDateISO(dateObj);
    const dayName = ALL_DAYS[dateObj.getDay()];
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    result.push({
      day: d,
      dateISO,
      dayName,
      shortDay: shortMap[dayName],
      isWeekend,
    });
  }
  return result;
}

export function formatIndonesianDate(dateISO: string): string {
  const d = parseLocalDate(dateISO);
  const dayName = ALL_DAYS[d.getDay()];
  return `${dayName}, ${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function getWeekDatesAround(dateISO: string): {
  dateISO: string;
  dayName: DayName;
  dayNumber: number;
  isWeekend: boolean;
}[] {
  const current = parseLocalDate(dateISO);
  const dayOfWeek = current.getDay(); // 0=Sun..6=Sat
  // Shift so Monday is first day of the week
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);

  const week = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    const iso = toLocalDateISO(dt);
    const dayName = ALL_DAYS[dt.getDay()];
    week.push({
      dateISO: iso,
      dayName,
      dayNumber: dt.getDate(),
      isWeekend: dt.getDay() === 0 || dt.getDay() === 6,
    });
  }
  return week;
}
