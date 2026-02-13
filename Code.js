/*************** CONFIG ***************/
const SPREADSHEET_ID = "1WcamMjLKVzmzSu2tkDnIxvpNI9TDz8UJNzukwqPX3LM";
const SHEET_ITEMS = "ITEMS_MASTER";
const SHEET_DEPTS = "DEPARTMENTS";
const LOW_STOCK_THRESHOLD = 10;

/*************** WEB APP ***************/
function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Virtual Warehouse Pro")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/*************** HTML INCLUDE HELPER ***************/
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/*************** READ ***************/
function getDepartments() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_DEPTS);
  if (!sh) throw new Error("Missing sheet: " + SHEET_DEPTS);

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return []; // no departments

  // Read only filled values from A2:A
  const values = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  return values.map(v => String(v).trim()).filter(Boolean);
}

function getDepartmentItems(department) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_ITEMS);
  if (!sh) throw new Error("Missing sheet: " + SHEET_ITEMS);

  const rows = sh.getDataRange().getValues();
  return rows.slice(1)
    .filter(r => String(r[3]).trim() === String(department).trim())
    .map(r => ({
      code: r[0],
      name: r[1],
      category: r[2],
      department: r[3],
      stock: Number(r[4] || 0),
      unit: r[5],
      status: r[6],
      image: r[7]
    }));
}

/*************** AUTO CODE GENERATOR ***************/
function deptPrefix_(department) {
  // Turn "Billing and Collection" -> "BILLINGANDCOLLECTION"
  // Turn "Marketing/Creative" -> "MARKETINGCREATIVE"
  return String(department || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ""); // remove spaces/symbols
}

function generateNextDeptItemCode_(sh, department) {
  const prefix = deptPrefix_(department);
  if (!prefix) throw new Error("Invalid department for code generation.");

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return `${prefix}-0001`;

  const codes = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat();

  // Only codes that start with "PREFIX-"
  const re = new RegExp("^" + prefix + "-(\\d+)$");

  let maxNum = 0;
  for (const c of codes) {
    const m = re.exec(String(c || "").trim().toUpperCase());
    if (m) {
      const n = Number(m[1]);
      if (n > maxNum) maxNum = n;
    }
  }

  const next = maxNum + 1;
  return `${prefix}-${String(next).padStart(4, "0")}`;
}



/*************** CREATE ***************/
function addItem(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_ITEMS);
  if (!sh) throw new Error("Missing sheet: " + SHEET_ITEMS);

  const name = String(data.name || "").trim();
  const category = String(data.category || "").trim();
  const department = String(data.department || "").trim();
  const image = String(data.image || "").trim();
  const stock = Number(data.stock || 0);

  const unit = ""; // still blank on Add

  if (!name || !department) {
    throw new Error("Required: Item Name, Department");
  }

  // ✅ AUTO CODE per department
  const code = generateNextDeptItemCode_(sh, department);

  const status = stock <= LOW_STOCK_THRESHOLD ? "LOW" : "OK";
  sh.appendRow([code, name, category, department, stock, unit, status, image]);

  return { success: true, code };
}




/*************** UPDATE ***************/
function updateItem(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_ITEMS);
  if (!sh) throw new Error("Missing sheet: " + SHEET_ITEMS);

  const originalCode = String(data.originalCode || "").trim();
  const code = String(data.code || "").trim();
  const name = String(data.name || "").trim();
  const category = String(data.category || "").trim();
  const department = String(data.department || "").trim();
  const unit = String(data.unit || "").trim();
  const image = String(data.image || "").trim();
  const stock = Number(data.stock || 0);

  if (!originalCode) throw new Error("Missing originalCode");
  if (!code || !name || !department) throw new Error("Required: Item Code, Item Name, Department");

  const rows = sh.getDataRange().getValues();

  if (code !== originalCode) {
    const codes = rows.slice(1).map(r => String(r[0]).trim());
    if (codes.includes(code)) throw new Error("New Item Code already exists.");
  }

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === originalCode) {
      const status = stock <= LOW_STOCK_THRESHOLD ? "LOW" : "OK";
      sh.getRange(i + 1, 1, 1, 8).setValues([[
        code, name, category, department, stock, unit, status, image
      ]]);
      return { success: true };
    }
  }

  throw new Error("Item not found for update.");
}

/*************** DELETE ***************/
function deleteItem(code) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_ITEMS);
  if (!sh) throw new Error("Missing sheet: " + SHEET_ITEMS);

  const target = String(code || "").trim();
  const rows = sh.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === target) {
      sh.deleteRow(i + 1);
      return { success: true };
    }
  }
  throw new Error("Item not found for delete.");
}
