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

/*************** CREATE ***************/
function addItem(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_ITEMS);
  if (!sh) throw new Error("Missing sheet: " + SHEET_ITEMS);

  const code = String(data.code || "").trim();
  const name = String(data.name || "").trim();
  const category = String(data.category || "").trim();
  const department = String(data.department || "").trim();
  const image = String(data.image || "").trim();
  const stock = Number(data.stock || 0);

  const unit = ""; // unit removed in Add

  if (!code || !name || !department) {
    throw new Error("Required: Item Code, Item Name, Department");
  }

  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const codes = sh.getRange(2, 1, lastRow - 1, 1)
      .getValues().flat().map(v => String(v).trim());
    if (codes.includes(code)) throw new Error("Item Code already exists. Use a unique code.");
  }

  const status = stock <= LOW_STOCK_THRESHOLD ? "LOW" : "OK";
  sh.appendRow([code, name, category, department, stock, unit, status, image]);
  return { success: true };
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
