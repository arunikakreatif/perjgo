/**
 * perjadinGO - Backend Google Apps Script
 * Copy this code into your Google Apps Script project (Code.gs)
 */

const SPREADSHEEET_ID = "1DFUAr4cYppP9nxaB2pgP8n5Oug-O1pvEdrhptlGqwJA";
const SS = SpreadsheetApp.openById(SPREADSHEEET_ID);

/**
 * INITIALIZATION: Run this function once to setup the structure
 * and to AUTHORIZE the script to access Drive and Docs.
 */
function initApp() {
  // PAKSA PROMPT OTORISASI - Harap jalankan fungsi ini manual di GAS Editor
  // Segera hapus file setelah dibuat agar tidak mengotori Drive
  try {
    const dummyFile = DriveApp.createFile('AUTH_DUMMY', 'delete me');
    const copy = dummyFile.makeCopy('AUTH_DUMMY_COPY');
    dummyFile.setTrashed(true);
    copy.setTrashed(true);
    
    const doc = DocumentApp.create('AUTH_DUMMY_DOC');
    DriveApp.getFileById(doc.getId()).setTrashed(true);
  } catch (e) {
    console.log("Auth check skipped: " + e.message);
  }
  
  createSheetIfNotExists("Pegawai", ["id", "name", "nik", "niap", "position", "pangkat", "golongan", "address"]);
  
  // SPPD Migration/Setup
  const sppdHeaders = ["id", "number", "purpose", "destination", "dateStart", "dateEnd", "transport", "budgetCode", "basis", "peopleCount", "employeeId1", "employeeId2", "employeeId3", "employeeId4", "employeeId5", "laporan1", "laporan2", "laporan3", "caption", "fotoUrl", "fotoId", "uangHarian", "uangBBM", "tglBayar"];
  let sppdSheet = SS.getSheetByName("SPPD");
  if (!sppdSheet) {
    createSheetIfNotExists("SPPD", sppdHeaders);
  } else {
    // Sync headers and data
    const currentHeaders = sppdSheet.getRange(1, 1, 1, sppdSheet.getLastColumn()).getValues()[0];
    
    // Check if "basis" is missing
    if (currentHeaders.indexOf("basis") === -1) {
      const budgetCodeIdx = currentHeaders.indexOf("budgetCode");
      if (budgetCodeIdx !== -1) {
        // Insert "basis" column after "budgetCode"
        sppdSheet.insertColumnAfter(budgetCodeIdx + 1);
        sppdSheet.getRange(1, budgetCodeIdx + 2).setValue("basis");
      } else {
        // Just append to end
        sppdSheet.getRange(1, sppdSheet.getLastColumn() + 1).setValue("basis");
      }
      
      // Fix potential misaligned data after insertion
      fixDataAlignment();
    }

    // New report and SPJ headers migration
    const additionalFields = ["laporan1", "laporan2", "laporan3", "caption", "fotoUrl", "fotoId", "uangHarian", "uangBBM", "tglBayar"];
    let lastColumn = sppdSheet.getLastColumn();
    let currentUpdatedHeaders = sppdSheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    
    additionalFields.forEach(field => {
      if (currentUpdatedHeaders.indexOf(field) === -1) {
        sppdSheet.insertColumnAfter(lastColumn);
        sppdSheet.getRange(1, lastColumn + 1).setValue(field);
        lastColumn++;
      }
    });
  }

  createSheetIfNotExists("Config_Templates", ["type", "count", "templateId"]);
  createSheetIfNotExists("Arsip_Dokumen", ["id_arsip", "sppd_number", "tipe_dokumen", "file_name", "date_generated", "file_url"]);
  createSheetIfNotExists("Konfigurasi", ["Parameter", "Nilai"]);
  
  // Set default templates if empty
  const templateSheet = SS.getSheetByName("Config_Templates");
  if (templateSheet.getLastRow() === 1) {
    const types = ["SPD", "Laporan", "SPJ"];
    const rows = [];
    types.forEach(type => {
      for (let i = 1; i <= 5; i++) {
        rows.push([type, i, ""]); 
      }
    });
    templateSheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }
  
  // Set default config if empty
  const configSheet = SS.getSheetByName("Konfigurasi");
  if (configSheet.getLastRow() === 1) {
    const defaultData = [
      ["nama_desa", "Desa Poncol"],
      ["kecamatan", "Kecamatan Poncol"],
      ["kabupaten", "Kabupaten Magetan"],
      ["tahun_anggaran", "2026"],
      ["kode_anggaran", "01.02.03"],
      ["kepala_desa", "H. SUDIRMAN"],
      ["sekretaris_desa", "Andi Setiawan, S.Kom"],
      ["bendahara", "Siti Aminah"],
      ["alamat_kantor", "Jl. Raya Poncol No. 1, Magetan"],
      ["email", "desa.poncol@magetan.go.id"],
      ["web", "www.desaponcol.id"],
      ["kodepos", "63362"],
      ["folder_pdf_id", ""]
    ];
    configSheet.getRange(2, 1, defaultData.length, 2).setValues(defaultData);
    
    // Also sync to script properties for performance
    const props = {};
    defaultData.forEach(r => props[r[0]] = r[1]);
    PropertiesService.getScriptProperties().setProperties(props);
  }

  return "Infrastruktur Berhasil Diinisialisasi!";
}

