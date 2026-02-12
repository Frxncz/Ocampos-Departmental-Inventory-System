/*************** CONFIG ***************/
const SPREADSHEET_ID = "1WcamMjLKVzmzSu2tkDnIxvpNI9TDz8UJNzukwqPX3LM"; // <- CHANGE THIS
const SHEET_DEPTS = "DEPARTMENTS";
const LOW_STOCK_THRESHOLD = 10;

// The headers every department tab should have (Row 1)
const DEPT_HEADERS = [
  "Item Code", "Item Name", "Category", "Stock", "Unit", "Status", "Image"
];

/*************** WEB APP ***************/
function doGet() {
  return HtmlService.createTemplateFromFile("backend/Index")
    .evaluate()
    .setTitle("Virtual Warehouse Pro");
}

/*************** HTML INCLUDE HELPER ***************/
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/*************** INTERNAL HELPERS ***************/
function getSS_() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    throw new Error(
      "Cannot open spreadsheet. Check SPREADSHEET_ID and sharing permissions. " +
      "Details: " + e.message
    );
  }
}

/**
 * Ensures a department sheet exists and has correct headers.
 * If missing, it will create it and add headers.
 */
function ensureDepartmentSheet_(deptName) {
  const ss = getSS_();
  let sh = ss.getSheetByName(deptName);

  if (!sh) {
    sh = ss.insertSheet(deptName);
  }

  // Ensure headers exist in row 1
  const currentHeaders = sh.getRange(1, 1, 1, DEPT_HEADERS.length).getValues()[0];
  const headersOk = DEPT_HEADERS.every((h, i) => String(currentHeaders[i] || "").trim() === h);

  if (!headersOk) {
    sh.getRange(1, 1, 1, DEPT_HEADERS.length).setValues([DEPT_HEADERS]);
    sh.setFrozenRows(1);
  }

  return sh;
}

function normalizeDept_(s) {
  return String(s || "").trim();
}

function statusFromStock_(stock) {
  return Number(stock) <= LOW_STOCK_THRESHOLD ? "LOW" : "OK";
}

/*************** READ: Departments List ***************/
function getDepartments() {
  const ss = getSS_();
  const sh = ss.getSheetByName(SHEET_DEPTS);
  if (!sh) throw new Error("Missing sheet tab: DEPARTMENTS (must exist in your spreadsheet)");

  const depts = sh.getRange("A2:A").getValues().flat().map(normalizeDept_).filter(Boolean);

  // Optional: auto-create tabs for each department so you don't have to do it manually
  depts.forEach(d => ensureDepartmentSheet_(d));

  return depts;
}

/**
 * Each department has its own sheet tab.
 * Columns:
 * A code | B name | C category | D stock | E unit | F status | G image
 */
function getDepartmentItems(department) {
  const deptName = normalizeDept_(department);
  if (!deptName) throw new Error("Missing department");

  const sh = ensureDepartmentSheet_(deptName);
  const rows = sh.getDataRange().getValues();

  return rows.slice(1).map(r => ({
    code: r[0],
    name: r[1],
    category: r[2],
    department: deptName,
    stock: Number(r[3] || 0),
    unit: r[4],
    status: r[5],
    image: r[6]
  }));
}

/*************** CREATE ***************/
function addItem(data) {
  const deptName = normalizeDept_(data && data.department);
  if (!deptName) throw new Error("Required: Department");

  const sh = ensureDepartmentSheet_(deptName);

  const code = String(data.code || "").trim();
  const name = String(data.name || "").trim();
  const category = String(data.category || "").trim();
  const unit = String(data.unit || "").trim();
  const image = String(data.image || "").trim();
  const stock = Number(data.stock || 0);

  if (!code || !name) throw new Error("Required: Item Code, Item Name");

  // Prevent duplicate code within same department tab
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const codes = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(x => String(x).trim());
    if (codes.includes(code)) throw new Error(`Item Code already exists in ${deptName}.`);
  }

  const status = statusFromStock_(stock);

  sh.appendRow([code, name, category, stock, unit, status, image]);
  return { success: true };
}

/*************** UPDATE ***************/
function updateItem(data) {
  const deptName = normalizeDept_(data && data.department);
  if (!deptName) throw new Error("Required: Department");

  const sh = ensureDepartmentSheet_(deptName);

  const originalCode = String(data.originalCode || "").trim();
  const code = String(data.code || "").trim();
  const name = String(data.name || "").trim();
  const category = String(data.category || "").trim();
  const unit = String(data.unit || "").trim();
  const image = String(data.image || "").trim();
  const stock = Number(data.stock || 0);

  if (!originalCode) throw new Error("Missing originalCode");
  if (!code || !name) throw new Error("Required: Item Code, Item Name");

  const rows = sh.getDataRange().getValues();

  // If changing code, ensure new code not duplicate
  if (code !== originalCode) {
    const codes = rows.slice(1).map(r => String(r[0]).trim());
    if (codes.includes(code)) throw new Error(`New Item Code already exists in ${deptName}.`);
  }

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === originalCode) {
      const status = statusFromStock_(stock);

      // Write A-G (7 columns)
      sh.getRange(i + 1, 1, 1, 7).setValues([[
        code, name, category, stock, unit, status, image
      ]]);

      return { success: true };
    }
  }

  throw new Error(`Item not found for update in ${deptName}.`);
}

/*************** DELETE ***************/
function deleteItem(code, department) {
  const deptName = normalizeDept_(department);
  if (!deptName) throw new Error("Required: Department");

  const sh = ensureDepartmentSheet_(deptName);

  const target = String(code || "").trim();
  const rows = sh.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === target) {
      sh.deleteRow(i + 1);
      return { success: true };
    }
  }

  throw new Error(`Item not found for delete in ${deptName}.`);
}
