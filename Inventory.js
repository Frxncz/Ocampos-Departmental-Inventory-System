function getDepartmentData(department) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(department);
  const data = sheet.getDataRange().getValues();
  data.shift(); // remove header row
  return data;
}

function addItem(department, item) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(department);
  sheet.appendRow([item.code, item.name, item.qty, item.unit]);
}

function deleteItem(department, code) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(department);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === code) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}
