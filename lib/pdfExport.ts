import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface TradeMetadata {
  symbol: string;
  date: string;
  dateFormatted: string;
  direction: string;
  pnlPercent: string;
  account?: string;
  entryPrice?: string;
  exitPrice?: string;
  leverage?: string;
  quantity?: string;
  duration?: string;
}

export async function exportNoteToPdf(
  editorElement: HTMLElement,
  metadata: TradeMetadata
): Promise<void> {
  const printContainer = document.createElement('div');
  printContainer.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 800px;
    padding: 40px 48px;
    background: white;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
    color: #1a1a1a;
  `;

  const now = new Date();
  const exportedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const headerHtml = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 0.5px solid #e5e7eb;">
      <div style="font-size: 10px; color: #9ca3af; font-weight: 500; letter-spacing: 0.5px;">TRADEGRAIL</div>
      <div style="font-size: 10px; color: #9ca3af;">Exported: ${exportedAt}</div>
    </div>
    <div style="margin-bottom: 24px;">
      <div style="font-size: 20px; font-weight: 500; color: #1a1a1a; margin-bottom: 6px;">${metadata.symbol}</div>
      <div style="font-size: 12px; color: #6b7280;">
        ${metadata.dateFormatted} · ${metadata.direction} · <span style="color: ${metadata.pnlPercent.startsWith('+') ? '#10b981' : '#ef4444'};">${metadata.pnlPercent}</span>
      </div>
    </div>
  `;

  const metaItems = [
    { label: '账户', value: metadata.account },
    { label: '入场价', value: metadata.entryPrice },
    { label: '出场价', value: metadata.exitPrice },
    { label: '杠杆', value: metadata.leverage },
    { label: '数量', value: metadata.quantity },
    { label: '持仓时长', value: metadata.duration },
  ].filter(item => item.value);

  let metaHtml = '';
  if (metaItems.length > 0) {
    metaHtml = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 24px; padding: 16px; background: #f9fafb; border-radius: 6px; margin-bottom: 24px;">
        ${metaItems.map(item => `
          <div>
            <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">${item.label}</div>
            <div style="font-size: 12px; color: #1a1a1a; font-weight: 500;">${item.value}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Note: The editor content is trusted (user-generated rich text from TipTap editor),
  // not external/untrusted input. This is safe for PDF rendering in an offscreen container.
  const editorContent = editorElement.cloneNode(true) as HTMLElement;

  const noteLabel = document.createElement('div');
  noteLabel.style.cssText = 'font-size: 11px; color: #9ca3af; letter-spacing: 0.5px; margin-bottom: 10px; font-weight: 500;';
  noteLabel.textContent = 'NOTE';

  const editorWrapper = document.createElement('div');
  editorWrapper.style.cssText = 'font-size: 11px; line-height: 1.6; color: #1a1a1a;';
  editorWrapper.appendChild(noteLabel);
  editorWrapper.appendChild(editorContent);

  // Build the print container using DOM methods for safety
  const headerFragment = document.createRange().createContextualFragment(headerHtml);
  printContainer.appendChild(headerFragment);
  if (metaHtml) {
    const metaFragment = document.createRange().createContextualFragment(metaHtml);
    printContainer.appendChild(metaFragment);
  }
  printContainer.appendChild(editorWrapper);
  document.body.appendChild(printContainer);

  try {
    const canvas = await html2canvas(printContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pdfWidth - margin * 2;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgHeight = (canvasHeight * contentWidth) / canvasWidth;

    let heightLeft = imgHeight;
    let position = margin;
    let pageNumber = 1;
    const totalPages = Math.ceil(imgHeight / (pdfHeight - margin * 2));

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
    addPageFooter(pdf, pageNumber, totalPages, pdfWidth, pdfHeight);
    heightLeft -= (pdfHeight - margin * 2);

    while (heightLeft > 0) {
      position = -(imgHeight - heightLeft) + margin;
      pdf.addPage();
      pageNumber++;
      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
      addPageFooter(pdf, pageNumber, totalPages, pdfWidth, pdfHeight);
      heightLeft -= (pdfHeight - margin * 2);
    }

    const fileName = metadata.symbol && metadata.date
      ? `${metadata.symbol}_${metadata.date}_TradeNote.pdf`
      : `TradeNote_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.pdf`;

    pdf.save(fileName);
  } finally {
    document.body.removeChild(printContainer);
  }
}

function addPageFooter(
  pdf: jsPDF,
  pageNumber: number,
  totalPages: number,
  pageWidth: number,
  pageHeight: number
): void {
  pdf.setFontSize(8);
  pdf.setTextColor(156, 163, 175);
  pdf.text(
    `Page ${pageNumber} / ${totalPages}`,
    pageWidth - 15,
    pageHeight - 5,
    { align: 'right' }
  );
}
