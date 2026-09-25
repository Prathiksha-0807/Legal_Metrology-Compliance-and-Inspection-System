/**
 * Configurable Legal Metrology Rule Compliance Engine
 * Evaluates extracted product declarations against Legal Metrology Rules, 2011
 */

const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, '..', 'data', 'rules.json');
const standardPacksPath = path.join(__dirname, '..', 'data', 'standard_packs.json');

function getRulesConfig() {
  try {
    const raw = fs.readFileSync(rulesPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading rules config, using defaults:', err);
    return [];
  }
}

function getStandardPacks() {
  try {
    const raw = fs.readFileSync(standardPacksPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading standard packs config, using defaults:', err);
    return [];
  }
}

/**
 * Main evaluation entry point
 */
function evaluateCompliance(extractedFields, options = {}) {
  const { category = 'General', isPDP = true, assumedDpi = 150 } = options;
  const rules = getRulesConfig();
  const standardPacks = getStandardPacks();

  const results = [];
  let isSmallPackExempt = false;

  // 1. Check Rule 26 Exemption first
  const rule26 = rules.find(r => r.id === 'RULE_26_EXEMPTION');
  if (rule26 && rule26.enabled) {
    const netQty = extractedFields.netQuantity;
    if (netQty && netQty.value != null && netQty.unit) {
      const unit = netQty.unit.toLowerCase();
      const val = netQty.value;
      if ((unit === 'g' && val <= rule26.parameters.smallPackThresholdG) ||
          (unit === 'ml' && val <= rule26.parameters.smallPackThresholdMl)) {
        isSmallPackExempt = true;
        results.push({
          ruleId: 'RULE_26_EXEMPTION',
          ruleReference: rule26.ruleReference,
          title: rule26.title,
          category: rule26.category,
          verdict: 'EXEMPT',
          field: 'NET_QUANTITY',
          extractedText: netQty.text,
          explanation: `Statutory Exemption Applied: Package net quantity (${val}${unit}) is ≤ 10${unit}. Under Rule 26(a), small packages are exempt from standard sizes and detailed retail price breakdown.`,
          bbox: netQty.bbox
        });
      }
    }
  }

  // 2. Rule 6(1)(a) & Rule 10: Manufacturer / Packer / Importer
  const rule61a = rules.find(r => r.id === 'RULE_6_1_A');
  if (rule61a && rule61a.enabled) {
    const mfr = extractedFields.manufacturer;
    if (!mfr) {
      results.push({
        ruleId: 'RULE_6_1_A',
        ruleReference: rule61a.ruleReference,
        title: rule61a.title,
        category: rule61a.category,
        verdict: 'FAIL',
        field: 'MANUFACTURER',
        extractedText: 'NOT FOUND',
        explanation: 'Mandatory declaration missing: Name and complete address of the manufacturer, packer, or importer was not detected on the label.',
        bbox: null
      });
    } else {
      let passed = true;
      const reasons = [];

      if (rule61a.parameters.requirePinCode && !mfr.pinCode) {
        passed = false;
        reasons.push('Postal PIN code missing from address');
      }
      if (rule61a.parameters.requireAddress && (!mfr.text || mfr.text.length < 20)) {
        passed = false;
        reasons.push('Address appears incomplete or lacks locatable premises details');
      }

      results.push({
        ruleId: 'RULE_6_1_A',
        ruleReference: rule61a.ruleReference,
        title: rule61a.title,
        category: rule61a.category,
        verdict: passed ? 'PASS' : 'FAIL',
        field: 'MANUFACTURER',
        extractedText: mfr.text,
        explanation: passed
          ? `Compliant: Full manufacturer/packer details declared with postal PIN code (${mfr.pinCode || 'detected'}).`
          : `Non-compliant: ${reasons.join(', ')}. Rule 10 Explanation requires full locatable address.`,
        bbox: mfr.bbox
      });
    }
  }

  // 3. Rule 6(1)(b): Generic Commodity Name
  const rule61b = rules.find(r => r.id === 'RULE_6_1_B');
  if (rule61b && rule61b.enabled) {
    const name = extractedFields.commodityName;
    if (!name || !name.text) {
      results.push({
        ruleId: 'RULE_6_1_B',
        ruleReference: rule61b.ruleReference,
        title: rule61b.title,
        category: rule61b.category,
        verdict: 'FAIL',
        field: 'COMMODITY_NAME',
        extractedText: 'NOT FOUND',
        explanation: 'Mandatory declaration missing: Common or generic name of commodity was not found on the Principal Display Panel.',
        bbox: null
      });
    } else {
      results.push({
        ruleId: 'RULE_6_1_B',
        ruleReference: rule61b.ruleReference,
        title: rule61b.title,
        category: rule61b.category,
        verdict: 'PASS',
        field: 'COMMODITY_NAME',
        extractedText: name.text,
        explanation: `Compliant: Commodity clearly identified as "${name.text}".`,
        bbox: name.bbox
      });
    }
  }

  // 4. Rule 12(6): Prohibited Quantity Expressions
  const rule126 = rules.find(r => r.id === 'RULE_12_6_PROHIBITED');
  const netQty = extractedFields.netQuantity;
  if (rule126 && rule126.enabled) {
    if (netQty && netQty.prohibitedWord) {
      results.push({
        ruleId: 'RULE_12_6_PROHIBITED',
        ruleReference: rule126.ruleReference,
        title: rule126.title,
        category: rule126.category,
        verdict: 'FAIL',
        field: 'NET_QUANTITY',
        extractedText: netQty.text,
        explanation: `Violation of Rule 12(6): The net quantity contains prohibited qualifying expression "${netQty.prohibitedWord}". Expressions like "approx", "minimum", "not less than" are strictly illegal on pre-packaged goods.`,
        bbox: netQty.bbox
      });
    } else if (netQty) {
      results.push({
        ruleId: 'RULE_12_6_PROHIBITED',
        ruleReference: rule126.ruleReference,
        title: rule126.title,
        category: rule126.category,
        verdict: 'PASS',
        field: 'NET_QUANTITY',
        extractedText: netQty.text,
        explanation: 'Compliant: No prohibited qualifying words ("approx", "minimum", "about") found in net quantity declaration.',
        bbox: netQty.bbox
      });
    }
  }

  // 5. Rule 6(1)(c) read with Rule 11 & Rule 13: Net Quantity & Standard SI Unit
  const rule61c = rules.find(r => r.id === 'RULE_6_1_C_NET_QTY');
  if (rule61c && rule61c.enabled) {
    if (!netQty || netQty.value == null) {
      results.push({
        ruleId: 'RULE_6_1_C_NET_QTY',
        ruleReference: rule61c.ruleReference,
        title: rule61c.title,
        category: rule61c.category,
        verdict: 'FAIL',
        field: 'NET_QUANTITY',
        extractedText: 'NOT FOUND',
        explanation: 'Mandatory declaration missing: Net quantity statement could not be identified on the package.',
        bbox: null
      });
    } else {
      const val = netQty.value;
      const unit = (netQty.unit || '').trim();
      const lowerUnit = unit.toLowerCase();
      let siVerdict = 'PASS';
      let siExplanation = `Compliant: Declared as ${val} ${unit} using proper SI standard measure.`;

      // Rule 13 Unit validation according to magnitude
      if (lowerUnit === 'ml' && val >= 1000) {
        siVerdict = 'FAIL';
        siExplanation = `Violation of Rule 13(1): For liquid volume of 1000 ml or more, the net volume MUST be declared in liters ("L" or "l"), not in milliliters ("1000 ml" declared).`;
      } else if ((lowerUnit === 'l' || lowerUnit === 'ltr') && val < 1) {
        siVerdict = 'FAIL';
        siExplanation = `Violation of Rule 13(1): Liquid volume under 1 L must be declared in milliliters (e.g. 500 ml, not 0.5 L).`;
      } else if (lowerUnit === 'g' && val >= 1000) {
        siVerdict = 'FAIL';
        siExplanation = `Violation of Rule 13(1): Solid weight of 1000 g or more must be declared in kilograms ("kg"), not grams ("${val} g" declared).`;
      } else if (lowerUnit === 'kg' && val < 1) {
        siVerdict = 'FAIL';
        siExplanation = `Violation of Rule 13(1): Solid weight under 1 kg must be declared in grams ("g"), not fractions of a kilogram ("${val} kg" declared).`;
      } else if (['gms', 'gm', 'kgs', 'ltr', 'ltrs', 'kilos'].includes(lowerUnit)) {
        siVerdict = 'FAIL';
        siExplanation = `Violation of Rule 13(3): Non-standard unit symbol "${unit}" used. Only standard SI symbols "g", "kg", "ml", "l" or "L" are permitted without pluralization or abbreviations.`;
      }

      results.push({
        ruleId: 'RULE_6_1_C_NET_QTY',
        ruleReference: rule61c.ruleReference,
        title: rule61c.title,
        category: rule61c.category,
        verdict: siVerdict,
        field: 'NET_QUANTITY',
        extractedText: netQty.text,
        explanation: siExplanation,
        bbox: netQty.bbox
      });
    }
  }

  // 6. Rule 6(1)(d): Month & Year of Packing / Mfg
  const rule61d = rules.find(r => r.id === 'RULE_6_1_D_DATE');
  if (rule61d && rule61d.enabled) {
    const mfg = extractedFields.mfgDate;
    const dateExempt = (rule61d.parameters.allowedExemptCategories || []).some(item => category.toLowerCase().includes(item));
    if (dateExempt) {
      results.push({
        ruleId: 'RULE_6_1_D_DATE',
        ruleReference: rule61d.ruleReference,
        title: rule61d.title,
        category: rule61d.category,
        verdict: schedCategory ? 'REVIEW' : 'EXEMPT',
        field: 'MFG_DATE',
        extractedText: mfg ? mfg.text : 'Not applicable',
        explanation: `Not applicable for the selected category (${category}) under the configured exemption list.`,
        bbox: mfg ? mfg.bbox : null
      });
    } else if (!mfg) {
      results.push({
        ruleId: 'RULE_6_1_D_DATE',
        ruleReference: rule61d.ruleReference,
        title: rule61d.title,
        category: rule61d.category,
        verdict: 'FAIL',
        field: 'MFG_DATE',
        extractedText: 'NOT FOUND',
        explanation: 'Mandatory declaration missing: Month and year of manufacture or packing was not found.',
        bbox: null
      });
    } else {
      results.push({
        ruleId: 'RULE_6_1_D_DATE',
        ruleReference: rule61d.ruleReference,
        title: rule61d.title,
        category: rule61d.category,
        verdict: 'PASS',
        field: 'MFG_DATE',
        extractedText: mfg.text,
        explanation: `Compliant: Month and year declared as ${mfg.month || ''}/${mfg.year || ''}.`,
        bbox: mfg.bbox
      });
    }
  }

  // 7. Rule 6(1)(e) read with Rule 2(m): MRP Format & Inclusive of All Taxes
  const rule61e = rules.find(r => r.id === 'RULE_6_1_E_MRP');
  if (rule61e && rule61e.enabled) {
    const mrp = extractedFields.mrp;
    if (!mrp) {
      results.push({
        ruleId: 'RULE_6_1_E_MRP',
        ruleReference: rule61e.ruleReference,
        title: rule61e.title,
        category: rule61e.category,
        verdict: 'FAIL',
        field: 'MRP',
        extractedText: 'NOT FOUND',
        explanation: 'Mandatory declaration missing: Maximum Retail Price (MRP) declaration was not found.',
        bbox: null
      });
    } else {
      let mrpVerdict = 'PASS';
      const issues = [];

      if (!mrp.hasTaxes) {
        mrpVerdict = 'FAIL';
        issues.push('Missing statutory wording "(inclusive of all taxes)" or "(incl. of all taxes)" required by Rule 2(m)');
      }
      if (!mrp.currency) {
        mrpVerdict = 'FAIL';
        issues.push('Missing currency symbol ("Rs." or "₹") before the price amount');
      }
      if (mrp.amount == null || mrp.amount <= 0) {
        mrpVerdict = 'FAIL';
        issues.push('Numeric price amount is missing or invalid');
      }

      results.push({
        ruleId: 'RULE_6_1_E_MRP',
        ruleReference: rule61e.ruleReference,
        title: rule61e.title,
        category: rule61e.category,
        verdict: mrpVerdict,
        field: 'MRP',
        extractedText: mrp.text,
        explanation: mrpVerdict === 'PASS'
          ? `Compliant: Valid MRP format with statutory "inclusive of all taxes" declaration and currency symbol (${mrp.currency || '₹'}).`
          : `Non-compliant with Rule 2(m): ${issues.join('; ')}.`,
        bbox: mrp.bbox
      });
    }
  }

  // 8. Rule 6(2): Consumer Care Details
  const rule62 = rules.find(r => r.id === 'RULE_6_2_CONSUMER_CARE');
  if (rule62 && rule62.enabled) {
    const care = extractedFields.consumerCare;
    if (!care) {
      results.push({
        ruleId: 'RULE_6_2_CONSUMER_CARE',
        ruleReference: rule62.ruleReference,
        title: rule62.title,
        category: rule62.category,
        verdict: 'FAIL',
        field: 'CONSUMER_CARE',
        extractedText: 'NOT FOUND',
        explanation: 'Mandatory declaration missing: Consumer care redressal details (name/designation, address, telephone, email) were not found.',
        bbox: null
      });
    } else {
      let passed = true;
      const issues = [];
      if (!care.email) {
        passed = false;
        issues.push('Consumer Care Email address missing');
      }
      if (!care.phone) {
        passed = false;
        issues.push('Consumer Care Helpline/Telephone number missing');
      }

      results.push({
        ruleId: 'RULE_6_2_CONSUMER_CARE',
        ruleReference: rule62.ruleReference,
        title: rule62.title,
        category: rule62.category,
        verdict: passed ? 'PASS' : 'FAIL',
        field: 'CONSUMER_CARE',
        extractedText: care.text,
        explanation: passed
          ? `Compliant: Full consumer care grievance mechanism provided (Helpline: ${care.phone}, Email: ${care.email}).`
          : `Non-compliant: ${issues.join(', ')}. Rule 6(2) mandates both email and phone contact.`,
        bbox: care.bbox
      });
    }
  }

  // 9. Rule 5 & Second Schedule: Standard Pack Size
  const rule5 = rules.find(r => r.id === 'RULE_5_STANDARD_PACK');
  if (rule5 && rule5.enabled && !isSmallPackExempt) {
    const schedCategory = standardPacks.find(sp => 
      category.toLowerCase().includes(sp.category.toLowerCase()) ||
      sp.category.toLowerCase().includes(category.toLowerCase())
    );

    if (schedCategory && netQty && netQty.value != null) {
      const standardSizes = schedCategory.sizes;
      const declaredVal = netQty.value;
      const isStandard = standardSizes.includes(declaredVal);

      if (!isStandard) {
        // Check if package carries non-standard disclaimer
        const rawText = extractedFields.rawText || '';
        const hasDisclaimer = /non[\s\-]standard\s*(?:pack|size)/i.test(rawText);

        results.push({
          ruleId: 'RULE_5_STANDARD_PACK',
          ruleReference: rule5.ruleReference,
          title: rule5.title,
          category: rule5.category,
          verdict: hasDisclaimer ? 'PASS' : 'FAIL',
          field: 'NET_QUANTITY',
          extractedText: `${netQty.text} [Standard sizes for ${schedCategory.category}: ${standardSizes.join(', ')} ${schedCategory.unit}]`,
          explanation: hasDisclaimer
            ? `Compliant: Non-standard size (${declaredVal} ${schedCategory.unit}) is permitted because package carries the mandatory "Non-standard size" disclaimer.`
            : `Violation of Rule 5 & Second Schedule: ${declaredVal} ${schedCategory.unit} is NOT a prescribed standard size for "${schedCategory.category}". Standard sizes are: ${standardSizes.join(', ')} ${schedCategory.unit}. Package lacks required "Non-standard pack" disclaimer.`,
          bbox: netQty.bbox
        });
      } else {
        results.push({
          ruleId: 'RULE_5_STANDARD_PACK',
          ruleReference: rule5.ruleReference,
          title: rule5.title,
          category: rule5.category,
          verdict: 'PASS',
          field: 'NET_QUANTITY',
          extractedText: `${netQty.text} [Matches Second Schedule size for ${schedCategory.category}]`,
          explanation: `Compliant: Declared size ${declaredVal} ${schedCategory.unit} is an approved standard size under Second Schedule.`,
          bbox: netQty.bbox
        });
      }
    } else {
      results.push({
        ruleId: 'RULE_5_STANDARD_PACK',
        ruleReference: rule5.ruleReference,
        title: rule5.title,
        category: rule5.category,
        verdict: 'EXEMPT',
        field: 'NET_QUANTITY',
        extractedText: 'Not applicable',
        explanation: schedCategory
          ? 'Not detected from the uploaded image; standard size compliance cannot be assessed reliably.'
          : `Not applicable because ${category} has no configured Second Schedule mapping in this system.`,
        bbox: null
      });
    }
  }

  // 10. Rule 7: Font Height Verification
  const rule7 = rules.find(r => r.id === 'RULE_7_FONT_HEIGHT');
  if (rule7 && rule7.enabled && netQty && netQty.bbox) {
    const qtyGrams = (netQty.unit && netQty.unit.toLowerCase().includes('k')) ? netQty.value * 1000 : (netQty.value || 100);
    const tableI = rule7.parameters.tableI || [
      { maxQtyG: 50, minHeightMm: 1.0 },
      { maxQtyG: 200, minHeightMm: 2.0 },
      { maxQtyG: 1000, minHeightMm: 4.0 },
      { maxQtyG: 999999, minHeightMm: 6.0 }
    ];

    const bracket = tableI.find(b => qtyGrams <= b.maxQtyG) || tableI[tableI.length - 1];
    const requiredHeightMm = bracket.minHeightMm;
    
    // Pixel height calculation based on DPI: heightInMm = (bbox.h * 25.4) / DPI
    const estHeightMm = parseFloat(((netQty.bbox.h * 25.4) / assumedDpi).toFixed(1));
    const passed = estHeightMm >= requiredHeightMm;

    results.push({
      ruleId: 'RULE_7_FONT_HEIGHT',
      ruleReference: rule7.ruleReference,
      title: rule7.title,
      category: rule7.category,
      verdict: passed ? 'PASS' : 'REVIEW',
      field: 'NET_QUANTITY',
      extractedText: `Numeral bbox height: ${netQty.bbox.h}px (~${estHeightMm} mm @ ${assumedDpi} DPI)`,
      explanation: passed
        ? `Compliant: Estimated numeral height of ~${estHeightMm} mm meets the minimum prescribed threshold of ${requiredHeightMm} mm (Rule 7, Table I).`
        : `Flagged for Officer Gauge Measurement: Estimated numeral height (~${estHeightMm} mm) may be below the required ${requiredHeightMm} mm for ${qtyGrams}g package. Officer physical scale verification recommended.`,
      bbox: netQty.bbox
    });
  } else if (rule7 && rule7.enabled) {
    results.push({
      ruleId: 'RULE_7_FONT_HEIGHT',
      ruleReference: rule7.ruleReference,
      title: rule7.title,
      category: rule7.category,
      verdict: 'REVIEW',
      field: 'NET_QUANTITY',
      extractedText: 'Not detected',
      explanation: 'Unable to verify from the uploaded image because a quantity bounding box was not available.',
      bbox: null
    });
  }

  // 11. Rule 9(4): Language Compliance
  const rule94 = rules.find(r => r.id === 'RULE_9_4_LANGUAGE');
  if (rule94 && rule94.enabled) {
    const raw = extractedFields.rawText || '';
    const hasEnglish = /[a-zA-Z]/.test(raw);
    const hasHindi = /[\u0900-\u097F]/.test(raw);

    results.push({
      ruleId: 'RULE_9_4_LANGUAGE',
      ruleReference: rule94.ruleReference,
      title: rule94.title,
      category: rule94.category,
      verdict: (hasEnglish || hasHindi) ? 'PASS' : 'REVIEW',
      field: 'LANGUAGE',
      extractedText: hasHindi ? 'English & Devanagari (Hindi) detected' : 'English detected',
      explanation: (hasEnglish || hasHindi)
        ? `Compliant with Rule 9(4): Mandatory declarations are rendered in ${hasHindi ? 'Hindi (Devanagari) and English' : 'English'}.`
        : 'Unable to verify from the uploaded image because no readable declaration text was returned by OCR.',
      bbox: null
    });
  }

  // Normalize machine verdicts for the report contract. OCR uncertainty is
  // never treated as a legal violation.
  results.forEach(result => {
    if (result.verdict === 'FAIL' && /^(NOT FOUND|Not detected)$/i.test(result.extractedText || '')) {
      result.verdict = 'NOT_DETECTED';
      result.status = 'NOT_DETECTED';
      result.explanation = 'Not detected from the uploaded image. Improve image quality or verify this declaration manually.';
    } else if (result.verdict === 'PASS') {
      result.status = 'CORRECT';
    } else if (result.verdict === 'FAIL') {
      result.status = 'INCORRECT';
    } else if (result.verdict === 'EXEMPT') {
      result.status = 'NOT_APPLICABLE';
    } else if (result.verdict === 'REVIEW') {
      result.status = 'NOT_DETECTED';
    }
  });

  // Determine overall status
  const hasFail = results.some(r => r.verdict === 'FAIL');
  const hasReview = results.some(r => r.verdict === 'REVIEW' || r.verdict === 'NOT_DETECTED');
  
  let overallStatus = 'COMPLIANT';
  if (isSmallPackExempt && !hasFail) {
    overallStatus = 'EXEMPT';
  } else if (hasFail) {
    overallStatus = 'NON_COMPLIANT';
  } else if (hasReview) {
    overallStatus = 'NEEDS_REVIEW';
  }

  return {
    overallStatus,
    results,
    summary: {
      totalRulesChecked: results.length,
      passed: results.filter(r => r.verdict === 'PASS').length,
      failed: results.filter(r => r.verdict === 'FAIL').length,
      correct: results.filter(r => r.status === 'CORRECT').length,
      incorrect: results.filter(r => r.status === 'INCORRECT').length,
      missing: results.filter(r => r.verdict === 'MISSING').length,
      notDetected: results.filter(r => r.status === 'NOT_DETECTED').length,
      notApplicable: results.filter(r => r.status === 'NOT_APPLICABLE').length,
      review: results.filter(r => r.verdict === 'REVIEW').length,
      exempt: results.filter(r => r.verdict === 'EXEMPT').length
    }
  };
}

module.exports = {
  evaluateCompliance,
  getRulesConfig,
  getStandardPacks
};
