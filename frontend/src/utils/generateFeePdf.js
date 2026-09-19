import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CURRENCY, FEE_TYPE_LABELS, PAYMENT_METHOD_LABELS, formatDate } from './feeTypes';

const SCHOOL_NAME = 'EduPortal School';
const ACCENT = [31, 111, 92]; // matches --accent from theme.css
const MUTED = [90, 96, 114];
const MARGIN = 14;

function money(n) {
  return `${CURRENCY}${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pageWidth(doc) {
  return doc.internal.pageSize.getWidth();
}

function contentWidth(doc) {
  return pageWidth(doc) - MARGIN * 2;
}

// Wraps `text` to fit within `maxWidth` and prints it starting at (x, y),
// returning the y position just below the last printed line so callers can
// keep stacking content without guessing line counts up front.
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

// A large, wrapped heading (the invoice title) that spans the full content
// width — this is the one piece of free text most likely to be long, so it
// gets its own line(s) rather than being squeezed into a label/value pair.
function printHeading(doc, text, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  const endY = printWrapped(doc, text, MARGIN, y, contentWidth(doc), 6.5);
  doc.setFont('helvetica', 'normal');
  return endY;
}

// Two-column info row: student details on the left, short meta facts
// (invoice no., due date, status, ...) on the right. Each column gets its
// own bounded width and every line is wrapped, so long values fall onto a
// second line instead of running off the page.
function printInfoRow(doc, { student, metaRows }, y) {
  const cw = contentWidth(doc);
  const leftX = MARGIN;
  const leftWidth = cw * 0.56;
  const rightX = MARGIN + cw * 0.6;
  const rightWidth = cw * 0.4;

  let leftY = y;
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text('BILLED TO', leftX, leftY);
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
 * Full fee invoice: every line item, discount, total, and (if any) the
 * payment history so far with the remaining balance.
 */
export function generateInvoicePdf(invoice, student) {
  const doc = new jsPDF();
  drawLetterhead(doc, 'Fee Invoice');

  let y = 38;
  y = printHeading(doc, invoice.title, y);
  y += 4;
  y = printInfoRow(
    doc,
    {
      student: student || invoice.student,
      metaRows: [
        ['Invoice No.', invoice.invoiceNo],
        ['Term', invoice.term || '—'],
        ['Due Date', formatDate(invoice.dueDate)],
        ['Status', invoice.status?.toUpperCase()],
      ],
    },
    y
  );

  const itemRows = invoice.items.map((item) => [
    FEE_TYPE_LABELS[item.type] || item.type,
    item.label,
    money(item.amount),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Type', 'Description', 'Amount']],
    body: itemRows,
    theme: 'grid',
    headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 10, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 32 },
      2: { halign: 'right', cellWidth: 32 },
    },
    margin: tableMargin,
  });

  y = doc.lastAutoTable.finalY + 6;

  const itemsTotal = invoice.items.reduce((s, i) => s + i.amount, 0);
  const discount = invoice.discount?.amount || 0;
  const total = Math.max(itemsTotal - discount, 0);
  const paid = (invoice.payments || []).reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(total - paid, 0);

  const summaryRows = [['Subtotal', money(itemsTotal)]];
  if (discount > 0) {
    summaryRows.push([`Discount${invoice.discount?.reason ? ` (${invoice.discount.reason})` : ''}`, `- ${money(discount)}`]);
  }
  summaryRows.push(['Total', money(total)]);
  if (paid > 0) {
    summaryRows.push(['Paid so far', money(paid)]);
    summaryRows.push(['Balance Due', money(balance)]);
  }

  autoTable(doc, {
    startY: y,
    body: summaryRows,
    theme: 'plain',
    styles: { fontSize: 10.5, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: contentWidth(doc) - 45, fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: 45 },
    },
    margin: tableMargin,
    didParseCell: (data) => {
      const label = String(data.row.raw[0]);
      if (label === 'Total' || label === 'Balance Due') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 12;
        if (label === 'Balance Due' && balance > 0) data.cell.styles.textColor = [200, 64, 47];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  if (invoice.payments?.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text('Payment History', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Method', 'Reference', 'Receipt No.', 'Amount']],
      body: invoice.payments.map((p) => [
        formatDate(p.date),
        PAYMENT_METHOD_LABELS[p.method] || p.method,
        p.reference || '—',
        p.receiptNo || '—',
        money(p.amount),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [230, 233, 240], textColor: 30, fontSize: 9 },
      bodyStyles: { fontSize: 9, overflow: 'linebreak' },
      columnStyles: { 4: { halign: 'right' } },
      margin: tableMargin,
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (invoice.notes) {
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    printWrapped(doc, `Note: ${invoice.notes}`, MARGIN, y, contentWidth(doc), 4.8);
  }

  footer(doc);
  doc.save(`Invoice-${invoice.invoiceNo}.pdf`);
}

/**
 * A single-payment receipt — what a parent gets handed (or downloads) at
 * the moment a payment is recorded.
 */
export function generateReceiptPdf(invoice, payment, student) {
  const doc = new jsPDF();
  drawLetterhead(doc, 'Payment Receipt');

  let y = 38;
  y = printHeading(doc, invoice.title, y);
  y += 4;
  y = printInfoRow(
    doc,
    {
      student: student || invoice.student,
      metaRows: [
        ['Receipt No.', payment.receiptNo],
        ['Invoice No.', invoice.invoiceNo],
        ['Date', formatDate(payment.date)],
        ['Method', PAYMENT_METHOD_LABELS[payment.method] || payment.method],
      ],
    },
    y
  );

  autoTable(doc, {
    startY: y,
    head: [['Reference', 'Amount Received']],
    body: [[payment.reference || '—', money(payment.amount)]],
    theme: 'grid',
    headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 11, overflow: 'linebreak' },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold', cellWidth: 50 } },
    margin: tableMargin,
  });

  y = doc.lastAutoTable.finalY + 10;

  const itemsTotal = invoice.items.reduce((s, i) => s + i.amount, 0);
  const total = Math.max(itemsTotal - (invoice.discount?.amount || 0), 0);
  const paidToDate = (invoice.payments || []).reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(total - paidToDate, 0);

  const rows = [
    ['Invoice Total', money(total)],
    ['Paid to Date', money(paidToDate)],
    ['Remaining Balance', money(balance)],
  ];
  autoTable(doc, {
    startY: y,
    body: rows,
    theme: 'plain',
    styles: { fontSize: 10.5, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: contentWidth(doc) - 45, textColor: MUTED },
      1: { halign: 'right', cellWidth: 45 },
    },
    margin: tableMargin,
    didParseCell: (data) => {
      if (String(data.row.raw[0]) === 'Remaining Balance') {
        data.cell.styles.fontStyle = 'bold';
        if (balance > 0) data.cell.styles.textColor = [200, 64, 47];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  if (payment.note) {
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    printWrapped(doc, `Note: ${payment.note}`, MARGIN, y, contentWidth(doc), 4.8);
  }

  footer(doc);
  doc.save(`Receipt-${payment.receiptNo}.pdf`);
}
