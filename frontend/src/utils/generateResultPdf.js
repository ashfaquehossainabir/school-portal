import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './feeTypes';
import { GRADE_COLORS } from './resultTypes';

const SCHOOL_NAME = 'EduPortal School';
const ACCENT = [31, 111, 92]; // matches --accent from theme.css
const MUTED = [90, 96, 114];
const MARGIN = 14;

function pageWidth(doc) {
  return doc.internal.pageSize.getWidth();
}
function contentWidth(doc) {
  return pageWidth(doc) - MARGIN * 2;
}

// Wraps `text` to fit within `maxWidth` and prints it starting at (x, y),
// returning the y position just below the last printed line.
function printWrapped(doc, text, x, y, maxWidth, lineHeight = 5.2) {
  const lines = doc.splitTextToSize(String(text ?? '—'), maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function drawLetterhead(doc, subtitle) {
  const pw = pageWidth(doc);
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pw, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(SCHOOL_NAME, MARGIN, 16, { maxWidth: pw - MARGIN * 2 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(subtitle, MARGIN, 22);
  doc.setTextColor(0, 0, 0);
}

function printHeading(doc, text, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  const endY = printWrapped(doc, text, MARGIN, y, contentWidth(doc), 6.5);
  doc.setFont('helvetica', 'normal');
  return endY;
}

// Two-column info row: student details on the left, short meta facts on the
// right. Every line is wrapped so long values drop to a second line instead
// of running off the page.
function printInfoRow(doc, { student, metaRows }, y) {
  const cw = contentWidth(doc);
  const leftX = MARGIN;
  const leftWidth = cw * 0.56;
  const rightX = MARGIN + cw * 0.6;
  const rightWidth = cw * 0.4;

  let leftY = y;
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text('STUDENT', leftX, leftY);
  leftY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  leftY = printWrapped(doc, student?.name || '—', leftX, leftY, leftWidth, 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 64, 76);
  const line2 = [
    student?.studentId ? `ID: ${student.studentId}` : null,
    student?.className ? `${student.className}${student?.section ? ` - ${student.section}` : ''}` : null,
    student?.roll ? `Roll: ${student.roll}` : null,
  ]
    .filter(Boolean)
    .join('   ');
  if (line2) leftY = printWrapped(doc, line2, leftX, leftY, leftWidth, 5);

  let rightY = y;
  doc.setFontSize(9.5);
  metaRows.forEach(([label, value]) => {
    doc.setTextColor(...MUTED);
    doc.text(label, rightX, rightY);
    rightY += 4.6;
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'bold');
    rightY = printWrapped(doc, value ?? '—', rightX, rightY, rightWidth, 5);
    doc.setFont('helvetica', 'normal');
    rightY += 2.2;
  });

  return Math.max(leftY, rightY) + 4;
}

function footer(doc) {
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text('This is a system-generated document from EduPortal.', MARGIN, pageHeight - 12);
}

const tableMargin = { left: MARGIN, right: MARGIN };

/**
 * A single student's result for one exam — subject-wise marks/grade table
 * plus the overall total, percentage and grade.
 */
export function generateResultPdf(result, student) {
  const doc = new jsPDF();
  drawLetterhead(doc, 'Exam Result');

  const s = student || result.student || {};

  let y = 38;
  y = printHeading(doc, result.examTitle, y);
  y += 4;
  y = printInfoRow(
    doc,
    {
      student: s,
      metaRows: [
        ['Term', result.term || '—'],
        ['Generated On', formatDate(new Date())],
        ['Overall Grade', result.overallGrade],
      ],
    },
    y
  );

  const gradeColor = GRADE_COLORS[result.overallGrade] || [20, 20, 20];
  const gradeRgb = Array.isArray(gradeColor) ? gradeColor : hexOrCssVarToRgb(gradeColor);

  autoTable(doc, {
    startY: y,
    head: [['Subject', 'Marks', 'Full Marks', 'Grade']],
    body: result.subjects.map((sub) => [sub.subject, String(sub.marks), String(sub.maxMarks), sub.grade]),
    theme: 'grid',
    headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 10, overflow: 'linebreak' },
    columnStyles: {
      1: { halign: 'right', cellWidth: 28 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'center', cellWidth: 28 },
    },
    margin: tableMargin,
  });

  y = doc.lastAutoTable.finalY + 6;

  const summaryRows = [
    ['Total Marks', `${result.totalMarks} / ${result.totalMaxMarks}`],
    ['Percentage', `${result.percentage}%`],
    ['Overall Grade', result.overallGrade],
  ];

  autoTable(doc, {
    startY: y,
    body: summaryRows,
    theme: 'plain',
    styles: { fontSize: 10.5, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: contentWidth(doc) - 50, fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: 50 },
    },
    margin: tableMargin,
    didParseCell: (data) => {
      const label = String(data.row.raw[0]);
      if (label === 'Overall Grade') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 12;
        data.cell.styles.textColor = gradeRgb;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  if (result.remarks) {
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    printWrapped(doc, `Remarks: ${result.remarks}`, MARGIN, y, contentWidth(doc), 4.8);
  }

  footer(doc);

  const idPart = (s.studentId || s.name || 'student').toString().replace(/[^a-z0-9]+/gi, '-');
  const titlePart = (result.examTitle || 'Exam').replace(/[^a-z0-9]+/gi, '-');
  doc.save(`Result-${idPart}-${titlePart}.pdf`);
}

// GRADE_COLORS values are CSS var() strings (for on-screen use) — jsPDF
// needs plain RGB. Map the palette actually used for grades to concrete
// RGB triplets so the PDF doesn't end up with "var(--success)" as a color.
function hexOrCssVarToRgb(cssVar) {
  const map = {
    'var(--success)': [34, 139, 87],
    'var(--info)': [43, 108, 176],
    'var(--warning)': [180, 130, 20],
    'var(--danger)': [200, 64, 47],
    'var(--accent)': [31, 111, 92],
  };
  return map[cssVar] || [20, 20, 20];
}
