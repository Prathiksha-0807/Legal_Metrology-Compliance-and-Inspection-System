/**
 * PDF Inspection Report Generator
 * Generates official Legal Metrology compliance inspection certificates using PDFKit
 */

const PDFDocument = require('pdfkit');

function generateCompliancePDF(scanRecord, res, viewer = {}) {
   const doc = new PDFDocument({ margin: 40, size: 'A4', compress: false });

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

   const roleLabel = String(viewer.role || scanRecord.role || 'INSPECTOR').toLowerCase();
   const userName = viewer.name || scanRecord.inspectorName || 'Officer';
   const identityLabel = `${roleLabel}: ${userName}`;
   const pageBottom = 770;
   const wrapText = (value, width, font = 'Helvetica', size = 7.5) => {
      doc.font(font).fontSize(size);
      return doc.heightOfString(String(value || ''), { width, lineGap: 1 });
   };
   const ensureSpace = (height) => {
      if (tableY + height > pageBottom) {
         doc.addPage();
         tableY = 40;
      }
   };

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
   doc.text(identityLabel, 320, metaY + 28);
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

   // 4. Summary and extracted declarations
   const summary = scanRecord.summary || {};
   let tableY = statusY + 42;
   doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('COMPLIANCE SUMMARY', 40, tableY);
   const summaryText = `Checked: ${summary.totalRulesChecked || 0}   Correct: ${summary.correct ?? summary.passed ?? 0}   Incorrect: ${summary.incorrect ?? summary.failed ?? 0}   Missing: ${summary.missing || 0}   Not Applicable: ${summary.notApplicable ?? summary.exempt ?? 0}   Not Detected: ${summary.notDetected || 0}`;
   const summaryHeight = wrapText(summaryText, 515, 'Helvetica', 8);
   doc.font('Helvetica').fontSize(8).fillColor('#334155').text(summaryText, 40, tableY + 14, { width: 515 });
   tableY += 18 + summaryHeight;
   doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('EXTRACTED PRODUCT INFORMATION', 40, tableY);
   doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
   const fields = scanRecord.extractedFields || {};
   const fieldText = (field) => field && field.text ? field.text : 'Not Detected';
   const extractedLines = [
      `Product: ${fieldText(fields.commodityName)} | Manufacturer: ${fieldText(fields.manufacturer)}`,
      `Net quantity: ${fieldText(fields.netQuantity)} | MRP: ${fieldText(fields.mrp)} | Mfg/Pkd: ${fieldText(fields.mfgDate)}`,
      `Best before: ${fieldText(fields.bestBefore)} | Expiry: ${fieldText(fields.expiry)} | Batch/Lot: ${fieldText(fields.batchNumber)}`,
      `Consumer care: ${fieldText(fields.consumerCare)} | Country of origin: ${fieldText(fields.countryOfOrigin)}`
   ];
   let extractedY = tableY + 14;
   extractedLines.forEach((line) => {
      doc.text(line, 40, extractedY, { width: 515 });
      extractedY += wrapText(line, 515, 'Helvetica', 7.5) + 3;
   });
   tableY = extractedY + 6;

   // 5. Rule-by-Rule Checklist Table
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
      const title = item.title || item.field || '';
      const snippet = item.extractedText || 'NOT FOUND';
      const explanation = item.explanation || '';
      const ruleHeight = wrapText(item.ruleReference || item.ruleId, 95, 'Helvetica-Bold', 7.5);
      const titleHeight = wrapText(title, 120, 'Helvetica', 7.5);
      const snippetHeight = wrapText(snippet, 190, 'Helvetica', 7);
      const contentHeight = Math.max(ruleHeight, titleHeight, snippetHeight);
      const explanationHeight = wrapText(explanation, 325, 'Helvetica-Oblique', 6.5);
      const explanationY = tableY + 4 + contentHeight + 3;
      const rowHeight = Math.max(38, 4 + contentHeight + 3 + explanationHeight + 5);
      ensureSpace(rowHeight);
      const rowBg = index % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(40, tableY, 515, rowHeight).fill(rowBg);

      // Rule Ref
      doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold')
         .text(item.ruleReference || item.ruleId, 45, tableY + 4, { width: 95 });

      // Title
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica')
         .text(title, 145, tableY + 4, { width: 120 });

      // Extracted snippet
      doc.fillColor('#0f172a').fontSize(7).font('Helvetica')
         .text(snippet, 270, tableY + 4, { width: 190 });

      // Verdict Badge
      let vColor = '#15803d';
      if (item.verdict === 'FAIL') vColor = '#b91c1c';
      if (item.verdict === 'REVIEW' || item.verdict === 'NOT_DETECTED') vColor = '#d97706';
      if (item.verdict === 'EXEMPT') vColor = '#0369a1';

      const verdictX = 475;
      const verdictWidth = 70;
      doc.rect(verdictX, tableY + 4, verdictWidth, 14).fill(vColor);
      const verdictText = item.verdict === 'NOT_DETECTED' ? 'NOT DETECTED' : item.verdict;
      doc.fillColor('#ffffff').fontSize(item.verdict === 'NOT_DETECTED' ? 6.5 : 7.5).font('Helvetica-Bold')
         .text(verdictText, verdictX, tableY + 7, { width: verdictWidth, align: 'center', lineBreak: false });

      // Explanation subtext
      doc.fillColor('#64748b').fontSize(6.5).font('Helvetica-Oblique')
         .text(explanation, 145, explanationY, { width: 325, lineGap: 1 });

      tableY += rowHeight;
   });

   // 6. Applicable and not-applicable rule explanation
   tableY += 12;
   if (tableY > 680) {
      doc.addPage();
      tableY = 40;
   }
   doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('APPLICABLE RULES', 40, tableY);
   tableY += 13;
   doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
   results.filter(item => item.verdict !== 'EXEMPT').slice(0, 12).forEach(item => {
      const text = `${item.title || item.field} | ${item.ruleReference || item.ruleId} | ${item.status || item.verdict}: ${item.explanation || ''}`;
      const height = wrapText(text, 515, 'Helvetica', 7.5) + 3;
      ensureSpace(height);
      doc.text(text, 40, tableY, { width: 515 });
      tableY += height;
   });
   doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('EXEMPT / NOT APPLICABLE', 40, tableY + 5);
   tableY += 18;
   doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
   const exemptResults = results.filter(item => item.verdict === 'EXEMPT');
   (exemptResults.length ? exemptResults : [{ title: 'None', ruleReference: '-', explanation: 'No statutory exemption or category exclusion was applied.' }]).forEach(item => {
      const text = `${item.title} | ${item.ruleReference}: ${item.explanation}`;
      const height = wrapText(text, 515, 'Helvetica', 7.5) + 3;
      ensureSpace(height);
      doc.text(text, 40, tableY, { width: 515 });
      tableY += height;
   });

   // 6. Signature Block
   const sigY = tableY + 25;
   if (sigY > 700) {
      doc.addPage();
      tableY = 40;
   }
   const finalSigY = sigY > 700 ? 65 : sigY;
   if (finalSigY < 740) {
      doc.font('Helvetica').fontSize(8).fillColor('#64748b');
      doc.text('Authorized User Signature:', 40, finalSigY);
      doc.text('Seal of Legal Metrology Authority:', 360, finalSigY);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a');
      doc.text(userName, 40, finalSigY + 28);
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
      doc.text(`${roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)}, Legal Metrology`, 40, finalSigY + 40);
   }

   doc.end();
}

module.exports = {
   generateCompliancePDF
};
