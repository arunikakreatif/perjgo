/**
 * perjadinGO - Backend Google Apps Script (Multi-Tenant Version)
 * 
 * PENTING: Jika muncul "Akses Ditolak: DriveApp", Anda HARUS menjalankan 
 * fungsi 'initApp' secara manual di Editor Script (klik Run/Jalankan) 
 * untuk memberikan izin akses ke Drive/Docs.
 * 
 * Scope Hint (Agar Otorisasi Terdeteksi):
 * DriveApp.getRootFolder();
 * DocumentApp.create("temp");
 * SpreadsheetApp.getActiveSpreadsheet();
 * 
 * --- REKOMENDASI: Isi file appsscript.json Anda dengan ini ---
 * {
 *   "timeZone": "Asia/Jakarta",
 *   "dependencies": {},
 *   "exceptionLogging": "STACKDRIVER",
 *   "runtimeVersion": "V8",
 *   "webapp": {
 *     "executeAs": "USER_ACCESSING",
 *     "access": "MYSELF"
 *   },
 *   "oauthScopes": [
 *     "https://www.googleapis.com/auth/drive",
 *     "https://www.googleapis.com/auth/documents",
 *     "https://www.googleapis.com/auth/spreadsheets",
 *     "https://www.googleapis.com/auth/script.external_request"
 *   ]
 * }
 */

// GANTI INI dengan ID Spreadsheet "Master" Anda
const MASTER_SS_ID = "1DFUAr4cYppP9nxaB2pgP8n5Oug-O1pvEdrhptlGqwJA"; // Sementara pakai ini, harap buat Master Sheet baru

// Global variable untuk Spreadsheet aktif (akan diisi secara dinamis)
let SS_ID = MASTER_SS_ID;
let ACTIVE_SS = null;

function getSS() {
  if (!ACTIVE_SS) {
    try {
      ACTIVE_SS = SpreadsheetApp.openById(SS_ID.toString().trim());
    } catch (e) {
      // Fallback: Jika gagal openById (mungkin sedang setting up atau ID salah), 
      // gunakan Spreadsheet aktif jika script terikat (container-bound)
      try {
        ACTIVE_SS = SpreadsheetApp.getActiveSpreadsheet();
      } catch (err) {
        throw new Error("Gagal membuka Spreadsheet. Pastikan ID benar atau script dijalankan dari Spreadsheet: " + e.message);
      }
    }
  }
  return ACTIVE_SS;
}

/**
 * LOGIN: Mencari ID Spreadsheet & ID Folder berdasarkan Kode Desa
 */
function loginByCode(villageCode) {
  try {
    const masterSS = SpreadsheetApp.openById(MASTER_SS_ID);
    let sheet = masterSS.getSheetByName("Villages");
    if (!sheet) {
      // Auto-create sheet Villages jika belum ada di Master
      sheet = masterSS.insertSheet("Villages");
      sheet.appendRow(["Kode Desa", "Nama Desa", "Spreadsheet ID", "Folder ID", "Status"]);
      return { status: "error", message: "Master Sheet baru dibuat. Silakan isi data desa." };
    }
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == villageCode && data[i][4] != "Inactive") {
        return {
          status: "success",
          villageName: data[i][1],
          ssId: data[i][2],
          folderId: data[i][3],
          villageCode: villageCode
        };
      }
    }
    return { status: "error", message: "Kode Desa tidak valid atau belum terdaftar." };
  } catch (e) {
    return { status: "error", message: "Gagal menghubungkan ke Master Sheet: " + e.message };
  }
}

/**
 * INITIALIZATION: Mengatur ID Spreadsheet dari Request
 * Dipanggil di awal doGet/doPost
 */
function setupContext(targetSsId) {
  if (targetSsId) {
    SS_ID = targetSsId;
    ACTIVE_SS = null; // Reset agar getSS() mengambil yang baru
  }
}

function getGlobalTemplates() {
  try {
    const masterSS = SpreadsheetApp.openById(MASTER_SS_ID);
    let sheet = masterSS.getSheetByName("Global_Templates");
    if (!sheet) {
      sheet = masterSS.insertSheet("Global_Templates");
      sheet.appendRow(["type", "count", "templateId"]);
      return [];
    }
    const data = sheet.getDataRange().getValues();
    data.shift();
    return data.map(row => ({
      type: row[0],
      count: row[1],
      templateId: row[2]
    }));
  } catch (e) {
    console.error("Gagal mengambil global templates: " + e.message);
    return [];
  }
}

