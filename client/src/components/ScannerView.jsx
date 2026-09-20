import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Sparkles, 
  Layers, 
  RotateCw, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Play, 
  FileCheck,
  Package
} from 'lucide-react';

export default function ScannerView({ samples, onScanComplete }) {
  const [selectedSample, setSelectedSample] = useState(samples[0] || null);
  const [productName, setProductName] = useState(samples[0]?.name || 'Golden Leaf CTC Tea (250g)');
  const [category, setCategory] = useState(samples[0]?.category || 'Tea');
  const [isPDP, setIsPDP] = useState(true);
  
  // Custom upload state
  const [uploadedFiles, setUploadedFiles] = useState({
    pdpImage: null,
    backImage: null,
    otherImage: null
  });
  const [activePreviewUrl, setActivePreviewUrl] = useState(samples[0]?.image || '/samples/sample_tea_label.svg');
  
  // Preprocessor controls
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [isBinarized, setIsBinarized] = useState(false);

  // Scanning progress state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Update selected sample
  const handleSelectSample = (sample) => {
    setSelectedSample(sample);
    setProductName(sample.name);
    setCategory(sample.category);
    setIsPDP(sample.isPDP);
    setActivePreviewUrl(sample.image);
    setUploadedFiles({ pdpImage: null, backImage: null, otherImage: null });
    setBrightness(0);
    setContrast(0);
    setRotation(0);
    setIsBinarized(false);
  };

  // Custom file upload
  const handleFileChange = (e, panelType = 'pdpImage') => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedFiles(prev => ({ ...prev, [panelType]: file }));
      setActivePreviewUrl(url);
      setSelectedSample(null);
      if (panelType === 'pdpImage') {
        setIsPDP(true);
      }
    }
  };

  // Preprocessing Canvas redraw
  useEffect(() => {
    if (!activePreviewUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width || 600;
      canvas.height = img.height || 680;

      ctx.save();
      // Handle rotation
      if (rotation !== 0) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
      }

      // Apply CSS-like canvas filters
      const bVal = 100 + brightness;
      const cVal = 100 + contrast;
      ctx.filter = `brightness(${bVal}%) contrast(${cVal}%) ${isBinarized ? 'grayscale(100%) contrast(200%)' : ''}`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    };
    img.src = activePreviewUrl;
  }, [activePreviewUrl, brightness, contrast, rotation, isBinarized]);

  // Trigger Scan
  const handleRunScan = async () => {
    setIsScanning(true);

    try {
      setScanStep('Preprocessing label & normalizing contrast...');
      await new Promise(r => setTimeout(r, 450));

      setScanStep('Running OCR Engine & layout bounding box extraction...');
      await new Promise(r => setTimeout(r, 650));

      setScanStep('Classifying declarations under Rule 6(1) & Rule 6(2)...');
      await new Promise(r => setTimeout(r, 550));

      setScanStep('Evaluating Legal Metrology Rules (MRP, SI Units, Second Schedule, Font)...');

      let response;
      if (selectedSample) {
        // Run sample scan
        response = await fetch(`/api/scan/sample/${selectedSample.id}`, {
          method: 'POST'
        });
      } else {
        // Upload custom image
        const formData = new FormData();
        if (uploadedFiles.pdpImage) formData.append('pdpImage', uploadedFiles.pdpImage);
        if (uploadedFiles.backImage) formData.append('backImage', uploadedFiles.backImage);
        if (uploadedFiles.otherImage) formData.append('otherImage', uploadedFiles.otherImage);
        formData.append('productName', productName);
        formData.append('category', category);
        formData.append('isPDP', String(isPDP));

        response = await fetch('/api/scan/upload', {
          method: 'POST',
          body: formData
        });
      }

      const data = await response.json();
      if (data.success && data.scan) {
        onScanComplete(data.scan);
      } else {
        alert(data.error || 'Scan analysis failed. Please try again.');
      }
    } catch (err) {
      console.error('Scan execution error:', err);
      alert('Network or server error during scan execution.');
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* 1. Preloaded Test Samples Section */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} className="text-amber-500" />
            Instant Test Packages (Preloaded Realistic Test Cases)
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Click any package to test specific Legal Metrology compliance scenarios
          </span>
        </div>

        <div className="samples-bar">
          {samples.map(sample => {
            const isSelected = selectedSample?.id === sample.id;
            let badgeClass = 'badge-success';
            let badgeText = 'COMPLIANT';
            if (sample.expectedVerdict === 'NON_COMPLIANT') {
              badgeClass = 'badge-danger';
              badgeText = 'NON-COMPLIANT';
            } else if (sample.expectedVerdict === 'EXEMPT') {
              badgeClass = 'badge-info';
              badgeText = 'RULE 26 EXEMPT';
            }

            return (
              <div
                key={sample.id}
                className={`sample-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectSample(sample)}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '4px', overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
                  <img src={sample.image} alt={sample.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{sample.name}</div>
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{sample.category}</span>
                    <span className={`badge ${badgeClass}`} style={{ fontSize: '0.6rem', padding: '0px 4px' }}>
                      {badgeText}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Main Scan Workstation Grid */}
      <div className="grid-2">
        {/* Left Column: Image Canvas & Preprocessing */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={18} className="text-blue-600" />
              Package Panel &amp; Preprocessing Canvas
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isPDP} 
                  onChange={(e) => setIsPDP(e.target.checked)} 
                />
                <strong>Principal Display Panel (PDP)</strong>
              </label>
            </div>
          </div>

          {/* Interactive Preprocessed Canvas */}
          <div className="canvas-wrapper" style={{ minHeight: '440px' }}>
            <canvas 
              ref={canvasRef} 
              style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }}
            />
          </div>

          {/* Preprocessing Sliders & Controls */}
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#334155' }}>
                <Sliders size={14} /> Image Preprocessing Tools (FR-1.3)
              </span>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => { setBrightness(0); setContrast(0); setRotation(0); setIsBinarized(false); }}
              >
                Reset Adjustments
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'center', fontSize: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', color: '#64748b', marginBottom: '2px' }}>Brightness: {brightness}%</label>
                <input 
                  type="range" min="-50" max="50" value={brightness} 
                  onChange={(e) => setBrightness(parseInt(e.target.value))} 
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#64748b', marginBottom: '2px' }}>Contrast: {contrast}%</label>
                <input 
                  type="range" min="-50" max="50" value={contrast} 
                  onChange={(e) => setContrast(parseInt(e.target.value))} 
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#64748b', marginBottom: '2px' }}>Orientation: {rotation}°</label>
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ width: '100%', padding: '0.2rem' }}
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                >
                  <RotateCw size={12} /> Rotate +90°
                </button>
              </div>

              <div>
                <label style={{ display: 'block', color: '#64748b', marginBottom: '2px' }}>Grayscale / Binarize</label>
                <button 
                  className={`btn btn-sm ${isBinarized ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setIsBinarized(!isBinarized)}
                  style={{ padding: '0.2rem 0.6rem' }}
                >
                  {isBinarized ? 'Active' : 'Enhance Text'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Metadata, Panel Upload & Scan Trigger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Metadata & Commodity Classification Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Package size={18} className="text-blue-600" />
                Commodity &amp; Packaging Particulars
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Commodity Generic Name / Title:
                </label>
                <input 
                  type="text" 
                  value={productName} 
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. CTC Black Tea, Mustard Oil, Detergent Powder"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Commodity Category (Second Schedule Mapping):
                </label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', background: '#ffffff' }}
                >
                  <option value="Tea">Tea (Second Schedule Item 4)</option>
                  <option value="Biscuits">Biscuits (Second Schedule Item 2)</option>
                  <option value="Edible Oils">Edible Oils / Ghee (Second Schedule Item 7)</option>
                  <option value="Detergent Powder">Detergent Powder (Second Schedule Item 11)</option>
                  <option value="Baby Food">Baby Food / Weaning (Second Schedule Item 1)</option>
                  <option value="Wheat Flour (Atta)">Wheat Flour (Atta) (Second Schedule Item 9)</option>
                  <option value="Cosmetics / Shampoo">Cosmetics / Shampoo (Rule 26 Exemption Test)</option>
                  <option value="Spices">Spices &amp; Condiments</option>
                  <option value="General">General / Other Packaged Commodity</option>
                </select>
              </div>

              {/* Upload custom panels */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Or Upload Custom Label Image(s):
                </label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={(e) => handleFileChange(e, 'pdpImage')}
                  style={{ display: 'none' }}
                />
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    border: '2px dashed #cbd5e1', 
                    borderRadius: '8px', 
                    padding: '1.25rem', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    background: '#f8fafc',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                  <Upload size={24} style={{ margin: '0 auto 0.4rem auto', color: '#64748b' }} />
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                    Click to select custom package label photo
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Supports JPEG, PNG, WEBP (Front PDP, Back or Side panels)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Scope Card */}
          <div className="card" style={{ background: '#f8fafc' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileCheck size={16} /> Mandatory Rule Checks Executed in Pipeline:
            </div>
            <ul style={{ fontSize: '0.75rem', color: '#475569', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><strong>Rule 6(1)(a) &amp; Rule 10:</strong> Manufacturer/packer name, address &amp; PIN code</li>
              <li><strong>Rule 6(1)(b):</strong> Generic commodity name on PDP</li>
              <li><strong>Rule 6(1)(c), Rule 11 &amp; 13:</strong> Net quantity magnitude &amp; SI units (g, kg, ml, L)</li>
              <li><strong>Rule 12(6):</strong> Absence of prohibited words ("approx", "minimum", "average")</li>
              <li><strong>Rule 6(1)(e) &amp; Rule 2(m):</strong> MRP with "inclusive of all taxes" statutory clause</li>
              <li><strong>Rule 6(2):</strong> Consumer Care redressal cell (email, phone, address)</li>
              <li><strong>Rule 5 &amp; Second Schedule:</strong> Standard pack size matching &amp; disclaimer</li>
              <li><strong>Rule 26:</strong> Exemption detector for small packs (≤ 10g or 10ml)</li>
            </ul>
          </div>

          {/* Scan Action Execution */}
          <div className="card" style={{ textAlign: 'center', background: '#ffffff' }}>
            {isScanning ? (
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <div style={{ marginTop: '0.75rem', fontWeight: 700, fontSize: '0.9rem', color: '#1e3a8a' }}>
                  Processing Compliance Inspection Pipeline
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {scanStep}
                </div>
              </div>
            ) : (
              <button 
                className="btn btn-primary"
                onClick={handleRunScan}
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Play size={18} fill="#ffffff" />
                Run Legal Metrology Compliance Scan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
