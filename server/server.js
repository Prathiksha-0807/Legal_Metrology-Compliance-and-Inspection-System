const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { classifyExtractedText } = require('./services/nlpClassifier');
const { evaluateCompliance, getRulesConfig, getStandardPacks } = require('./services/ruleEngine');
const { processImageOCR } = require('./services/ocrService');
const { generateCompliancePDF } = require('./services/pdfReportGenerator');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static assets: sample images and uploaded files
const publicPath = path.join(__dirname, 'public');
const uploadsPath = path.join(__dirname, 'uploads');
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');

app.use('/samples', express.static(path.join(publicPath, 'samples')));
app.use('/uploads', express.static(uploadsPath));
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}


// Data file paths
const scansFile = path.join(__dirname, 'data', 'scans.json');
const rulesFile = path.join(__dirname, 'data', 'rules.json');
const standardPacksFile = path.join(__dirname, 'data', 'standard_packs.json');
const samplesFile = path.join(__dirname, 'data', 'samples.json');
const usersFile = path.join(__dirname, 'data', 'users.json');

// Helper to read/write JSON data
function readJson(filePath, defaultVal = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultVal;
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `pkg_${Date.now()}_${uuidv4().substring(0, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WEBP, SVG) are allowed.'));
    }
  }
});

// Current user state (defaults to Inspector, switchable to Admin)
let currentUser = {
  id: 'usr_inspector_01',
  name: 'Inspector R. Sharma',
  role: 'INSPECTOR',
  designation: 'Legal Metrology Inspector, Zone 4',
  badgeNumber: 'LM-DL-2024-884'
};

// ==========================================
// 1. AUTH & USER ENDPOINTS
// ==========================================
app.get('/api/auth/me', (req, res) => {
  res.json({ success: true, user: currentUser });
});

app.post('/api/auth/switch-role', (req, res) => {
  const { role } = req.body;
  const users = readJson(usersFile);
  const found = users.find(u => u.role === (role || '').toUpperCase());
  if (found) {
    currentUser = found;
  } else {
    currentUser.role = role ? role.toUpperCase() : 'INSPECTOR';
  }
  res.json({ success: true, user: currentUser });
});

// ==========================================
// 2. SAMPLES ENDPOINTS
// ==========================================
app.get('/api/samples', (req, res) => {
  const samples = readJson(samplesFile);
  res.json({ success: true, samples });
});

app.get('/api/samples/:id', (req, res) => {
  const samples = readJson(samplesFile);
  const sample = samples.find(s => s.id === req.params.id);
  if (!sample) {
    return res.status(404).json({ success: false, error: 'Sample product not found' });
  }
  res.json({ success: true, sample });
});

// ==========================================
// 3. SCAN & COMPLIANCE PIPELINE
// ==========================================

// Run scan on a pre-loaded test sample
app.post('/api/scan/sample/:sampleId', async (req, res) => {
  try {
    const samples = readJson(samplesFile);
    const sample = samples.find(s => s.id === req.params.sampleId);
    if (!sample) {
      return res.status(404).json({ success: false, error: 'Sample product not found' });
    }

    // Step 1: OCR & Extraction
    const ocrResult = await processImageOCR(null, sample);
    
    // Step 2: NLP Classification
    const extractedFields = classifyExtractedText(ocrResult.blocks, sample.category);
    // Augment with ground truth if sample provides specific values
    if (sample.extractedFields) {
      Object.keys(sample.extractedFields).forEach(k => {
        extractedFields[k] = { ...extractedFields[k], ...sample.extractedFields[k] };
      });
    }

    // Step 3: Legal Metrology Rule Compliance Evaluation
    const evaluation = evaluateCompliance(extractedFields, {
      category: sample.category,
      isPDP: sample.isPDP,
      assumedDpi: 150
    });

    // Step 4: Persist Scan
    const scanId = `SCAN-${Date.now().toString().slice(-6)}`;
    const newScan = {
      id: scanId,
      productId: sample.id,
      productName: sample.name,
      category: sample.category,
      manufacturer: sample.manufacturer,
      isPDP: sample.isPDP,
      imageUrl: sample.image,
      timestamp: new Date().toISOString(),
      inspectorId: currentUser.id,
      inspectorName: currentUser.name,
      overallStatus: evaluation.overallStatus,
      summary: evaluation.summary,
      extractedFields,
      results: evaluation.results
    };

    const scans = readJson(scansFile);
    scans.unshift(newScan);
    writeJson(scansFile, scans);

    res.json({
      success: true,
      scan: newScan
    });
  } catch (err) {
    console.error('Error running sample scan:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Run scan on custom uploaded images
app.post('/api/scan/upload', upload.fields([
  { name: 'pdpImage', maxCount: 1 },
  { name: 'backImage', maxCount: 1 },
  { name: 'otherImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const files = req.files || {};
    const primaryFile = files.pdpImage ? files.pdpImage[0] : (files.backImage ? files.backImage[0] : (files.otherImage ? files.otherImage[0] : null));

    if (!primaryFile) {
      return res.status(400).json({ success: false, error: 'At least one image panel must be uploaded.' });
    }

    const { productName = 'Custom Package', category = 'General', isPDP = 'true' } = req.body;
    const isPDPBool = isPDP === 'true' || isPDP === true;

    // Run OCR
    const ocrResult = await processImageOCR(primaryFile.path);

    // Classify text fragments into Legal Metrology fields
    const extractedFields = classifyExtractedText(ocrResult.blocks, category);

    // Evaluate against Legal Metrology Rules 2011
    const evaluation = evaluateCompliance(extractedFields, {
      category,
      isPDP: isPDPBool,
      assumedDpi: 150
    });

    const scanId = `SCAN-${Date.now().toString().slice(-6)}`;
    const newScan = {
      id: scanId,
      productId: `custom_${Date.now()}`,
      productName: productName || 'Custom Packaged Commodity',
      category: category || 'General',
      manufacturer: extractedFields.manufacturer ? extractedFields.manufacturer.text : 'Pending Identification',
      isPDP: isPDPBool,
      imageUrl: `/uploads/${primaryFile.filename}`,
      timestamp: new Date().toISOString(),
      inspectorId: currentUser.id,
      inspectorName: currentUser.name,
      overallStatus: evaluation.overallStatus,
      summary: evaluation.summary,
      extractedFields,
      results: evaluation.results
    };

    const scans = readJson(scansFile);
    scans.unshift(newScan);
    writeJson(scansFile, scans);

    res.json({
      success: true,
      scan: newScan
    });
  } catch (err) {
    console.error('Error processing upload scan:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. HISTORY & AUDIT ENDPOINTS
// ==========================================
app.get('/api/history', (req, res) => {
  const { search = '', status = '', category = '' } = req.query;
  let scans = readJson(scansFile);

  if (search) {
    const s = search.toLowerCase();
    scans = scans.filter(item => 
      (item.productName && item.productName.toLowerCase().includes(s)) ||
      (item.manufacturer && item.manufacturer.toLowerCase().includes(s)) ||
      (item.id && item.id.toLowerCase().includes(s))
    );
  }

  if (status) {
    scans = scans.filter(item => item.overallStatus === status);
  }

  if (category) {
    scans = scans.filter(item => item.category && item.category.toLowerCase().includes(category.toLowerCase()));
  }

  res.json({ success: true, scans });
});

app.get('/api/history/:id', (req, res) => {
  const scans = readJson(scansFile);
  const scan = scans.find(s => s.id === req.params.id);
  if (!scan) {
    return res.status(404).json({ success: false, error: 'Scan record not found' });
  }
  res.json({ success: true, scan });
});

// Inspector Manual Override & Remarks
app.post('/api/history/:id/override', (req, res) => {
  const { newStatus, reason, remarks } = req.body;
  const scans = readJson(scansFile);
  const index = scans.findIndex(s => s.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Scan record not found' });
  }

  const prevStatus = scans[index].overallStatus;
  scans[index].overallStatus = newStatus || prevStatus;
  scans[index].remarks = remarks || scans[index].remarks || '';
  
  if (newStatus && newStatus !== prevStatus) {
    scans[index].manualOverride = {
      previousStatus: prevStatus,
      newStatus,
      reason: reason || 'Inspector on-ground physical inspection override',
      byUser: currentUser.name,
      byUserId: currentUser.id,
      timestamp: new Date().toISOString()
    };
  }

  writeJson(scansFile, scans);
  res.json({ success: true, scan: scans[index] });
});

// ==========================================
// 5. DASHBOARD & ANALYTICS
// ==========================================
app.get('/api/dashboard/stats', (req, res) => {
  const scans = readJson(scansFile);
  const totalScans = scans.length;
  const compliantCount = scans.filter(s => s.overallStatus === 'COMPLIANT').length;
  const nonCompliantCount = scans.filter(s => s.overallStatus === 'NON_COMPLIANT').length;
  const reviewCount = scans.filter(s => s.overallStatus === 'NEEDS_REVIEW').length;
  const exemptCount = scans.filter(s => s.overallStatus === 'EXEMPT').length;

  const complianceRate = totalScans > 0 ? ((compliantCount / totalScans) * 100).toFixed(1) : '0.0';

  // Count violations by rule
  const violationCounts = {};
  scans.forEach(scan => {
    if (scan.results) {
      scan.results.forEach(r => {
        if (r.verdict === 'FAIL') {
          const key = r.ruleReference || r.ruleId;
          violationCounts[key] = (violationCounts[key] || 0) + 1;
        }
      });
    }
  });

  const topViolations = Object.entries(violationCounts)
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count);

  res.json({
    success: true,
    stats: {
      totalScans,
      compliantCount,
      nonCompliantCount,
      reviewCount,
      exemptCount,
      complianceRate: parseFloat(complianceRate),
      topViolations,
      recentScans: scans.slice(0, 5)
    }
  });
});

// ==========================================
// 6. RULES CONFIGURATION (ADMIN)
// ==========================================
app.get('/api/rules', (req, res) => {
  const rules = readJson(rulesFile);
  res.json({ success: true, rules });
});

app.put('/api/rules/:id', (req, res) => {
  if (currentUser.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Access Denied: Only Admin can modify rule configurations.' });
  }

  const rules = readJson(rulesFile);
  const index = rules.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Rule not found' });
  }

  rules[index] = { ...rules[index], ...req.body };
  writeJson(rulesFile, rules);

  res.json({ success: true, rule: rules[index] });
});

// Standard Pack Sizes under Second Schedule
app.get('/api/standard-packs', (req, res) => {
  const standardPacks = readJson(standardPacksFile);
  res.json({ success: true, standardPacks });
});

app.put('/api/standard-packs/:category', (req, res) => {
  if (currentUser.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Access Denied: Only Admin can modify Second Schedule pack sizes.' });
  }

  const standardPacks = readJson(standardPacksFile);
  const index = standardPacks.findIndex(sp => sp.category.toLowerCase() === req.params.category.toLowerCase());
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Category not found' });
  }

  standardPacks[index] = { ...standardPacks[index], ...req.body };
  writeJson(standardPacksFile, standardPacks);

  res.json({ success: true, standardPack: standardPacks[index] });
});

// ==========================================
// 7. OFFICIAL REPORT EXPORTS (PDF & JSON)
// ==========================================
app.get('/api/reports/:id/pdf', (req, res) => {
  const scans = readJson(scansFile);
  const scan = scans.find(s => s.id === req.params.id);
  if (!scan) {
    return res.status(404).send('Report not found');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Legal_Metrology_Inspection_${scan.id}.pdf"`);
  generateCompliancePDF(scan, res);
});

app.get('/api/reports/:id/json', (req, res) => {
  const scans = readJson(scansFile);
  const scan = scans.find(s => s.id === req.params.id);
  if (!scan) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="Legal_Metrology_${scan.id}.json"`);
  res.json(scan);
});

// SPA Fallback for client routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/samples') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexHtml = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  next();
});

// Start Server
app.listen(PORT, () => {
  console.log(`[Backend] Legal Metrology Compliance Engine running on http://localhost:${PORT}`);
});