/**
 * FUNGSI KRITIKAL: Jalankan ini di Editor Apps Script jika muncul error 'Akses ditolak: DriveApp'
 * 1. Di Editor, pilih fungsi 'initApp' di dropdown atas.
 * 2. Klik tombol 'Jalankan' (Run).
 * 3. Jika muncul 'Otorisasi diperlukan', klik 'Tinjau Izin'.
 * 4. Klik Akun Google Anda.
 * 5. Klik 'Advanced' / 'Lanjutan' (Kiri Bawah).
 * 6. Klik 'Buka perjadinGO (tidak aman)'.
 * 7. Klik 'Izinkan' / 'Allow'.
 */
function initApp() {
  console.log("Memulai inisialisasi aplikasi...");
  
  // FORCE PERMISSIONS (Authorization Trigger)
  try { DriveApp.getRootFolder(); } catch(e) {}
  try { DocumentApp.create("Force Auth"); } catch(e) {}
  
  const SS = getSS();
  
  try {
    console.log("Mengecek izin Google Drive...");
    const root = DriveApp.getRootFolder();
    const dummyFile = DriveApp.createFile('AUTH_VERIFICATION', 'Testing permissions');
    dummyFile.setTrashed(true);
    console.log("Akses Drive Berhasil: " + root.getName());
    
    console.log("Mengecek izin Google Docs...");
    const tempDoc = DocumentApp.create("Temp Perm Test");
    tempDoc.getBody().appendParagraph("Testing permissions");
    tempDoc.saveAndClose();
    DriveApp.getFileById(tempDoc.getId()).setTrashed(true);
    console.log("Akses Docs Berhasil.");
    
    console.log("Izin berhasil diverifikasi.");
  } catch (e) {
    console.error("Gagal inisialisasi izin: " + e.toString());
    throw new Error("PENTING: Anda harus klik 'Advanced' -> 'Go to ... (unsafe)' saat muncul jendela izin untuk mengaktifkan fitur upload.");
  }
  
  const sheetPegawai = createSheetIfNotExists("Pegawai", ["id", "name", "nik", "niap", "position", "pangkat", "golongan", "address"]);
  
  // SPPD Migration/Setup
  const sppdHeaders = ["id", "number", "purpose", "destination", "dateStart", "dateEnd", "transport", "budgetCode", "basis", "peopleCount", "employeeId1", "employeeId2", "employeeId3", "employeeId4", "employeeId5", "laporan1", "laporan2", "laporan3", "caption", "fotoUrl", "fotoId", "fotoUrl1", "fotoUrl2", "fotoUrl3", "fotoUrl4", "fotoUrl5", "uangHarian", "uangBBM", "tglBayar"];
  let sppdSheet = SS.getSheetByName("SPPD") || createSheetIfNotExists("SPPD", sppdHeaders);
  
  // Sync headers and data
  const currentHeaders = sppdSheet.getRange(1, 1, 1, Math.max(1, sppdSheet.getLastColumn())).getValues()[0];
    
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
    const additionalFields = ["laporan1", "laporan2", "laporan3", "caption", "fotoUrl", "fotoId", "fotoUrl1", "fotoUrl2", "fotoUrl3", "fotoUrl4", "fotoUrl5", "uangHarian", "uangBBM", "tglBayar"];
    let lastColumn = sppdSheet.getLastColumn();
    let currentUpdatedHeaders = sppdSheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    
    additionalFields.forEach(field => {
      if (currentUpdatedHeaders.indexOf(field) === -1) {
        sppdSheet.insertColumnAfter(lastColumn);
        sppdSheet.getRange(1, lastColumn + 1).setValue(field);
        lastColumn++;
      }
    });
  
  createSheetIfNotExists("Config_Templates", ["type", "count", "templateId"]);
  createSheetIfNotExists("Arsip_Dokumen", ["id_arsip", "sppd_number", "tipe_dokumen", "file_name", "date_generated", "file_url"]);
  createSheetIfNotExists("Konfigurasi", ["Parameter", "Nilai"]);
  
  // Set default templates if empty
  const templateSheet = getSS().getSheetByName("Config_Templates");
  if (templateSheet && templateSheet.getLastRow() <= 1) {
    const types = ["SPD", "Laporan", "SPJ"];
    const rows = [];
    types.forEach(type => {
      for (let i = 1; i <= 5; i++) {
        rows.push([type, i, ""]); 
      }
    });
    if (rows.length > 0) {
      templateSheet.getRange(2, 1, rows.length, 3).setValues(rows);
    }
  }
  
  // Set default config if empty
  const configSheet = getSS().getSheetByName("Konfigurasi");
  if (configSheet && configSheet.getLastRow() <= 1) {
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
      ["logo_url", "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Lambang_Kabupaten_Magetan.png/150px-Lambang_Kabupaten_Magetan.png"],
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
 * PENTING: Jalankan fungsi ini secara manual di Editor Apps Script
 * jika muncul error "Akses Ditolak: DriveApp".
 * Ini akan memaksa Google untuk meminta izin akses.
 */
function debugPermissions() {
  console.log("Mengecek akses DriveApp...");
  try {
    const root = DriveApp.getRootFolder();
    console.log("Root Folder Name: " + root.getName());
    const dummy = DriveApp.createFile("PERM_TEST", "ok");
    dummy.setTrashed(true);
  } catch(e) {
    throw new Error("Gagal akses DriveApp: " + e.message + ". Silakan klik 'Advanced' -> 'Go to...' saat muncul jendela izin.");
  }
  
  console.log("Mengecek akses DocumentApp...");
  try {
    const doc = DocumentApp.create("TEST_PERMISSIONS");
    doc.getBody().appendParagraph("ok");
    doc.saveAndClose();
    DriveApp.getFileById(doc.getId()).setTrashed(true);
  } catch(e) {
     throw new Error("Gagal akses DocumentApp: " + e.message);
  }
  
  console.log("Mengecek akses SpreadsheetApp...");
  try {
    const ssName = SpreadsheetApp.getActiveSpreadsheet().getName();
    console.log("Spreadsheet Name: " + ssName);
  } catch(e) {
    console.warn("Script tidak terikat spreadsheet, menggunakan ID Master.");
  }

  console.log("Mengecek akses Master Sheet...");
  try {
    const masterSS = SpreadsheetApp.openById(MASTER_SS_ID);
    console.log("Master SS Name: " + masterSS.getName());
  } catch(e) {
    throw new Error("Gagal Akses Master Sheet: " + e.message + ". Pastikan ID MASTER_SS_ID benar dan Anda memiliki akses Editor ke file tersebut.");
  }
  
  return "✅ SEMUA IZIN BERHASIL! Silakan Deploy -> New Version untuk memperbarui aplikasi.";
}

/**
 * CONFIGURATION & TEMPLATES
 */
function getConfig() {
  const configSheet = getSS().getSheetByName("Konfigurasi");
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
  const sheet = getSS().getSheetByName("Config_Templates");
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
  const configSheet = createSheetIfNotExists("Konfigurasi", ["Parameter", "Nilai"]);
  const rows = Object.keys(properties).map(key => [key, properties[key]]);
  if (configSheet.getLastRow() > 1) {
    configSheet.getRange(2, 1, configSheet.getLastRow() - 1, 2).clearContent();
  }
  if (rows.length > 0) {
    configSheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }

  // Update Script Properties for fast access in other functions
  PropertiesService.getScriptProperties().setProperties(properties);
  
  // Update Templates sheet
  if (templates && Array.isArray(templates)) {
    const sheet = createSheetIfNotExists("Config_Templates", ["type", "count", "templateId"]);
    // Clear existing data after header
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).clearContent();
    }
    const tRows = templates.map(t => [t.type, Number(t.count), String(t.templateId || "").trim()]);
    if (tRows.length > 0) {
      sheet.getRange(2, 1, tRows.length, 3).setValues(tRows);
    }
  }
  
  return { status: "success" };
}

