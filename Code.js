function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle("Warehouse Inventory System");
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
