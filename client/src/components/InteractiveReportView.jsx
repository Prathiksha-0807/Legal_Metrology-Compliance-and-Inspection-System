import React, { useState, useRef } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Download, 
  Printer, 
  Edit3, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Ruler, 
  ShieldCheck, 
  UserCheck, 
  FileText,
  HelpCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

export default function InteractiveReportView({ scan, onUpdateScan, currentUser, onNewScan }) {
  const [activeFieldKey, setActiveFieldKey] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showRuler, setShowRuler] = useState(false);
  const [hoveredBox, setHoveredBox] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Manual Override Form State
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState(scan?.overallStatus || 'COMPLIANT');
  const [overrideReason, setOverrideReason] = useState('Physical measurement verified by officer with calibrated gauge');
  const [officerRemarks, setOfficerRemarks] = useState(scan?.remarks || '');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  const imageContainerRef = useRef(null);

  if (!scan) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <FileText size={48} style={{ color: '#94a3b8', margin: '0 auto 1rem auto' }} />
        <h3 style={{ fontSize: '1.15rem', color: '#1e293b' }}>No Active Inspection Selected</h3>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
          Please execute a scan or select a past inspection from the Repository.
        </p>
        <button className="btn btn-primary" onClick={onNewScan}>
          Start New Inspection
        </button>
      </div>
    );
  }

  // Handle Box Click
  const handleBoxClick = (fieldKey) => {
    setActiveFieldKey(activeFieldKey === fieldKey ? null : fieldKey);
  };

  // Submit Manual Override
  const handleSubmitOverride = async (e) => {
    e.preventDefault();
    setIsSubmittingOverride(true);
    try {
      const res = await fetch(`/api/history/${scan.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStatus: overrideStatus,
          reason: overrideReason,
          remarks: officerRemarks
        })
      });
      const data = await res.json();
      if (data.success && data.scan) {
        onUpdateScan(data.scan);
        setShowOverrideModal(false);
      }
    } catch (err) {
      console.error('Failed submitting manual override:', err);
      alert('Error updating inspection record.');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Get field result status
  const getFieldStatus = (fieldKey) => {
    if (!scan.results) return 'pass';
    const match = scan.results.find(r => 
      r.field === fieldKey || 
      (fieldKey === 'MRP' && r.field === 'MRP') ||
      (fieldKey === 'NET_QUANTITY' && (r.field === 'NET_QUANTITY'))
    );
    if (!match) return 'pass';
    if (match.verdict === 'FAIL') return 'fail';
    if (match.verdict === 'REVIEW') return 'review';
    if (match.verdict === 'EXEMPT') return 'exempt';
    return 'pass';
  };

  // Map of detected boxes
  const fieldBoxes = [];
  if (scan.extractedFields) {
    const f = scan.extractedFields;
    if (f.commodityName?.bbox) fieldBoxes.push({ key: 'COMMODITY_NAME', label: 'Commodity Name (Rule 6(1)(b))', bbox: f.commodityName.bbox, text: f.commodityName.text, status: getFieldStatus('COMMODITY_NAME') });
    if (f.netQuantity?.bbox) fieldBoxes.push({ key: 'NET_QUANTITY', label: 'Net Quantity (Rule 6(1)(c) & 13)', bbox: f.netQuantity.bbox, text: f.netQuantity.text, status: getFieldStatus('NET_QUANTITY') });
    if (f.mrp?.bbox) fieldBoxes.push({ key: 'MRP', label: 'MRP Format (Rule 6(1)(e) & 2(m))', bbox: f.mrp.bbox, text: f.mrp.text, status: getFieldStatus('MRP') });
    if (f.mfgDate?.bbox) fieldBoxes.push({ key: 'MFG_DATE', label: 'Mfg/Packing Date (Rule 6(1)(d))', bbox: f.mfgDate.bbox, text: f.mfgDate.text, status: getFieldStatus('MFG_DATE') });
    if (f.manufacturer?.bbox) fieldBoxes.push({ key: 'MANUFACTURER', label: 'Manufacturer Details (Rule 6(1)(a))', bbox: f.manufacturer.bbox, text: f.manufacturer.text, status: getFieldStatus('MANUFACTURER') });
    if (f.consumerCare?.bbox) fieldBoxes.push({ key: 'CONSUMER_CARE', label: 'Consumer Care Cell (Rule 6(2))', bbox: f.consumerCare.bbox, text: f.consumerCare.text, status: getFieldStatus('CONSUMER_CARE') });
  }

  // Summary Banner Config
  let bannerBg = '#15803d';
  let bannerText = 'PACKAGE FULLY COMPLIANT WITH RULES 2011';
  let bannerSub = 'All mandatory declarations under Rule 6(1), Rule 10, Rule 11, Rule 13, and Rule 6(2) verified.';
  let BannerIcon = CheckCircle2;

  if (scan.overallStatus === 'NON_COMPLIANT') {
    bannerBg = '#b91c1c';
    bannerText = 'NON-COMPLIANT: STATUTORY VIOLATION DETECTED';
    bannerSub = 'Mandatory declaration defects flagged under the Legal Metrology (Packaged Commodities) Rules, 2011.';
    BannerIcon = XCircle;
  } else if (scan.overallStatus === 'NEEDS_REVIEW') {
    bannerBg = '#b45309';
    bannerText = 'NEEDS MANUAL REVIEW / PHYSICAL GAUGE CHECK';
    bannerSub = 'Numeral height or declaration legibility requires on-ground officer physical scale verification.';
    BannerIcon = AlertTriangle;
  } else if (scan.overallStatus === 'EXEMPT') {
    bannerBg = '#0284c7';
    bannerText = 'STATUTORY EXEMPTION APPLIED (RULE 26)';
    bannerSub = 'Exempted from standard pack size and price breakdown under Rule 26 statutory criteria (net quantity ≤ 10g/10ml).';
    BannerIcon = Info;
  }

  return (
    <div className="animate-fade-in">
      {/* Top Action & Export Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Inspection Reference:</span>{' '}
          <strong style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#0f172a' }}>{scan.id}</strong>
          <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>•</span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Scanned: {new Date(scan.timestamp).toLocaleString()}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setShowOverrideModal(true)}
            title="Inspector manual override or remark logging"
          >
            <Edit3 size={14} />
            Officer Remarks / Override
          </button>

          <a 
            href={`/api/reports/${scan.id}/pdf`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            title="Download official PDF compliance certificate"
          >
            <Download size={14} />
            Export Official PDF Report
          </a>

          <a 
            href={`/api/reports/${scan.id}/json`} 
            download={`Legal_Metrology_${scan.id}.json`}
            className="btn btn-secondary btn-sm"
            title="Export raw JSON audit data"
          >
            <FileText size={14} />
            JSON
          </a>

          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div 
        style={{ 
          backgroundColor: bannerBg, 
          color: '#ffffff', 
          borderRadius: '10px', 
          padding: '1rem 1.25rem', 
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <BannerIcon size={32} />
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.02em' }}>
            {bannerText}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.95, marginTop: '2px' }}>
            {bannerSub}
          </div>
        </div>

        {scan.manualOverride && (
          <div style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.25)', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem' }}>
            <strong>Manual Override Active:</strong> Changed by {scan.manualOverride.byUser}
          </div>
        )}
      </div>

      {/* Dual Pane Layout */}
      <div className="grid-2">
        {/* Left Pane: Interactive Label Image Canvas with Bounding Boxes */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div className="card-title">
              <ShieldCheck size={18} className="text-blue-600" />
              Interactive Label Inspector &amp; Bounding Boxes (FR-2.1)
            </div>
            {/* Zoom & Ruler Controls */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.0))}
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.75))}
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setZoomLevel(1)}
                title="Reset Zoom"
              >
                <RotateCcw size={14} />
              </button>
              <button 
                className={`btn btn-sm ${showRuler ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShowRuler(!showRuler)}
                title="Rule 7 Numeral Height Ruler & Scale Tool"
              >
                <Ruler size={14} />
                Rule 7 Calibrator
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
            Click any highlighted bounding box on the label to locate its statutory rule check:
          </div>

          {/* Canvas Wrapper */}
          <div 
            className="canvas-wrapper" 
            ref={imageContainerRef}
            style={{ overflow: 'auto', flex: 1, minHeight: '520px', position: 'relative' }}
          >
            <div 
              className="image-canvas-container"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
            >
              <img 
                src={scan.imageUrl} 
                alt={scan.productName} 
                className="inspection-image"
              />

              {/* Interactive SVG Bounding Boxes Overlay */}
              <svg className="overlay-svg" viewBox="0 0 600 680">
                {fieldBoxes.map((box) => {
                  const isActive = activeFieldKey === box.key;
                  return (
                    <g key={box.key}>
                      <rect
                        x={box.bbox.x}
                        y={box.bbox.y}
                        width={box.bbox.w}
                        height={box.bbox.h}
                        rx="4"
                        className={`bbox-rect ${box.status} ${isActive ? 'active' : ''}`}
                        onClick={() => handleBoxClick(box.key)}
                        onMouseEnter={(e) => {
                          setHoveredBox(box);
                          setTooltipPos({ x: box.bbox.x + box.bbox.w / 2, y: box.bbox.y - 10 });
                        }}
                        onMouseLeave={() => setHoveredBox(null)}
                      />
                      {/* Box Label Tag */}
                      <text
                        x={box.bbox.x + 4}
                        y={box.bbox.y - 4}
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        style={{ pointerEvents: 'none', textShadow: '0 1px 2px #000000' }}
                      >
                        {box.key}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Hover Tooltip */}
              {hoveredBox && (
                <div 
                  className="bbox-tooltip"
                  style={{ 
                    left: `${tooltipPos.x}px`, 
                    top: `${tooltipPos.y}px`,
                    transform: 'translate(-50%, -100%)'
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#f8fafc' }}>{hoveredBox.label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '2px' }}>
                    "{hoveredBox.text}"
                  </div>
                  <div style={{ fontSize: '0.65rem', marginTop: '4px', textTransform: 'uppercase', fontWeight: 600, color: hoveredBox.status === 'pass' ? '#86efac' : '#fca5a5' }}>
                    Status: {hoveredBox.status.toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rule 7 Numeral Font Height Calibrator Tool Panel */}
          {showRuler && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.75rem' }}>
              <div style={{ fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <Ruler size={15} />
                Rule 7 Numeral Height Calibration Tool (Table I &amp; II)
              </div>
              <div style={{ color: '#334155' }}>
                Net Quantity numeral detected bounding box: <strong>{scan.extractedFields?.netQuantity?.bbox?.h || 45} px</strong>.
                At calibrated 150 DPI (~5.9 px/mm), estimated physical print height is <strong>~{((scan.extractedFields?.netQuantity?.bbox?.h || 45) * 25.4 / 150).toFixed(1)} mm</strong>.
              </div>
              <div style={{ marginTop: '0.35rem', color: '#64748b' }}>
                Prescribed minimums: Up to 50g: 1.0mm | 50g to 200g: 2.0mm | 200g to 1kg: 4.0mm | &gt;1kg: 6.0mm.
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b', justifyContent: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '10px', height: '10px', background: '#22c55e', borderRadius: '2px' }}></span> Compliant (Pass)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px' }}></span> Non-compliant (Fail)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '2px' }}></span> Needs Manual Review
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '10px', height: '10px', background: '#0ea5e9', borderRadius: '2px' }}></span> Exempt
            </span>
          </div>
        </div>

        {/* Right Pane: Rule-by-Rule Audit Checklist */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div className="card-title">
              <FileText size={18} className="text-blue-600" />
              Rule Compliance Audit Checklist
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {scan.summary?.passed || 0} Passed / {scan.summary?.failed || 0} Failed
            </div>
          </div>

          {/* Product Particulars Mini Card */}
          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div><strong>Commodity:</strong> {scan.productName}</div>
              <div><strong>Category:</strong> {scan.category}</div>
              <div><strong>Principal Display Panel:</strong> {scan.isPDP ? 'Yes (Verified)' : 'No'}</div>
              <div><strong>Inspector:</strong> {scan.inspectorName}</div>
            </div>
          </div>

          {/* Rule Item Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, maxHeight: '600px', paddingRight: '0.25rem' }}>
            {scan.results && scan.results.map((result, idx) => {
              const isSelected = activeFieldKey === result.field;
              let badgeStyle = 'badge-success';
              let verdictIcon = <CheckCircle2 size={16} className="text-emerald-600" />;
              
              if (result.verdict === 'FAIL') {
                badgeStyle = 'badge-danger';
                verdictIcon = <XCircle size={16} className="text-rose-600" />;
              } else if (result.verdict === 'REVIEW') {
                badgeStyle = 'badge-warning';
                verdictIcon = <AlertTriangle size={16} className="text-amber-600" />;
              } else if (result.verdict === 'EXEMPT') {
                badgeStyle = 'badge-info';
                verdictIcon = <Info size={16} className="text-sky-600" />;
              }

              return (
                <div 
                  key={idx}
                  onClick={() => handleBoxClick(result.field)}
                  style={{
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.75rem 0.9rem',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e3a8a', letterSpacing: '0.01em' }}>
                        {result.ruleReference}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                        {result.title}
                      </div>
                    </div>
                    <span className={`badge ${badgeStyle}`}>
                      {verdictIcon}
                      {result.verdict}
                    </span>
                  </div>

                  {/* Extracted Text snippet */}
                  <div style={{ fontSize: '0.75rem', color: '#475569', background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #f1f5f9', margin: '0.35rem 0', fontFamily: 'monospace' }}>
                    <strong>Extracted Text:</strong> "{result.extractedText || 'NOT FOUND'}"
                  </div>

                  {/* Legal Explanation */}
                  <div style={{ fontSize: '0.75rem', color: result.verdict === 'FAIL' ? '#991b1b' : '#334155', lineHeight: 1.4 }}>
                    {result.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Manual Override & Officer Remarks Modal */}
      {showOverrideModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(3px)'
          }}
        >
          <div className="card" style={{ maxWidth: '520px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header">
              <div className="card-title">
                <Edit3 size={18} className="text-blue-600" />
                Officer Manual Override &amp; Remarks (FR-4.3)
              </div>
              <button 
                onClick={() => setShowOverrideModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitOverride} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569' }}>
                <UserCheck size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Logged Officer: <strong>{currentUser.name}</strong> ({currentUser.role})
                <br />
                All overrides are permanently logged into the enforcement repository for legal auditability.
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
                  Compliance Verdict Override:
                </label>
                <select 
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="COMPLIANT">COMPLIANT (Confirmed by officer physical test)</option>
                  <option value="NON_COMPLIANT">NON-COMPLIANT (Violation issued)</option>
                  <option value="NEEDS_REVIEW">NEEDS REVIEW (Referred to Legal Metrology Controller)</option>
                  <option value="EXEMPT">EXEMPT (Statutory Exemption applied under Rule 26)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
                  Override Justification / Reason:
                </label>
                <select 
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '0.5rem' }}
                >
                  <option value="Physical measurement verified by officer with calibrated gauge">Physical measurement verified by officer with calibrated gauge</option>
                  <option value="Label text verified legible under physical inspection">Label text verified legible under physical inspection</option>
                  <option value="Manufacturer registered address verified on state database">Manufacturer registered address verified on state database</option>
                  <option value="Exemption certificate produced by packer">Exemption certificate produced by packer</option>
                  <option value="Confirmed counterfeit or illegal labeling">Confirmed counterfeit or illegal labeling</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
                  Detailed Inspector Observations / Remarks:
                </label>
                <textarea 
                  rows="3"
                  value={officerRemarks}
                  onChange={(e) => setOfficerRemarks(e.target.value)}
                  placeholder="Enter detailed enforcement remarks, seizure note references, or notice details..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowOverrideModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                  disabled={isSubmittingOverride}
                >
                  {isSubmittingOverride ? 'Saving...' : 'Save & Sign Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