/**
 * CONFIGURATION & TEMPLATES
 */
function getConfig() {
  const configSheet = SS.getSheetByName("Konfigurasi");
  if (!configSheet) return {};
  const configData = configSheet.getDataRange().getValues();
  configData.shift();
  
  const props = {};
  configData.forEach(row => {
    if (row[0]) {
      const rawKey = String(row[0]).trim();
      const sanitizedKey = rawKey.toLowerCase().replace(/\s+/g, '_');
      props[sanitizedKey] = row[1];
      props[rawKey] = row[1];
    }
  });

  // Fetch templates
  const sheet = SS.getSheetByName("Config_Templates");
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    data.shift();
    const templates = data.map(row => ({
      type: row[0],
      count: row[1],
      templateId: row[2]
    }));
    props.templates = templates;
  }
  
  return props;
}

function updateConfig(data) {
  const { templates, ...properties } = data;
  
  // Update sheet Konfigurasi
  const configSheet = SS.getSheetByName("Konfigurasi");
  const rows = Object.keys(properties).map(key => [key, properties[key]]);
  configSheet.getRange(2, 1, configSheet.getLastRow() > 1 ? configSheet.getLastRow() - 1 : 1, 2).clearContent();
  configSheet.getRange(2, 1, rows.length, 2).setValues(rows);

  // Update Script Properties for fast access in other functions
  PropertiesService.getScriptProperties().setProperties(properties);
  
  // Update Templates sheet
  if (templates) {
    const sheet = SS.getSheetByName("Config_Templates");
    const tRows = templates.map(t => [t.type, t.count, t.templateId]);
    sheet.getRange(2, 1, tRows.length, 3).setValues(tRows);
  }
  
  return { status: "success" };
}

/**
 * SPPD (TRAVEL ORDERS)
 */
function getSPDList() {
  try {
    const sheet = SS.getSheetByName("SPPD");
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    const headers = data.shift();
    
    // Get all employees for name mapping
    const employees = getPegawai();
    const empMap = {};
    employees.forEach(e => {
       if (e.id) empMap[e.id] = e.name;
    });

    return data.map(row => {
      let obj = {};
      headers.forEach((header, i) => {
        if (header) obj[header] = row[i];
      });
      
      // Map employee names for display
      const names = [];
      const ids = [];
      for (let i = 1; i <= 5; i++) {
        const id = obj[`employeeId${i}`];
        if (id) names.push(empMap[id] || "Unknown");
        ids.push(id || "");
      }
      obj.employeeNames = names;
      obj.employeeIds = ids;
      return obj;
    });
  } catch (e) {
    console.error("Error getSPDList: " + e.message);
    return [];
  }
}

