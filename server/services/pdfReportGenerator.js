/**
 * PDF Inspection Report Generator
 * Generates official Legal Metrology compliance inspection certificates using PDFKit
 */

const PDFDocument = require('pdfkit');

function generateCompliancePDF(scanRecord, res) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  // Stream output directly to express response
  doc.pipe(res);

  // 1. Official Header
  doc.rect(40, 40, 515, 65).fill('#0f172a');
  
  doc.fillColor('#ffffff')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('LEGAL METROLOGY COMPLIANCE INSPECTION REPORT', 50, 52, { align: 'center' });
  
  doc.fontSize(9)
     .font('Helvetica')
     .fillColor('#cbd5e1')
     .text('Verification under Legal Metrology (Packaged Commodities) Rules, 2011', 50, 72, { align: 'center' });
  
  doc.fontSize(8)
     .fillColor('#94a3b8')
     .text(`Report Ref: ${scanRecord.id} | Generated: ${new Date(scanRecord.timestamp).toLocaleString()}`, 50, 88, { align: 'center' });

  doc.moveDown(2);

  // 2. Metadata Grid
  const metaY = 120;
  doc.rect(40, metaY, 515, 95).strokeColor('#cbd5e1').lineWidth(1).stroke();
  doc.rect(40, metaY, 515, 20).fill('#f1f5f9');
  
  doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold')
     .text('PACKAGE & INSPECTION PARTICULARS', 50, metaY + 5);

  doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a');
  
  // Column 1
  doc.text(`Commodity: ${scanRecord.productName || 'Unspecified'}`, 50, metaY + 28);
  doc.text(`Category: ${scanRecord.category || 'General FMCG'}`, 50, metaY + 44);
  doc.text(`Principal Display Panel: ${scanRecord.isPDP ? 'YES (Verified)' : 'NO'}`, 50, metaY + 60);
  doc.text(`Manufacturer: ${scanRecord.manufacturer || 'Not Detected'}`, 50, metaY + 76);

  // Column 2
  doc.text(`Inspector: ${scanRecord.inspectorName || 'Enforcement Officer'}`, 320, metaY + 28);
  doc.text(`Badge / ID: ${scanRecord.inspectorId || 'LM-DL-884'}`, 320, metaY + 44);
  doc.text(`Inspection Timestamp: ${new Date(scanRecord.timestamp).toLocaleDateString()}`, 320, metaY + 60);

  // 3. Overall Verdict Banner
  const statusY = metaY + 110;
  let bannerColor = '#15803d'; // Green
  let statusText = 'OVERALL COMPLIANCE STATUS: COMPLIANT';

  if (scanRecord.overallStatus === 'NON_COMPLIANT') {
    bannerColor = '#b91c1c'; // Red
    statusText = 'OVERALL COMPLIANCE STATUS: NON-COMPLIANT (VIOLATION FLAGGED)';
  } else if (scanRecord.overallStatus === 'NEEDS_REVIEW') {
    bannerColor = '#b45309'; // Amber
    statusText = 'OVERALL COMPLIANCE STATUS: NEEDS MANUAL REVIEW / GAUGE CALIBRATION';
  } else if (scanRecord.overallStatus === 'EXEMPT') {
    bannerColor = '#0369a1'; // Blue
    statusText = 'OVERALL COMPLIANCE STATUS: STATUTORY EXEMPTION APPLIED (RULE 26)';
  }

  doc.rect(40, statusY, 515, 28).fill(bannerColor);
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
     .text(statusText, 50, statusY + 8, { align: 'center' });

  // 4. Rule-by-Rule Checklist Table
  let tableY = statusY + 40;
  doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
     .text('RULE-BY-RULE VERIFICATION AUDIT', 40, tableY);

  tableY += 16;
  doc.rect(40, tableY, 515, 20).fill('#e2e8f0');
  doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold');
  doc.text('Rule Reference', 45, tableY + 5);
  doc.text('Mandatory Declaration', 145, tableY + 5);
  doc.text('Extracted Label Text', 270, tableY + 5);
  doc.text('Verdict', 485, tableY + 5);

  tableY += 20;

  const results = scanRecord.results || [];
  results.forEach((item, index) => {
    // Check page overflow
    if (tableY > 700) {
      doc.addPage();
      tableY = 40;
    }

    const rowBg = index % 2 === 0 ? '#f8fafc' : '#ffffff';
    doc.rect(40, tableY, 515, 34).fill(rowBg);

    // Rule Ref
    doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold')
       .text(item.ruleReference || item.ruleId, 45, tableY + 4, { width: 95 });

    // Title
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica')
       .text(item.title || item.field, 145, tableY + 4, { width: 120 });

    // Extracted snippet
    const snippet = (item.extractedText || 'NOT FOUND').substring(0, 55);
    doc.fillColor('#0f172a').fontSize(7).font('Helvetica')
       .text(snippet, 270, tableY + 4, { width: 205 });

    // Verdict Badge
    let vColor = '#15803d';
    if (item.verdict === 'FAIL') vColor = '#b91c1c';
    if (item.verdict === 'REVIEW') vColor = '#b45309';
    if (item.verdict === 'EXEMPT') vColor = '#0369a1';

    doc.rect(480, tableY + 4, 65, 14).fill(vColor);
    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold')
       .text(item.verdict, 480, tableY + 7, { width: 65, align: 'center' });

    // Explanation subtext
    const explanation = (item.explanation || '').substring(0, 110);
    doc.fillColor('#64748b').fontSize(6.5).font('Helvetica-Oblique')
       .text(explanation, 145, tableY + 18, { width: 325 });

    tableY += 34;
  });

  // 5. Inspector Remarks & Override Section
  tableY += 15;
  if (tableY > 670) {
    doc.addPage();
    tableY = 40;
  }

  doc.rect(40, tableY, 515, 70).strokeColor('#cbd5e1').lineWidth(1).stroke();
  doc.rect(40, tableY, 515, 18).fill('#f1f5f9');
  doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold')
     .text('OFFICER MANUAL OVERRIDE & REMARKS LOG', 45, tableY + 4);

  const overrideInfo = scanRecord.manualOverride;
  if (overrideInfo) {
    doc.fillColor('#b45309').fontSize(7.5).font('Helvetica-Bold')
       .text(`[MANUAL OVERRIDE APPLIED]: Verdict changed from ${overrideInfo.previousStatus} to ${overrideInfo.newStatus} by ${overrideInfo.byUser} at ${overrideInfo.timestamp}`, 45, tableY + 24);
    doc.fillColor('#334155').fontSize(7.5).font('Helvetica')
       .text(`Reason / Remarks: ${overrideInfo.reason || 'No remarks provided'}`, 45, tableY + 38);
  } else {
    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Oblique')
       .text('No manual override recorded. Automated rule engine findings confirmed.', 45, tableY + 28);
    if (scanRecord.remarks) {
      doc.fillColor('#0f172a').font('Helvetica')
         .text(`Officer Remarks: ${scanRecord.remarks}`, 45, tableY + 42);
    }
  }

  // 6. Signature Block
  const sigY = tableY + 85;
  if (sigY < 740) {
    doc.font('Helvetica').fontSize(8).fillColor('#64748b');
    doc.text('Inspecting Officer Signature:', 40, sigY);
    doc.text('Seal of Legal Metrology Authority:', 360, sigY);
    
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a');
    doc.text(scanRecord.inspectorName || 'Officer R. Sharma', 40, sigY + 28);
    doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
    doc.text('Inspector, Legal Metrology (Enforcement)', 40, sigY + 40);
  }

  doc.end();
}

module.exports = {
  generateCompliancePDF
};