/**
 * SPPD (TRAVEL ORDERS)
 */
function getSPDList() {
  try {
    const sheet = getSS().getSheetByName("SPPD");
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
  const sheet = getSS().getSheetByName("SPPD");
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
    const sheet = getSS().getSheetByName("SPPD");
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
      "fotoUrl1": input.fotoUrl1 || "",
      "fotoUrl2": input.fotoUrl2 || "",
      "fotoUrl3": input.fotoUrl3 || "",
      "fotoUrl4": input.fotoUrl4 || "",
      "fotoUrl5": input.fotoUrl5 || "",
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

  // Logika Pemilihan Template: Prioritas Master -> Lokal Desa
  const globalTemplates = getGlobalTemplates();
  const localTemplates = config.templates || [];
  
  let template = globalTemplates.find(t => t.type === docType && String(t.count) === pCount);
  
  // Jika di Master tidak ada, baru cari di Spreadsheet Desa masing-masing
  if (!template || !template.templateId || String(template.templateId).trim() === "") {
    template = localTemplates.find(t => t.type === docType && String(t.count) === pCount);
  }
  
  if (!template || !template.templateId || String(template.templateId).trim() === "") {
    throw new Error(`Template ${docType} untuk ${pCount} orang belum diatur di Master maupun di Desa.`);
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

  // JIKA Tipe dok adalah "Laporan", gunakan generator HTML yang sangat ketat sesuai permintaan user
  if (docType === "Laporan") {
    try {
      const pdfBlob = generateHtmlToPdfLaporan(sppd, config);
      const pdfFile = pdfFolder.createFile(pdfBlob.setName(fileName + ".pdf"));
      pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      const fileUrl = `https://drive.google.com/file/d/${pdfFile.getId()}/view?usp=sharing`;
      
      // CATAT KE SHEET ARSIP
      const arsipSheet = getSS().getSheetByName("Arsip_Dokumen");
      arsipSheet.appendRow([
        Utilities.getUuid(),
        sppd.number,
        docType,
        fileName + ".pdf",
        timestamp,
        fileUrl
      ]);
      
      return fileUrl;
    } catch (e) {
      console.error("HTML Laporan Error: " + e.message);
      // Fallback to old Google Doc flow if HTML generation fails
    }
  }

  // Salin template ke file baru (Temporary Google Doc)
  const newFile = templateDoc.makeCopy(fileName + "_TEMP");
  const newDocId = newFile.getId();
  const doc = DocumentApp.openById(newDocId);
  const body = doc.getBody();
  
  // Optimization: Reduce margins to give more vertical space
  try {
    const section = body.getParent().asDocument().getSections()[0];
    if (section) {
      section.setMarginTop(20);
      section.setMarginBottom(20);
      section.setMarginLeft(50);
      section.setMarginRight(50);
    }
  } catch(e) {
    try {
      body.setMarginTop(20);
      body.setMarginBottom(20);
    } catch(err) {}
  }
  
  // 0. Ensure reports are separated correctly if needed
  const allParas = body.getParagraphs();
  
  // Set A4 Paper Size if possible (defaults to Letter in some locales)
  try {
    body.setPageWidth(595); // A4 Width in points (approx)
    body.setPageHeight(842); // A4 Height in points (approx)
  } catch(e) {}

  // Strict text truncation and compaction for Laporan to prevent overflow
  if (docType === "Laporan") {
    ["laporan1", "laporan2", "laporan3"].forEach(f => {
       if (sppd[f] && sppd[f].length > 700) {
         sppd[f] = sppd[f].substring(0, 697) + "...";
       }
    });

    allParas.forEach(p => {
      try {
        p.setSpacingAfter(0);
        p.setSpacingBefore(0);
        p.setLineSpacing(1);
        p.setIndentFirstLine(0);
        p.setIndentStart(0);
        p.setIndentEnd(0);
      } catch(e) {}
    });
  }
  
  // Force Page Breaks on Kops and Dokumentasi title
  let foundKopCount = 0;
  let lastWasKopText = false;
  allParas.forEach(p => {
    const text = p.getText().trim();
    const looksLikeKop = text.includes("PEMERINTAH KABUPATEN") || text.includes("KECAMATAN") || text.includes("KABUPATEN MAGETAN");
    const isDokumentasi = text.includes("DOKUMENTASI PERJALANAN DINAS");
    
    if (looksLikeKop && !lastWasKopText) {
      foundKopCount++;
      if (foundKopCount > 1) {
        try { p.setPageBreak(true); } catch(e) {}
      }
      lastWasKopText = true;
    } else if (isDokumentasi) {
      try { p.setPageBreak(true); } catch(e) {}
      lastWasKopText = false;
    } else if (text !== "") {
      lastWasKopText = false;
    }
  });
  
  // Helper to fetch value with priority
  const getV = (key, fallback = "") => {
    if (sppd[key] !== undefined && sppd[key] !== null && String(sppd[key]).trim() !== "") return sppd[key];
    const sanitizedKey = key.toLowerCase().replace(/\s+/g, '_');
    if (config[sanitizedKey] !== undefined && config[sanitizedKey] !== null && String(config[sanitizedKey]).trim() !== "") return config[sanitizedKey];
    if (config[key] !== undefined && config[key] !== null && String(config[key]).trim() !== "") return config[key];
    return fallback;
  };

  // Minimal replacements loop
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
    const empId = sppd[`employeeId${i}`] || (extraData && extraData.employeeIds ? extraData.employeeIds[i-1] : null);
    const emp = empId ? empMap[empId] : null;
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

    // PHOTO RESIZING LOGIC
    let maxW = 480; // Standard for A4 with margins
    let maxH = 150; // Maximum allowed height to keep within 1 page
    
    if (docType === "Dokumentasi") {
       maxW = 500;
       maxH = 400; // Larger for dedicated photo page
    }

    if (sppd.image_width) maxW = parseInt(sppd.image_width);
    if (sppd.image_height) maxH = parseInt(sppd.image_height);

    const parent = element.getParent ? element.getParent() : null;
    if (parent && parent.getNextSibling) {
      const next = parent.getNextSibling();
      if (next && next.getType() === DocumentApp.ElementType.PARAGRAPH && next.asParagraph().getText().trim() === "") {
        try { next.removeFromParent(); } catch(e) {}
      }
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
             
             const img = para.appendInlineImage(blob);
             let w = img.getWidth(); 
             let h = img.getHeight();
             if (w > maxW) { h *= (maxW/w); w = maxW; }
             if (h > maxH) { w *= (maxH/h); h = maxH; }
             img.setWidth(w).setHeight(h);
          } else {
             const index = container.getChildIndex ? container.getChildIndex(textElem) : 0;
             if (container.insertInlineImage) {
                const img = container.insertInlineImage(index, blob);
                let w = img.getWidth(); let h = img.getHeight();
                if (w > maxW) { h *= (maxW/w); w = maxW; }
                if (h > maxH) { w *= (maxH/h); h = maxH; }
                img.setWidth(w).setHeight(h);
                if (container.setAlignment) container.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
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

  // Cleanup: Remove trailing empty paragraphs at very end of document to prevent blank pages
  try {
    const paras = body.getParagraphs();
    for (let i = paras.length - 1; i >= 0; i--) {
      const p = paras[i];
      if (!p || !p.getParent()) continue;
      
      const text = p.getText().trim();
      const numChildren = p.getNumChildren();
      
      if (text === "" && numChildren === 0) {
        try { p.removeFromParent(); } catch(e) {}
      } else if (text === "" && numChildren > 0) {
        // Safe check for images/other elements
        let hasContent = false;
        try {
          for (let j = 0; j < numChildren; j++) {
            const child = p.getChild(j);
            if (child && child.getType() !== DocumentApp.ElementType.TEXT) {
              hasContent = true;
              break;
            }
          }
        } catch(e) {}
        
        if (!hasContent) {
          try { p.removeFromParent(); } catch(e) {}
        } else {
          break; // Stop at first non-empty
        }
      } else {
        break; 
      }
    }
  } catch(err) {
    console.error("Cleanup error: " + err.message);
  }

  doc.saveAndClose();
  SpreadsheetApp.flush();
  Utilities.sleep(500); // Wait for Google to process save
  
  // EKSPOR KE PDF
  const pdfBlob = newFile.getBlob().getAs('application/pdf').setName(fileName + ".pdf");
  const pdfFile = pdfFolder.createFile(pdfBlob);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Hapus temporary Doc
  try { newFile.setTrashed(true); } catch(e) {}

  // Use a more direct Drive viewer URL to avoid "File Not Found" errors in Docs Viewer
  const fileUrl = `https://drive.google.com/file/d/${pdfFile.getId()}/view?usp=sharing`;

  // CATAT KE SHEET ARSIP
  const arsipSheet = getSS().getSheetByName("Arsip_Dokumen");
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


/**
 * NEW: GENERATE LAPORAN VIA HTML TO PDF
 * Following the strict user specification for 1 person = 2 pages (Doc + Photo)
 */
function generateHtmlToPdfLaporan(sppd, config) {
  const employees = getPegawai();
  const empMap = {};
  employees.forEach(e => { if (e.id) empMap[e.id] = e; });

  // Helper function to get base64 from URL to ensure images show in PDF
  const getBase64FromUrl = (url) => {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return url;
    
    // Safety Fallback for Magetan Logo if everything else fails
    const MAGETAN_FALLBACK_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Lambang_Kabupaten_Magetan.png/150px-Lambang_Kabupaten_Magetan.png";
    
    const fetchWithRetry = (targetUrl) => {
      try {
        const response = UrlFetchApp.fetch(targetUrl, { 
          muteHttpExceptions: true,
          validateHttpsCertificates: false,
          followRedirects: true
        });
        if (response.getResponseCode() === 200) {
          const blob = response.getBlob();
          const contentType = blob.getContentType();
          // Verify it's an image
          if (contentType.indexOf("image") !== -1) {
             return "data:" + contentType + ";base64," + Utilities.base64Encode(blob.getBytes());
          }
        }
      } catch (e) {
        console.error("Fetch failed for " + targetUrl + ": " + e.message);
      }
      return null;
    };

    // Try primary URL first
    let result = fetchWithRetry(url);
    if (result) return result;

    // Try fallback URL if primary fails and is not the fallback itself
    if (url !== MAGETAN_FALLBACK_URL) {
      result = fetchWithRetry(MAGETAN_FALLBACK_URL);
      if (result) return result;
    }

    return url; // Extreme fallback to raw URL
  };

  const pelaporList = [];
  for (let i = 1; i <= 5; i++) {
    const empId = sppd[`employeeId${i}`];
    if (empId) {
      const emp = empMap[empId];
      if (emp) {
        // Individual photo per person logic: check fotoUrl1, fotoUrl2... then fallback to global fotoUrl
        const specificFoto = sppd[`fotoUrl${i}`] || sppd.fotoUrl || "";
        pelaporList.push({
          NAMA: emp.name,
          FOTO_URL: getBase64FromUrl(specificFoto), // Convert to base64
          CAPTION: sppd.caption || "Dokumentasi perjalanan dinas"
        });
      }
    }
  }

  // Defaults if empty
  if (pelaporList.length === 0) {
    pelaporList.push({ NAMA: "Belum Ditentukan", FOTO_URL: "", CAPTION: "" });
  }

  // Logo mapping (base64)
  const defaultLogo = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Lambang_Kabupaten_Magetan.png/150px-Lambang_Kabupaten_Magetan.png";
  const logoUrlInput = config.logo_url || defaultLogo;
  const logoUrl = getBase64FromUrl(logoUrlInput);

  let html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laporan Perjalanan Dinas - ${sppd.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; background: #fff; line-height: 1.4; }

    .halaman {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      overflow: hidden;
      padding: 10mm 15mm 15mm 20mm; /* Reduced top padding */
      position: relative;
      display: flex;
      flex-direction: column;
      background: white;
      box-sizing: border-box;
    }

    /* Page break for printing */
    @media print {
      body { margin: 0; }
      .halaman {
        page-break-before: always;
        break-before: page;
        border: none;
      }
      .halaman:first-child {
        page-break-before: auto;
        break-before: auto;
      }
    }

    @media screen {
      body { background: #e0e0e0; padding: 20px; }
      .halaman {
        margin: 0 auto 20px auto;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }
    }

    .kop-surat-table {
      width: 100%;
      margin-bottom: 5px;
      border-collapse: collapse;
    }
    .kop-logo-cell {
      width: 70px;
      padding-right: 20px;
      vertical-align: middle;
      text-align: center;
    }
    .kop-logo {
      height: 80px;
      width: auto;
      display: block;
    }
    .kop-teks-cell {
      text-align: center;
      vertical-align: middle;
    }
    .nama-pemda { font-size: 13pt; font-weight: bold; margin: 0; padding: 0; line-height: 1.1; }
    .nama-kecamatan { font-size: 13pt; font-weight: bold; margin: 0; padding: 0; line-height: 1.1; }
    .nama-desa { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 0; padding: 0; line-height: 1.2; }
    .info-kontak { font-size: 9pt; margin: 0; padding: 0; line-height: 1.1; }

    .kop-garis {
      border-bottom: 4px double black;
      margin-top: 1px;
      margin-bottom: 10px;
      flex-shrink: 0;
    }

    .judul-dokumen {
      text-align: center;
      font-weight: bold;
      font-size: 12pt;
      text-transform: uppercase;
      margin: 4px 0 8px 0;
      text-decoration: underline;
      flex-shrink: 0;
    }

    .body-laporan {
      font-size: 11pt;
      line-height: 1.3;
      text-align: justify;
      margin-bottom: 20px;
    }

    .section-heading {
      font-weight: bold;
      margin-top: 8px;
      margin-bottom: 4px;
    }

    .item-laporan {
      display: flex;
      gap: 4px;
      margin-bottom: 6px;
    }
    .item-laporan .nomor { flex-shrink: 0; }
    .item-laporan .isi { flex: 1; }

    .blok-ttd-table {
      width: 100%;
      margin-top: 20px;
      border-collapse: collapse;
      flex-shrink: 0;
    }
    .ttd-cell-kiri { width: 50%; text-align: center; vertical-align: top; }
    .ttd-cell-kanan { width: 50%; text-align: center; vertical-align: top; }
    .ttd-nama-row { height: 140px; vertical-align: bottom; }
    .ttd-nama-teks { font-weight: bold; text-decoration: underline; text-align: center; }
    .ttd-nama-teks-kanan { font-weight: bold; text-decoration: underline; text-align: center; }

    .area-dokumentasi {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding-top: 8px;
      overflow: hidden;
    }
    .caption-foto {
      text-align: center;
      margin-bottom: 15px;
      font-size: 11pt;
      font-style: italic;
    }
    .foto-dokumentasi {
      display: block;
      max-width: 440px;
      max-height: 320px;
      width: auto;
      height: auto;
      object-fit: contain;
      margin: 0 auto;
      border: 1px solid #ddd;
    }
    .foto-placeholder {
      width: 420px;
      height: 250px;
      max-width: 100%;
      background: #f9f9f9;
      border: 1px dashed #bbb;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 11pt;
    }
  </style>
</head>
<body>`;

  const KAB = (config.kabupaten || "").replace(/Kabupaten\s+/i, "").toUpperCase();
  const KEC = (config.kecamatan || "").replace(/Kecamatan\s+/i, "").toUpperCase();
  const DESA = config.nama_desa;
  const DESA_UPPER = (config.nama_desa || "").toUpperCase();
  const ALAMAT = config.alamat_kantor;
  const EMAIL = config.email;
  const WEB = config.web;
  const KODEPOS = config.kodepos;
  const KADES = config.kepala_desa;
  const NOMOR = sppd.number;
  const TGL_BERANGKAT = formatDateIndo(sppd.dateStart);
  const TGL_KEMBALI = formatDateIndo(sppd.dateEnd);
  const TUJUAN = sppd.destination;
  const MAKSUD = sppd.purpose;
  const LAP1 = sppd.laporan1 || "-";
  const LAP2 = sppd.laporan2 || "-";
  const LAP3 = sppd.laporan3 || "-";

  pelaporList.forEach((pelapor, index) => {
    // KOP SURAT SHARED
    const kopSuratHtml = `
    <table class="kop-surat-table">
      <tr>
        <td class="kop-logo-cell">
          <img class="kop-logo" src="${logoUrl}" alt="Logo">
        </td>
        <td class="kop-teks-cell">
          <div class="nama-pemda">PEMERINTAH KABUPATEN ${KAB}</div>
          <div class="nama-kecamatan">KECAMATAN ${KEC}</div>
          <div class="nama-desa">${DESA_UPPER}</div>
          <div class="info-kontak">${ALAMAT}</div>
          <div class="info-kontak">email : ${EMAIL} &nbsp; Website : ${WEB}</div>
          <div class="info-kontak" style="text-align: right; padding-right: 20px;">Kode Pos : ${KODEPOS}</div>
        </td>
      </tr>
    </table>
    <div class="kop-garis"></div>`;

    // Halaman Laporan
    html += `
  <div class="halaman">
    ${kopSuratHtml}

    <div class="judul-dokumen">LAPORAN PERJALANAN DINAS</div>

    <div class="body-laporan">
      <div class="section-heading">I. PENDAHULUAN</div>
      <div style="margin-left: 16px;">
        <p style="margin-bottom:2px;">a. Dalam rangka meningkatkan efektivitas penyelenggaraan pemerintahan desa serta mendukung berbagai program pembangunan dan pelayanan kepada masyarakat, diperlukan berbagai kegiatan yang melibatkan perjalanan dinas bagi aparatur desa.</p>
        <p style="margin-bottom:1px;">b. Landasan Hukum</p>
        <p style="margin-left:16px; margin-bottom:2px;">Surat Tugas Kepala Desa Nomor : ${NOMOR} tanggal ${TGL_BERANGKAT} Tentang ${MAKSUD} di ${TUJUAN}</p>
        <p style="margin-bottom:1px;">c. Maksud dan Tujuan</p>
        <p style="margin-left:16px;">Mengikuti ${MAKSUD} di ${TUJUAN}</p>
      </div>

      <div class="section-heading">II. KEGIATAN YANG DILAKSANAKAN</div>
      <p>Perjalanan Dinas dalam rangka Kegiatan ${MAKSUD} di ${TUJUAN} pada ${TGL_BERANGKAT} sampai dengan ${TGL_KEMBALI}</p>

      <div class="section-heading">III. HASIL YANG DICAPAI</div>
      <div class="item-laporan"><span class="nomor">1.</span><span class="isi">${LAP1}</span></div>
      <div class="item-laporan"><span class="nomor">2.</span><span class="isi">${LAP2}</span></div>
      <div class="item-laporan"><span class="nomor">3.</span><span class="isi">${LAP3}</span></div>
      <div style="margin-top: 10px;">
        <span style="font-weight: bold;">IV. PENUTUP </span>
        <span>Demikian laporan ini disampaikan untuk menjadikan periksa</span>
      </div>
    </div>

    <table class="blok-ttd-table">
      <tr>
        <td class="ttd-cell-kiri">Mengetahui,</td>
        <td class="ttd-cell-kanan">Dibuat di &nbsp;&nbsp;: ${DESA}</td>
      </tr>
      <tr>
        <td class="ttd-cell-kiri">KEPALA DESA ${DESA_UPPER}</td>
        <td class="ttd-cell-kanan">Pada tanggal : ${TGL_KEMBALI}</td>
      </tr>
      <tr>
        <td class="ttd-cell-kiri"></td>
        <td class="ttd-cell-kanan" style="height: 20px; vertical-align: bottom;">Pelapor,</td>
      </tr>
      <tr class="ttd-nama-row">
        <td class="ttd-cell-kiri"><div class="ttd-nama-teks">${KADES}</div></td>
        <td class="ttd-cell-kanan"><div class="ttd-nama-teks-kanan">${pelapor.NAMA}</div></td>
      </tr>
    </table>
  </div>`;

    // Halaman Dokumentasi
    const fotoHtml = pelapor.FOTO_URL 
      ? `<img class="foto-dokumentasi" src="${pelapor.FOTO_URL}" alt="Logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="foto-placeholder" style="display:none">[ Foto Tidak Tersedia ]</div>`
      : `<div class="foto-placeholder">[ Foto Tidak Tersedia ]</div>`;

    html += `
  <div class="halaman">
    ${kopSuratHtml}

    <div class="judul-dokumen">DOKUMENTASI PERJALANAN DINAS</div>

    <div class="area-dokumentasi">
      <div class="caption-foto">${pelapor.CAPTION}</div>
      ${fotoHtml}
    </div>
  </div>`;
  });

  html += `</body></html>`;

  const blob = Utilities.newBlob(html, "text/html", "Laporan.html");
  return blob.getAs("application/pdf");
}

function updateConfigValue(key, value) {
  const sheet = createSheetIfNotExists("Konfigurasi", ["Parameter", "Nilai"]);
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
  const sheet = getSS().getSheetByName("SPPD");
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

function uploadFile(base64Data, fileName, targetFolderId) {
  try {
    // Check DriveApp explicitly
    if (typeof DriveApp === 'undefined') {
      throw new Error("DriveApp tidak terdeteksi. Otorisasi scope 'drive' mungkin diblokir atau belum diberikan.");
    }

    const contentType = base64Data.substring(base64Data.indexOf(":") + 1, base64Data.indexOf(";"));
    const bytes = Utilities.base64Decode(base64Data.split(",")[1]);
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    
    // Simpan ke folder yang sesuai (Desa spesifik atau default)
    let folder;
    if (targetFolderId && targetFolderId.trim() !== "") {
      try {
        folder = DriveApp.getFolderById(targetFolderId.trim());
      } catch (e) {
        console.warn("Folder ID desa (" + targetFolderId + ") tidak dapat diakses atau salah ID: " + e.message);
      }
    }
    
    if (!folder) {
      try {
        const folders = DriveApp.getFoldersByName("Dokumentasi_SPPD");
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder("Dokumentasi_SPPD");
        }
      } catch (e) {
        throw new Error("Akses ditolak ke DriveApp. Pastikan Anda telah menjalankan fungsi 'initApp' (ATAU 'debugPermissions') di Editor GAS secara MANUAL dan memberikan izin akses Drive. Jika masih gagal, pastikan Anda telah men-Deploy sebagai 'NEW VERSION' setelah memberi izin.");
      }
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
  const ss = getSS();
  const sheetPegawai = ss.getSheetByName("Pegawai");
  const sheetSPPD = ss.getSheetByName("SPPD");
  
  const pegawai = (sheetPegawai && sheetPegawai.getLastRow() > 0) ? (sheetPegawai.getLastRow() - 1) : 0;
  const sppd = (sheetSPPD && sheetSPPD.getLastRow() > 0) ? (sheetSPPD.getLastRow() - 1) : 0;
  
  return {
    pegawai: pegawai >= 0 ? pegawai : 0,
    sppd: sppd >= 0 ? sppd : 0,
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
    const sheet = getSS().getSheetByName("Pegawai");
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
  const sheet = getSS().getSheetByName("Pegawai");
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
  const sheet = getSS().getSheetByName("Pegawai");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { status: "success" };
    }
  }
}

function editPegawai(id, data) {
  const sheet = getSS().getSheetByName("Pegawai");
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
  const ss = getSS();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    }
  }
  return sheet;
}

function getArsip() {
  try {
    const sheet = getSS().getSheetByName("Arsip_Dokumen");
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
  if (e && e.parameter && e.parameter.ssId) {
    setupContext(e.parameter.ssId);
  }
  
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
  
  if (postData.ssId) {
    setupContext(postData.ssId);
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