function getNextSPPDNumber() {
  const sheet = SS.getSheetByName("SPPD");
  const data = sheet.getDataRange().getValues();
  data.shift(); // Remove headers
  
  let maxNum = 0;
  data.forEach(row => {
    const numPart = String(row[1]).split('/')[0];
    const n = parseInt(numPart);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  });
  
  const nextNum = maxNum + 1;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const romanMonth = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][month];
  
  return `${String(nextNum).padStart(3, '0')}/SPPD/${romanMonth}/${year}`;
}

function saveSPD(input) {
  try {
    const sheet = SS.getSheetByName("SPPD");
    if (!sheet) throw new Error("Sheet SPPD tidak ditemukan. Silakan run 'initApp' terlebih dahulu.");
    
    const lastCol = sheet.getLastColumn();
    if (lastCol === 0) throw new Error("Sheet SPPD kosong atau tidak memiliki header.");
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const id = input.id || Utilities.getUuid();
    
    // Auto-generate number if it's a new entry and no number provided
    let sppdNumber = input.number;
    if (!input.id && (!sppdNumber || sppdNumber === "")) {
      sppdNumber = getNextSPPDNumber();
    }

    // Map data to row based on headers
    const rowData = new Array(headers.length).fill("");
    
    // Core fields
    const mapping = {
      "id": id,
      "number": sppdNumber,
      "purpose": input.purpose || "",
      "destination": input.destination || "",
      "dateStart": input.dateStart || "",
      "dateEnd": input.dateEnd || "",
      "transport": input.transport || "",
      "budgetCode": input.budgetCode || "",
      "basis": input.basis || "",
      "peopleCount": input.peopleCount || 1,
      "laporan1": input.laporan1 || "",
      "laporan2": input.laporan2 || "",
      "laporan3": input.laporan3 || "",
      "caption": input.caption || "",
      "fotoUrl": input.fotoUrl || "",
      "fotoId": input.fotoId || "",
      "uangHarian": input.uangHarian || 0,
      "uangBBM": input.uangBBM || 0,
      "tglBayar": input.tglBayar || ""
    };

    // Employee IDs mapping
    const empIds = input.employeeIds || [];
    for (let i = 0; i < 5; i++) {
      mapping[`employeeId${i+1}`] = empIds[i] || "";
    }

    // Fill rowData based on header order
    headers.forEach((header, i) => {
      if (mapping.hasOwnProperty(header)) {
        rowData[i] = mapping[header];
      }
    });

    if (input.id) {
      const values = sheet.getDataRange().getValues();
      let found = false;
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] == id) {
          sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
          found = true;
          break;
        }
      }
      if (!found) sheet.appendRow(rowData);
    } else {
      sheet.appendRow(rowData);
    }
    return { status: "success", id: id };
  } catch (e) {
    throw new Error("Gagal Simpan ke Spreadsheet: " + e.message);
  }
}

/**
 * DOCUMENT GENERATION
 */
