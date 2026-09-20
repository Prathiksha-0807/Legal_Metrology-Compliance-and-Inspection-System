import React from 'react';
import { 
  BookOpen, 
  Cpu, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink,
  Shield,
  FileCheck
} from 'lucide-react';

export default function ArchitectureGuideView() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overview Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <BookOpen size={20} className="text-blue-600" />
            System Architecture &amp; Technical Implementation Note (PS 26034)
          </div>
          <span className="badge badge-info">Legal Metrology Rules, 2011</span>
        </div>

        <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
          Existing systems (generic cloud OCR engines, barcode scanners, eTulaman, state portals) either extract raw text without understanding legal semantics, or manage case workflows without reading the physical package label.
          The primary differentiator of this prototype is combining <strong>label visual understanding + an explainable rule engine specific to the Legal Metrology (Packaged Commodities) Rules, 2011</strong>.
        </p>
      </div>

      {/* End-to-End Pipeline Diagram */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Cpu size={18} className="text-blue-600" />
            End-to-End Processing Pipeline (FR-1 through FR-4)
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', padding: '0.5rem 0' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb' }}>STAGE 1</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: '2px' }}>Multi-Panel Upload &amp; Preprocessing</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Deskew, contrast normalization, grayscale enhancement, and Principal Display Panel (PDP) tagging.
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb' }}>STAGE 2</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: '2px' }}>OCR &amp; Bounding Boxes</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Optical Character Recognition extracting words and layout bounding box coordinates [x, y, w, h].
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb' }}>STAGE 3</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: '2px' }}>NLP Declaration Classifier</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Maps text blocks to Rule 6(1) fields: MRP, Net Qty, Mfg Date, Mfr Address, and Consumer Care cell.
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb' }}>STAGE 4</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: '2px' }}>Configurable Rule Engine</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Evaluates against Rules 2(m), 5, 6, 7, 10, 11, 12(6), 13, and 26. Generates Pass/Fail with citations.
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb' }}>STAGE 5</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: '2px' }}>Enforcement Report &amp; PDF</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Interactive label overlay, PDF certificate export, officer remarks, and manual override audit logging.
            </div>
          </div>
        </div>
      </div>

      {/* Rule Mapping Reference Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileCheck size={18} className="text-blue-600" />
            Statutory Rule-to-Check Coverage Matrix (Section 4)
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Mandatory Declaration</th>
              <th>Rule Reference</th>
              <th>Verification Logic</th>
              <th>Prototype Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Manufacturer / Packer</strong></td>
              <td>Rule 6(1)(a), Rule 10</td>
              <td>Name present; physical address includes locatable premises &amp; 6-digit postal PIN code</td>
              <td><span className="badge badge-success">Automated</span></td>
            </tr>
            <tr>
              <td><strong>Generic Commodity Name</strong></td>
              <td>Rule 6(1)(b)</td>
              <td>Common name prominently present on Principal Display Panel (PDP)</td>
              <td><span className="badge badge-success">Automated</span></td>
            </tr>
            <tr>
              <td><strong>Net Quantity &amp; SI Unit</strong></td>
              <td>Rule 6(1)(c), Rule 11 &amp; 13</td>
              <td>Correct SI standard symbol (g, kg, ml, L) matching magnitude threshold</td>
              <td><span className="badge badge-success">Automated</span></td>
            </tr>
            <tr>
              <td><strong>Prohibited Words</strong></td>
              <td>Rule 12(6)</td>
              <td>Absence of misleading qualifiers ("approx", "minimum", "about", "average")</td>
              <td><span className="badge badge-success">Automated</span></td>
            </tr>
            <tr>
              <td><strong>MRP Statutory Format</strong></td>
              <td>Rule 6(1)(e), Rule 2(m)</td>
              <td>Must state "MRP" / "Maximum Retail Price", currency (₹ / Rs.), and "inclusive of all taxes"</td>
              <td><span className="badge badge-success">Automated</span></td>
            </tr>
            <tr>
              <td><strong>Date of Mfg / Packing</strong></td>
              <td>Rule 6(1)(d)</td>
              <td>Month and year of manufacture or packing present (exempt for agarbatti/bidis)</td>
              <td><span className="badge badge-success">Automated</span></td>
            </tr>
            <tr>
              <td><strong>Consumer Care Details</strong></td>
              <td>Rule 6(2)</td>
              <td>Name/designation, postal address, helpline phone/toll-free, and email address</td>
              <td><span className="badge badge-success">Automated</span></td>
            </tr>
            <tr>
              <td><strong>Second Schedule Pack Sizes</strong></td>
              <td>Rule 5, Second Schedule</td>
              <td>Matches prescribed sizes for Tea, Biscuits, Edible Oils, Detergents; else flags non-standard disclaimer</td>
              <td><span className="badge badge-success">Automated</span></td>
            </tr>
            <tr>
              <td><strong>Numeral Font Height</strong></td>
              <td>Rule 7 (Tables I &amp; II)</td>
              <td>BBox pixel height converted to mm via DPI; interactive calibration tool for officer gauge</td>
              <td><span className="badge badge-warning">Interactive Gauge</span></td>
            </tr>
            <tr>
              <td><strong>Statutory Exemptions</strong></td>
              <td>Rule 26</td>
              <td>Correctly waives standard pack sizes &amp; detailed checks for small packages ≤ 10g or 10ml</td>
              <td><span className="badge badge-info">Automated Filter</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Known Limitations Note (Section 8) */}
      <div className="card" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
        <div className="card-header" style={{ borderBottomColor: '#fde68a' }}>
          <div className="card-title" style={{ color: '#92400e' }}>
            <AlertCircle size={18} className="text-amber-600" />
            Engineering Trade-Offs &amp; Known Limitations Note (Section 8)
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#78350f', display: 'flex', flexDirection: 'column', gap: '0.65rem', lineHeight: 1.5 }}>
          <div>
            <strong>1. Physical Scale &amp; Font Height (Rule 7):</strong> Pure 2D smartphone photos do not have inherent real-world metric scales unless a fiducial marker (e.g. ArUco tag, coin, or calibrated gauge card) is present in the frame. The prototype provides an interactive pixel-to-mm calibrator (assuming 150 DPI) and flags borderline cases for on-ground officer gauge measurement.
          </div>
          <div>
            <strong>2. Second Schedule Commodity Classification:</strong> Standard pack sizes vary across 20+ commodity categories in the Second Schedule. In the prototype, category mapping is driven by configurable keyword lookup and drop-down selection rather than an end-to-end multi-label image classifier.
          </div>
          <div>
            <strong>3. Multi-Script Devanagari OCR:</strong> While the pipeline parses Unicode Devanagari characters for Rule 9(4) language checks, OCR accuracy on stylized Hindi fonts on curved packaging remains lower than Latin script in low-light conditions.
          </div>
          <div>
            <strong>4. Future Scope:</strong> Integration with the National e-Commerce Portal, mobile on-device Tesseract/CoreML runtime for field officers with zero internet connectivity, and manufacturer self-compliance pre-check API.
          </div>
        </div>
      </div>
    </div>
  );
}
