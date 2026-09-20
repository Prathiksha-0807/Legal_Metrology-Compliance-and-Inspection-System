/**
 * NLP & Pattern Classifier for Legal Metrology Declarations
 * Maps OCR text blocks to mandatory fields specified in Rule 6(1) and Rule 6(2)
 */

function classifyExtractedText(ocrBlocks, defaultCategory = 'General') {
  const allText = ocrBlocks.map(b => b.text).join('\n');
  
  const extracted = {
    commodityName: null,
    netQuantity: null,
    mrp: null,
    mfgDate: null,
    manufacturer: null,
    consumerCare: null,
    dimensions: null,
    rawText: allText
  };

  // 1. MRP Extraction (Rule 6(1)(e) & Rule 2(m))
  // Looks for "MRP", "Maximum Retail Price", currency ₹ or Rs., and "inclusive of all taxes"
  const mrpBlock = ocrBlocks.find(b => 
    /\b(m\.?r\.?p\.?|maximum\s+retail\s+price|max\.?\s*retail\s*price)\b/i.test(b.text)
  );

  if (mrpBlock) {
    const text = mrpBlock.text;
    const currencyMatch = text.match(/(₹|rs\.?|inr)/i);
    const amountMatch = text.match(/(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
    const taxMatch = /(inclusive\s+of\s+all\s+taxes|incl\.?\s*(?:of\s*)?all\s*taxes|incl\.?\s*taxes)/i.test(text);

    extracted.mrp = {
      text: text.trim(),
      amount: amountMatch ? parseFloat(amountMatch[1]) : null,
      currency: currencyMatch ? currencyMatch[1] : null,
      hasTaxes: taxMatch,
      bbox: mrpBlock.bbox,
      confidence: mrpBlock.confidence || 0.95
    };
  }

  // 2. Net Quantity Extraction (Rule 6(1)(c), Rule 11, Rule 13, Rule 12(6))
  const netQtyBlock = ocrBlocks.find(b => 
    /\b(net\s*(?:wt\.?|weight|qty\.?|quantity|vol\.?|volume)|contents?)\b/i.test(b.text) ||
    /\b([0-9]+(?:\.[0-9]+)?)\s*(g|kg|gms?|kgs?|ml|l|ltrs?|m|cm|mm|N|U)\b/i.test(b.text)
  );

  if (netQtyBlock) {
    const text = netQtyBlock.text;
    // Check prohibited words first (Rule 12(6))
    const prohibitedMatch = text.match(/\b(approx\.?|approximately|about|minimum|min\.?|average|avg\.?|not\s+less\s+than|when\s+packed|estimated)\b/i);
    
    // Parse quantity and unit
    const qtyMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(g|kg|gms?|kgs?|ml|l|L|ltrs?|m|cm|mm|N|U)\b/i);

    extracted.netQuantity = {
      text: text.trim(),
      value: qtyMatch ? parseFloat(qtyMatch[1]) : null,
      unit: qtyMatch ? qtyMatch[2] : null,
      prohibitedWord: prohibitedMatch ? prohibitedMatch[1] : null,
      bbox: netQtyBlock.bbox,
      confidence: netQtyBlock.confidence || 0.95
    };
  }

  // 3. Month & Year of Packing / Mfg (Rule 6(1)(d))
  const dateBlock = ocrBlocks.find(b => 
    /\b(mfg\.?|pkd\.?|packed|manufactured|month\s*(?:&|and)\s*year|import(?:ed)?|mfd\.?)\b/i.test(b.text) &&
    /\b(0?[1-9]|1[0-2])[\/\-\.\s]+(20[2-9][0-9]|[2-9][0-9])\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\.\-]+(?:20)?[2-9][0-9]\b/i.test(b.text)
  );

  if (dateBlock) {
    const text = dateBlock.text;
    const dateMatch = text.match(/\b(0?[1-9]|1[0-2])[\/\-\.](20[2-9][0-9]|[2-9][0-9])\b/);
    extracted.mfgDate = {
      text: text.trim(),
      month: dateMatch ? dateMatch[1] : null,
      year: dateMatch ? dateMatch[2] : null,
      bbox: dateBlock.bbox,
      confidence: dateBlock.confidence || 0.94
    };
  }

  // 4. Manufacturer / Packer / Importer (Rule 6(1)(a) & Rule 10)
  const mfrBlock = ocrBlocks.find(b => 
    /\b(manufactured\s+by|mfg\.?\s*by|packed\s+by|pkd\.?\s*by|marketed\s+by|mkt\.?\s*by|imported\s+by|mfd\.?\s*by)\b/i.test(b.text)
  );

  if (mfrBlock) {
    const text = mfrBlock.text;
    const pinMatch = text.match(/\b([1-9][0-9]{5})\b/);
    extracted.manufacturer = {
      text: text.trim(),
      pinCode: pinMatch ? pinMatch[1] : null,
      hasAddressDetails: text.length > 25,
      bbox: mfrBlock.bbox,
      confidence: mfrBlock.confidence || 0.93
    };
  }

  // 5. Consumer Care Details (Rule 6(2))
  const careBlock = ocrBlocks.find(b => 
    /\b(consumer\s+care|customer\s+care|helpline|care\s+cell|toll\s*free|feedback|complaint)\b/i.test(b.text) ||
    /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/.test(b.text) ||
    /\b(?:tel|phone|ph|contact|call)[\s\:\-]+[0-9\-\s]{8,15}\b/i.test(b.text)
  );

  if (careBlock) {
    const text = careBlock.text;
    const phoneMatch = text.match(/(?:1800[-\s]?[0-9]{2,3}[-\s]?[0-9]{4,5}|[0-9]{2,4}[-\s]?[0-9]{6,8})/);
    const emailMatch = text.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/);

    extracted.consumerCare = {
      text: text.trim(),
      phone: phoneMatch ? phoneMatch[0] : null,
      email: emailMatch ? emailMatch[0] : null,
      bbox: careBlock.bbox,
      confidence: careBlock.confidence || 0.92
    };
  }

  // 6. Common / Generic Commodity Name (Rule 6(1)(b))
  const nameBlock = ocrBlocks.find(b => 
    b !== mrpBlock && b !== netQtyBlock && b !== dateBlock && b !== mfrBlock && b !== careBlock &&
    b.bbox && b.bbox.y < 200 && b.text.trim().length > 3
  );

  if (nameBlock) {
    extracted.commodityName = {
      text: nameBlock.text.trim(),
      bbox: nameBlock.bbox,
      confidence: nameBlock.confidence || 0.90
    };
  }

  // 7. Dimensions (Rule 6(1)(f) / Rule 14)
  const dimBlock = ocrBlocks.find(b => 
    /\b([0-9]+(?:\.[0-9]+)?)\s*(?:cm|mm|m)\s*[xX*×]\s*([0-9]+(?:\.[0-9]+)?)\s*(?:cm|mm|m)\b/i.test(b.text)
  );

  if (dimBlock) {
    extracted.dimensions = {
      text: dimBlock.text.trim(),
      bbox: dimBlock.bbox,
      confidence: dimBlock.confidence || 0.90
    };
  }

  return extracted;
}

module.exports = {
  classifyExtractedText
};