function generateDocument(sppdId, docType, extraData) {
  SpreadsheetApp.flush();
  const sppdList = getSPDList();
  const sppd = sppdList.find(s => s.id == sppdId);
  if (!sppd) throw new Error("SPPD tidak ditemukan");
  
  const config = getConfig();
  
  // Extra data support from frontend (overrides sppd data)
  if (extraData && typeof extraData === 'object') {
     for (let key in extraData) {
       if (extraData[key] !== undefined && extraData[key] !== null) {
         sppd[key] = extraData[key];
       }
     }
  }

  // Ensure we have a valid peopleCount for template matching
  let pCount = "1";
  if (sppd.peopleCount) {
    const pc = parseInt(String(sppd.peopleCount));
    if (!isNaN(pc)) pCount = String(pc);
  }

  const templates = config.templates || [];
  const template = templates.find(t => t.type === docType && String(t.count) === pCount);
  
  if (!template || !template.templateId || String(template.templateId).trim() === "") {
    throw new Error(`Template ${docType} untuk ${pCount} orang belum diatur.`);
  }
  
  const templateId = template.templateId;
  let templateDoc;
  try {
    templateDoc = DriveApp.getFileById(templateId);
  } catch (e) {
    throw new Error(`Gagal membuka Template ID: ${templateId}. Pastikan ID benar dan script memiliki izin Drive.`);
  }
  
  const timestamp = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
  const fileName = `${docType}_${String(sppd.number || '').replace(/\//g, '_')}_${pCount}org`;
  
  // Folder PDF
  let pdfFolder;
  const pdfFolderId = config.folder_pdf_id;
  if (pdfFolderId) {
    try {
      pdfFolder = DriveApp.getFolderById(pdfFolderId);
    } catch(e) {
      pdfFolder = DriveApp.getRootFolder();
    }
  } else {
    // Cari atau buat folder "Arsip_PDF_SPPD"
    const folders = DriveApp.getFoldersByName("Arsip_PDF_SPPD");
    if (folders.hasNext()) {
      pdfFolder = folders.next();
    } else {
      pdfFolder = DriveApp.createFolder("Arsip_PDF_SPPD");
    }
    // Update config folder id
    updateConfigValue("folder_pdf_id", pdfFolder.getId());
  }

  // Salin template ke file baru (Temporary Google Doc)
  const newFile = templateDoc.makeCopy(fileName + "_TEMP");
  const newDocId = newFile.getId();
  const doc = DocumentApp.openById(newDocId);
  const body = doc.getBody();
  
  // Helper to fetch value with priority
  const getV = (key, fallback = "") => {
    if (sppd[key] !== undefined && sppd[key] !== null && String(sppd[key]).trim() !== "") return sppd[key];
    const sanitizedKey = key.toLowerCase().replace(/\s+/g, '_');
    if (config[sanitizedKey] !== undefined && config[sanitizedKey] !== null && String(config[sanitizedKey]).trim() !== "") return config[sanitizedKey];
    if (config[key] !== undefined && config[key] !== null && String(config[key]).trim() !== "") return config[key];
    return fallback;
  };

  const replacements = {
    "{{NOMOR_SPPD}}": sppd.number || "",
    "{{DASAR_SPPD}}": sppd.basis || "-",
    "{{MAKSUD_PERJALANAN}}": sppd.purpose || "",
    "{{TEMPAT_TUJUAN}}": sppd.destination || "",
    "{{LAMA_HARI}}": calculateDays(sppd.dateStart, sppd.dateEnd),
    "{{TANGGAL_BERANGKAT}}": formatDateIndo(sppd.dateStart),
    "{{TANGGAL_KEMBALI}}": formatDateIndo(sppd.dateEnd),
    "{{ALAT_ANGKUT}}": sppd.transport || "",
    "{{MATA_ANGGARAN}}": getV("kode_anggaran"),
    "{{NAMA_KADES}}": getV("kepala_desa"),
    "{{ALAMAT_KANTOR}}": getV("alamat_kantor"),
    "{{EMAIL_KANTOR}}": getV("email"),
    "{{WEB_KANTOR}}": getV("web"),
    "{{KODEPOS_KANTOR}}": getV("kodepos"),
    "{{NAMA_DESA}}": getV("nama_desa"),
    "{{KECAMATAN}}": getV("kecamatan"),
    "{{KABUPATEN}}": getV("kabupaten"),
    "{{DESA}}": (getV("nama_desa") || "").replace(/Desa\s+/i, "").toUpperCase(),
    "{{KEC}}": (getV("kecamatan") || "").replace(/Kecamatan\s+/i, "").toUpperCase(),
    "{{KAB}}": (getV("kabupaten") || "").replace(/Kabupaten\s+/i, "").replace(/Kota\s+/i, "").toUpperCase(),
    "{{KADES}}": getV("kepala_desa"),
    "{{TANGGAL_SEKARANG}}": formatDateIndo(new Date().toISOString()),
    "{{TEMPAT_TANGGAL}}": `${getV("nama_desa")}, ${formatDateIndo(new Date().toISOString())}`,
    "{{CAPTION}}": sppd.caption || "", "{{Caption}}": sppd.caption || "",
    "{{KETERANGAN_FOTO}}": sppd.caption || "",
    "{{UANG_HARIAN}}": formatRupiah(sppd.uangHarian), "{{UANG_BBM}}": formatRupiah(sppd.uangBBM),
    "{{JUMLAH}}": formatRupiah(Number(sppd.uangHarian || 0) + Number(sppd.uangBBM || 0)),
    "{{BIAYA}}": formatRupiah(Number(sppd.uangHarian || 0) + Number(sppd.uangBBM || 0)),
    "{{TGL_BAYAR}}": formatDateIndo(sppd.tglBayar),
    "{{BENDAHARA}}": getV("bendahara"), "{{SEKDES}}": getV("sekretaris_desa")
  };

  // Robust Report Mappings
  ["laporan1", "laporan2", "laporan3"].forEach((f, i) => {
    const val = sppd[f] || "";
    const n = i + 1;
    replacements[`{{LAPORAN_${n}}}`] = val;
    replacements[`{{LAPORAN${n}}}`] = val;
    replacements[`{{laporan_${n}}}`] = val;
    replacements[`{{laporan${n}}}`] = val;
    replacements[`{{HASIL_${n}}}`] = val;
    replacements[`{{HASIL${n}}}`] = val;
    replacements[`{{hasil_${n}}}`] = val;
    replacements[`{{hasil${n}}}`] = val;
  });

  // Add all SPPD fields as placeholders automatically
  Object.keys(sppd).forEach(k => {
    if (!replacements[`{{${k.toUpperCase()}}}`]) replacements[`{{${k.toUpperCase()}}}`] = sppd[k] || "";
    if (!replacements[`{{${k}}}`]) replacements[`{{${k}}}`] = sppd[k] || "";
  });

  // Personnel data
  const employees = getPegawai();
  const empMap = {};
  employees.forEach(e => { if (e.id) empMap[e.id] = e; });
  for (let i = 1; i <= 5; i++) {
    const emp = sppd[`employeeId${i}`] ? empMap[sppd[`employeeId${i}`]] : null;
    replacements[`{{NAMA${i}}}`] = emp ? String(emp.name || "") : "";
    replacements[`{{NIK${i}}}`] = emp ? String(emp.nik || "") : "";
    replacements[`{{JABATAN${i}}}`] = emp ? String(emp.position || "") : "";
    replacements[`{{ALAMAT${i}}}`] = emp ? String(emp.address || "") : "";
  }

  const PHOTO_PLACEHOLDERS = ["{{FOTO_UPLOAD}}", "{{FOTO}}", "{{GAMBAR}}", "{{DOKUMENTASI}}", "{{FOTO_1}}", "{{FOTO_2}}", "{{GAMBAR_1}}", "{{GAMBAR_2}}"];

  const replaceTextInElement = (element) => {
    if (!element) return;
    
    // 1. Aggressive Cleanup of annoying hint/placeholder strings
    const cleanupTexts = [
      "\\(Foto belum diunggah\\)",
      "\\(Gagal memuat foto\\)",
      "Foto belum diunggah",
      "Gagal memuat foto"
    ];
    cleanupTexts.forEach(text => {
      try { element.replaceText(text, ""); } catch(e) {}
    });

    // 2. Pre-process replacements to have a normalized map (UPPERCASE, NO UNDERSCORE, NO SPACE)
    const normalizedMap = {};
    Object.keys(replacements).forEach(k => {
      // Normalize current key: {{LAPORAN_1}} -> LAPORAN1
      const normalizedKey = k.replace(/[{}_ ]/g, '').trim().toUpperCase();
      if (normalizedKey) normalizedMap[normalizedKey] = replacements[k];
    });

    // 3. One-pass search for all double-brace content
    const bodyText = element.getText();
    const regex = /\{\{\s*([^{}]+)\s*\}\}/g;
    let match;
    const itemsFound = [];
    while ((match = regex.exec(bodyText)) !== null) {
      itemsFound.push({ full: match[0], inner: match[1] });
    }

    // Process found items using normalized matching
    itemsFound.forEach(item => {
      const docKey = item.inner.replace(/[_ ]/g, '').trim().toUpperCase();
      if (normalizedMap[docKey] !== undefined) {
        const val = String(normalizedMap[docKey] || "");
        // Use literal replacement for the exact 'full' string found
        try {
          element.replaceText(item.full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), val);
        } catch(e) {
          // Fallback if replaceText fails on some characters
          console.error("Replace failed for " + item.full);
        }
      }
    });

    // 4. Final safety pass for common variations that might have been missed by normalized regex
    Object.keys(replacements).forEach(k => {
       try { element.replaceText(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), String(replacements[k] || "")); } catch(e) {}
    });

    // 5. Final Expert cleanup: Remove any remaining double-brace placeholders that weren't replaced
    try {
      element.replaceText("\\{\\{[^\\}]+\\}\\}", "");
    } catch(e) {}
  };

  const replacePhotosInElement = (element, blob) => {
    if (!element) return;
    
    // Check for both direct placeholders and common variations
    const allPhotoPatterns = [...PHOTO_PLACEHOLDERS];
    PHOTO_PLACEHOLDERS.forEach(p => {
       const inner = p.slice(2, -2);
       allPhotoPatterns.push(`{{ ${inner} }}`);
       allPhotoPatterns.push(`{{${inner.toLowerCase()}}}`);
       allPhotoPatterns.push(`{{ ${inner.toLowerCase()} }}`);
       allPhotoPatterns.push(`{{${inner.replace(/_/g, '')}}}`);
    });

    if (!blob) {
      allPhotoPatterns.forEach(p => {
        try { element.replaceText(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ""); } catch(e) {}
      });
      // Also clear any photo-related hint text if it was in the Doc
      const hintPatterns = ["\\(FOTO\\)", "\\(GAMBAR\\)", "\\(DOCUMENTATION\\)", "\\(DOKUMENTASI\\)"];
      hintPatterns.forEach(hp => {
        try { element.replaceText(hp, ""); } catch(e) {}
      });
      return;
    }

    allPhotoPatterns.forEach(p => {
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let search = element.findText(escaped);
      while (search) {
        const textElem = search.getElement().asText();
        const container = textElem.getParent();
        try {
          if (container.getType() === DocumentApp.ElementType.PARAGRAPH) {
             const para = container.asParagraph();
             para.setSpacingBefore(0);
             para.setSpacingAfter(0);
             para.setLineSpacing(1);
             para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
             
             // Use InlineImage for easier centering with paragraph alignment
             const img = para.appendInlineImage(blob);
             
             const maxW = 450; 
             const maxH = 250; 
             let w = img.getWidth(); 
             let h = img.getHeight();
             if (w > maxW) { h *= (maxW/w); w = maxW; }
             if (h > maxH) { w *= (maxH/h); h = maxH; }
             
             img.setWidth(w).setHeight(h);
          } else {
             // Try putting it as inline if not in paragraph (e.g. Table Cell)
             const index = container.getChildIndex ? container.getChildIndex(textElem) : 0;
             if (container.insertInlineImage) {
                const img = container.insertInlineImage(index, blob);
                const maxW = 450; 
                const maxH = 175; 
                let w = img.getWidth(); let h = img.getHeight();
                if (w > maxW) { h *= (maxW/w); w = maxW; }
                if (h > maxH) { w *= (maxH/h); h = maxH; }
                img.setWidth(w).setHeight(h);
                
                if (container.setAlignment) {
                   container.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
                }
             }
          }
        } catch (e) { 
          console.error("Img error: " + e.message); 
        }
        textElem.deleteText(search.getStartOffset(), search.getEndOffsetInclusive());
        search = element.findText(escaped);
      }
    });
  };

  let imageBlob = null;
  if (sppd.fotoId || (sppd.fotoUrl && sppd.fotoUrl.length > 5)) {
    try {
      if (sppd.fotoId) {
        imageBlob = DriveApp.getFileById(sppd.fotoId).getBlob();
      } else if (sppd.fotoUrl.startsWith('data:image')) {
        // Handle Base64 from memory
        const base64Data = sppd.fotoUrl.split(',')[1];
        imageBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/jpeg', 'upload.jpg');
      } else {
        imageBlob = UrlFetchApp.fetch(sppd.fotoUrl).getBlob();
      }
    } catch (err) { console.error("Photo error: " + err.message); }
  }

  [body, doc.getHeader(), doc.getFooter()].forEach(s => {
    if (s) {
      replacePhotosInElement(s, imageBlob);
      replaceTextInElement(s);
    }
  });

  doc.saveAndClose();
  
  // EKSPOR KE PDF
  const pdfBlob = newFile.getAs('application/pdf').setName(fileName + ".pdf");
  const pdfFile = pdfFolder.createFile(pdfBlob);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Hapus temporary Doc
  newFile.setTrashed(true);

  const fileUrl = pdfFile.getUrl();

  // CATAT KE SHEET ARSIP
  const arsipSheet = SS.getSheetByName("Arsip_Dokumen");
  arsipSheet.appendRow([
    Utilities.getUuid(),
    sppd.number,
    docType,
    fileName + ".pdf",
    timestamp,
    fileUrl
  ]);

  return fileUrl;
}

