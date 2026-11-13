import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SchoolProfile, TeacherProfile } from '../types';
import { MONTH_NAMES_ID } from './dateUtils';

export interface GradePdfRow {
  no: number;
  nis: string;
  nama: string;
  kelas: string;
  tugas: (number | null)[];
  jumlah: number;
  rataRata: number;
  asasAsat: number | null;
  nilaiRapot: number;
}

export interface ExportGradesPdfParams {
  schoolProfile: SchoolProfile;
  teacherProfile: TeacherProfile;
  subjectName: string;
  filterKelas: string;
  weightTugas: number;
  weightAsas: number;
  rows: GradePdfRow[];
}

export function exportGradesToPdf({
  schoolProfile,
  teacherProfile,
  subjectName,
  filterKelas,
  weightTugas,
  weightAsas,
  rows,
}: ExportGradesPdfParams): string {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const marginX = 14;

  // --- KOP SEKOLAH ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    'PEMERINTAH DAERAH PROVINSI · DINAS PENDIDIKAN',
    pageWidth / 2,
    13,
    { align: 'center' }
  );

  doc.setFontSize(14);
  doc.text(schoolProfile.namaSekolah.toUpperCase(), pageWidth / 2, 19.5, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const addressPart = schoolProfile.alamat ? `  |  ${schoolProfile.alamat}` : '';
  doc.text(
    `NPSN: ${schoolProfile.npsn}  |  Status: ${schoolProfile.statusAkreditasi}${addressPart}`,
    pageWidth / 2,
    24.5,
    { align: 'center' }
  );

  // Garis Kop Surat Ganda (Tebal + Tipis)
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.9);
  doc.line(marginX, 27.5, pageWidth - marginX, 27.5);
  doc.setLineWidth(0.3);
  doc.line(marginX, 28.7, pageWidth - marginX, 28.7);

  // --- JUDUL DOKUMEN ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('REKAPITULASI DAFTAR NILAI SISWA', pageWidth / 2, 35.5, {
    align: 'center',
  });

  // --- METADATA ---
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const kelasLabel = filterKelas === 'Semua' ? 'Semua Kelas' : filterKelas;
  doc.text(`Mata Pelajaran  : ${subjectName}`, marginX, 42);
  doc.text(`Kelas                 : ${kelasLabel}`, marginX, 46.8);

  const rightColX = pageWidth - marginX - 95;
  doc.text(
    `Guru Pengampu : ${teacherProfile.namaGuru}`,
    rightColX,
    42
  );
  doc.text(`NIP                      : ${teacherProfile.nip}`, rightColX, 46.8);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Bobot Penilaian: ${weightTugas}% Rata-rata Tugas + ${weightAsas}% ASAS/ASAT`,
    marginX,
    51.5
  );

  // --- TABEL NILAI (AUTOTABLE) ---
  const head = [
    [
      'No',
      'NIS',
      'Nama Siswa',
      'Kelas',
      ...Array.from({ length: 11 }, (_, i) => `T${i + 1}`),
      'Jml',
      'Rata',
      'ASAS',
      'Rapot',
    ],
  ];

  let sumRata = 0;
  let sumAsas = 0;
  let countAsas = 0;
  let sumRapot = 0;

  const body = rows.map((r) => {
    sumRata += r.rataRata;
    sumRapot += r.nilaiRapot;
    if (r.asasAsat !== null && !Number.isNaN(r.asasAsat)) {
      sumAsas += r.asasAsat;
      countAsas += 1;
    }

    return [
      String(r.no),
      r.nis,
      r.nama,
      r.kelas,
      ...r.tugas.map((t) => (t === null ? '-' : String(t))),
      String(r.jumlah),
      String(r.rataRata),
      r.asasAsat === null ? '-' : String(r.asasAsat),
      String(r.nilaiRapot),
    ];
  });

  const n = rows.length;
  const foot =
    n > 0
      ? [
          [
            '',
            '',
            'Rata-rata Kelas',
            '',
            ...Array(11).fill(''),
            '',
            (sumRata / n).toFixed(1),
            countAsas > 0 ? (sumAsas / countAsas).toFixed(1) : '-',
            (sumRapot / n).toFixed(1),
          ],
        ]
      : undefined;

  autoTable(doc, {
    startY: 54.5,
    margin: { left: marginX, right: marginX, bottom: 16 },
    head,
    body,
    foot,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: { top: 1.8, right: 1.5, bottom: 1.8, left: 1.5 },
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      valign: 'middle',
      halign: 'center',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 21 },
      2: { halign: 'left', cellWidth: 46 },
      3: { cellWidth: 14 },
      // T1-T11 columns 4..14 auto-sized evenly
      15: { cellWidth: 12, fontStyle: 'bold' },
      16: { cellWidth: 12, fontStyle: 'bold' },
      17: { cellWidth: 12, fontStyle: 'bold', fillColor: [239, 246, 255] },
      18: {
        cellWidth: 13,
        fontStyle: 'bold',
        fillColor: [236, 253, 245],
        textColor: [6, 95, 70],
      },
    },
  });

  // --- TANDA TANGAN RESMI ---
  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
      ?.finalY ?? 140;

  let signY = finalY + 10;
  if (signY + 34 > pageHeight - 12) {
    doc.addPage();
    signY = 22;
  }

  const now = new Date();
  const formattedDate = `${now.getDate()} ${MONTH_NAMES_ID[now.getMonth()]} ${now.getFullYear()}`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  // Kiri: Kepala Sekolah
  const leftSignX = marginX + 10;
  doc.text('Mengetahui,', leftSignX, signY);
  doc.text('Kepala Sekolah', leftSignX, signY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolProfile.kepalaSekolah, leftSignX, signY + 23);

  // Kanan: Guru Pengampu
  const rightSignX = pageWidth - marginX - 72;
  doc.setFont('helvetica', 'normal');
  doc.text(`Karawang, ${formattedDate}`, rightSignX, signY);
  doc.text('Guru Mata Pelajaran', rightSignX, signY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.text(teacherProfile.namaGuru, rightSignX, signY + 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${teacherProfile.nip}`, rightSignX, signY + 27.5);

  // Footer Nomor Halaman di setiap halaman
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dicetak dari Sistem Administrasi Guru · ${schoolProfile.namaSekolah}`,
      marginX,
      pageHeight - 7
    );
    doc.text(
      `Halaman ${p} dari ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  const kelasSlug =
    filterKelas === 'Semua' ? 'Semua_Kelas' : filterKelas.replace(/\s+/g, '_');
  const filename = `Rekap_Nilai_${subjectName.replace(/\s+/g, '_')}_${kelasSlug}.pdf`;
  doc.save(filename);
  return filename;
}
