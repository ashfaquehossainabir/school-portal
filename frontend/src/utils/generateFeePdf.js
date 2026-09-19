import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CURRENCY, FEE_TYPE_LABELS, PAYMENT_METHOD_LABELS, formatDate } from './feeTypes';

const SCHOOL_NAME = 'EduPortal School';
const ACCENT = [31, 111, 92]; // matches --accent from theme.css
const MUTED = [90, 96, 114];

function money(n) {
  return `${CURRENCY}${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function drawLetterhead(doc, subtitle) {
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(SCHOOL_NAME, 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(subtitle, 14, 22);
  doc.setTextColor(0, 0, 0);
}

function studentBlock(doc, student, y) {
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text('BILLED TO', 14, y);
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(student?.name || '—', 14, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const line2 = [
    student?.studentId ? `ID: ${student.studentId}` : null,
    student?.className ? `${student.className}${student?.section ? ` - ${student.section}` : ''}` : null,
  ]
    .filter(Boolean)
    .join('  •  ');
  if (line2) doc.text(line2, 14, y + 12);
  return y + 12;
}

function metaBlock(doc, rows, y) {
  const startX = 140;
  doc.setFontSize(10);
  rows.forEach(([label, value], i) => {
    doc.setTextColor(...MUTED);
    doc.text(label, startX, y + i * 6);
    doc.setTextColor(20, 20, 20);
    doc.text(String(value ?? '—'), startX + 32, y + i * 6);
  });
  return y + rows.length * 6;
}

function footer(doc) {
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text('This is a system-generated document from EduPortal.', 14, pageHeight - 12);
}

/**
 * Full fee invoice: every line item, discount, total, and (if any) the
 * payment history so far with the remaining balance.
 */
export function generateInvoicePdf(invoice, student) {
  const doc = new jsPDF();
  drawLetterhead(doc, 'Fee Invoice');

  let y = 40;
  studentBlock(doc, student || invoice.student, y);
  metaBlock(
    doc,
    [
      ['Invoice No.', invoice.invoiceNo],
      ['Invoice Title', invoice.title],
      ['Term', invoice.term || '—'],
      ['Due Date', formatDate(invoice.dueDate)],
      ['Status', invoice.status?.toUpperCase()],
    ],
    y
  );

  y += 26;

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
    bodyStyles: { fontSize: 10 },
    columnStyles: { 2: { halign: 'right', cellWidth: 35 } },
    margin: { left: 14, right: 14 },
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
    styles: { fontSize: 10.5 },
    columnStyles: { 0: { cellWidth: 140, fontStyle: 'bold' }, 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
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
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment History', 14, y);
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
      bodyStyles: { fontSize: 9 },
      columnStyles: { 4: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
  }

  if (invoice.notes) {
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 10;
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(`Note: ${invoice.notes}`, 14, finalY, { maxWidth: 180 });
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

  let y = 40;
  studentBlock(doc, student || invoice.student, y);
  metaBlock(
    doc,
    [
      ['Receipt No.', payment.receiptNo],
      ['Invoice No.', invoice.invoiceNo],
      ['Date', formatDate(payment.date)],
      ['Method', PAYMENT_METHOD_LABELS[payment.method] || payment.method],
    ],
    y
  );

  y += 30;

  autoTable(doc, {
    startY: y,
    head: [['Paid Against', 'Reference', 'Amount Received']],
    body: [[invoice.title, payment.reference || '—', money(payment.amount)]],
    theme: 'grid',
    headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 11 },
    columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 8;

  const itemsTotal = invoice.items.reduce((s, i) => s + i.amount, 0);
  const total = Math.max(itemsTotal - (invoice.discount?.amount || 0), 0);
  const paidToDate = (invoice.payments || []).reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(total - paidToDate, 0);

  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  doc.text('Invoice Total', 14, y);
  doc.text('Paid to Date', 14, y + 6);
  doc.text('Remaining Balance', 14, y + 12);
  doc.setTextColor(20, 20, 20);
  doc.text(money(total), 70, y);
  doc.text(money(paidToDate), 70, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(money(balance), 70, y + 12);
  doc.setFont('helvetica', 'normal');

  if (payment.note) {
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(`Note: ${payment.note}`, 14, y + 24, { maxWidth: 180 });
  }

  footer(doc);
  doc.save(`Receipt-${payment.receiptNo}.pdf`);
}