function updateConfigValue(key, value) {
  const sheet = SS.getSheetByName("Konfigurasi");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function fixDataAlignment() {
  const sheet = SS.getSheetByName("SPPD");
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;
  const headers = data[0];
  
  // Periksa apakah peopleCount berisi angka (jika status masih ada, peopleCount akan bergeser)
  const pCountIdx = headers.indexOf("peopleCount");
  
  if (pCountIdx === -1) return; 
  
  const rowsToUpdate = [];
  let changed = false;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Jika data peopleCount terbaca sebagai string "Pending"/"Approved", berarti kolom status masih ada di data
    if (row[pCountIdx] === "Pending" || row[pCountIdx] === "Approved") {
      changed = true;
      const newRow = [...row];
      
      // Ambil data lama 
      const oldStatus = row[9]; // Status sebelumnya di index 9
      const oldPCount = row[10]; // peopleCount sebelumnya di index 10
      const oldEmpIds = row.slice(11, 16); // employees sebelumnya mulai index 11
      
      // Atur ke posisi kolom baru (Tanpa status)
      newRow[8] = row[8] || "-"; // basis tetap di 8 
      newRow[9] = oldPCount; // peopleCount geser ke 9
      for (let j = 0; j < 5; j++) {
        newRow[10+j] = oldEmpIds[j] || "";
      }
      // Hapus kolom terakhir yang sisa jika ada
      newRow.splice(15);
      
      rowsToUpdate.push({rowIndex: i + 1, values: newRow});
    }
  }
  
  if (changed) {
    rowsToUpdate.forEach(update => {
      sheet.getRange(update.rowIndex, 1, 1, update.values.length).setValues([update.values]);
    });
  }
}

function uploadFile(base64Data, fileName) {
  try {
    const contentType = base64Data.substring(base64Data.indexOf(":") + 1, base64Data.indexOf(";"));
    const bytes = Utilities.base64Decode(base64Data.split(",")[1]);
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    
    // Simpan ke folder yang sama dengan PDF atau folder "Dokumentasi_SPPD"
    let folder;
    const folders = DriveApp.getFoldersByName("Dokumentasi_SPPD");
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder("Dokumentasi_SPPD");
    }
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Dapatkan Direct Link untuk insert ke Doc (Thumbnail link / Export link kurang stabil)
    // Kita gunakan link view, tapi UrlFetchApp biasanya butuh direct link jika bukan dari DriveApp internal
    // Namun untuk insertInlineImage dari blob, ini sudah benar.
    return { url: file.getDownloadUrl(), id: file.getId() };
  } catch (e) {
    throw new Error("Gagal upload file: " + e.message);
  }
}

function calculateDays(start, end) {
  if (!start || !end) return "0";
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = Math.abs(e - s);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return String(diffDays);
}

function formatDateIndo(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatRupiah(amount) {
  if (!amount || isNaN(amount)) return "0";
  var parts = amount.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts.join(",");
}

/**
 * DASHBOARD
 */
function getDashboardStats() {
  const pegawai = SS.getSheetByName("Pegawai").getLastRow() - 1;
  const sppd = SS.getSheetByName("SPPD").getLastRow() - 1;
  
  return {
    pegawai: pegawai > 0 ? pegawai : 0,
    sppd: sppd > 0 ? sppd : 0,
    laporan: Math.floor(sppd * 0.8),
    spj: Math.floor(sppd * 0.7),
    chart: [65, 40, 85, 30, 55, 70]
  };
}

/**
 * PEGAWAI (EMPLOYEES)
 */
function getPegawai() {
  try {
    const sheet = SS.getSheetByName("Pegawai");
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    const headers = data.shift();
    return data.map(row => {
      let obj = {};
      headers.forEach((header, i) => {
        if (header) obj[header] = row[i];
      });
      return obj;
    });
  } catch (e) {
    console.error("Error getPegawai: " + e.message);
    return [];
  }
}

function tambahPegawai(data) {
  const sheet = SS.getSheetByName("Pegawai");
  const id = Utilities.getUuid();
  sheet.appendRow([
    id, 
    data.name || "", 
    data.nik || "", 
    data.niap || "", 
    data.position || "", 
    data.pangkat || "", 
    data.golongan || "", 
    data.address || ""
  ]);
  return { status: "success", id: id };
}

function hapusPegawai(id) {
  const sheet = SS.getSheetByName("Pegawai");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { status: "success" };
    }
  }
}

function editPegawai(id, data) {
  const sheet = SS.getSheetByName("Pegawai");
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] == id) {
      sheet.getRange(i + 1, 1, 1, 8).setValues([[
        id, 
        data.name || "", 
        data.nik || "", 
        data.niap || "", 
        data.position || "", 
        data.pangkat || "", 
        data.golongan || "", 
        data.address || ""
      ]]);
      return { status: "success" };
    }
  }
  return { status: "error", message: "Pegawai not found" };
}

/**
 * UTILS
 */
function createSheetIfNotExists(name, headers) {
  let sheet = SS.getSheetByName(name);
  if (!sheet) {
    sheet = SS.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
  }
}

function getArsip() {
  try {
    const sheet = SS.getSheetByName("Arsip_Dokumen");
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    const headers = data.shift();
    return data.map(row => {
      let obj = {};
      headers.forEach((header, i) => {
        if (header) obj[header] = row[i];
      });
      return obj;
    });
  } catch (e) {
    console.error("Error getArsip: " + e.message);
    return [];
  }
}

/**
 * WEB APP ENTRY POINT
 */
function doGet(e) {
  // Masukkan log ke sheet 'Log' untuk debugging jika ada request masuk
  try {
    const logSheet = createSheetIfNotExists("Log", ["Waktu", "Aksi", "Data"]);
    logSheet.appendRow([new Date(), e.parameter.action || "No Action", JSON.stringify(e.parameter)]);
  } catch(err) {}

  if (e && e.parameter && e.parameter.action) {
    const action = e.parameter.action;
    let args = [];
    try {
      args = e.parameter.args ? JSON.parse(e.parameter.args) : [];
    } catch(err) {
      // Fallback jika args dikirim sebagai string individu
      args = [e.parameter.args];
    }
    
    try {
      // Dispatcher to call functions safely
      var result;
      if (typeof action === 'string' && typeof this[action] === 'function') {
        result = this[action].apply(this, args);
      } else {
        throw new Error("Fungsi '" + action + "' tidak ditemukan di script.");
      }
      
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.message, status: "error" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('perjadinGO')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  // Post tetap dipertahankan untuk kompatibilitas jika dijalankan di dalam GAS
  let postData;
  try {
    postData = JSON.parse(e.postData.contents);
  } catch (err) {
    postData = e.parameter;
  }
  
  const action = postData.action;
  const args = postData.arguments || [];
  
  try {
    var result;
    if (typeof action === 'string' && typeof this[action] === 'function') {
      result = this[action].apply(this, args);
    } else {
      throw new Error("Fungsi '" + action + "' tidak ditemukan di script.");
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message, status: "error" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
