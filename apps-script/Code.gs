const SPREADSHEET_ID = "PASTE_YOUR_GOOGLE_SHEET_ID_HERE";
const SHEET_NAME = "Orders";

const VALID_MILKS = ["2%", "2% lactose free", "soy", "oat"];
const VALID_SYRUPS = [
  "pumpkin pie",
  "pumpkin pie sugar free",
  "peanut butter cup",
  "bourbon caramel",
  "brown sugar cinnamon",
  "peppermint sugar free"
];

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "list";

  if (action === "list") {
    return jsonResponse_({
      ok: true,
      orders: listOrders_()
    });
  }

  return jsonResponse_({
    ok: false,
    error: "Unsupported GET action."
  });
}

function doPost(e) {
  const action = (e && e.parameter && e.parameter.action) || "";

  try {
    if (action === "add") {
      const name = sanitizeText_(e.parameter.name);
      const milk = sanitizeText_(e.parameter.milk);
      const syrup = sanitizeText_(e.parameter.syrup);

      validateOrderInput_(name, milk, syrup);
      const order = addOrder_(name, milk, syrup);

      return jsonResponse_({
        ok: true,
        order: order
      });
    }

    if (action === "delete") {
      const id = sanitizeText_(e.parameter.id);

      if (!id) {
        throw new Error("Missing order id.");
      }

      deleteOrder_(id);

      return jsonResponse_({
        ok: true
      });
    }

    if (action === "clear") {
      clearOrders_();

      return jsonResponse_({
        ok: true
      });
    }

    return jsonResponse_({
      ok: false,
      error: "Unsupported POST action."
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error.message
    });
  }
}

function listOrders_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, 5)
    .getValues()
    .map(function(row) {
      return {
        id: String(row[0] || ""),
        name: String(row[1] || ""),
        milk: String(row[2] || ""),
        syrup: String(row[3] || ""),
        createdAt: String(row[4] || "")
      };
    })
    .filter(function(order) {
      return (
        order.id &&
        order.name &&
        VALID_MILKS.indexOf(order.milk) !== -1 &&
        VALID_SYRUPS.indexOf(order.syrup) !== -1
      );
    });
}

function addOrder_(name, milk, syrup) {
  const sheet = getSheet_();
  const order = {
    id: Utilities.getUuid(),
    name: name,
    milk: milk,
    syrup: syrup,
    createdAt: new Date().toISOString()
  };

  sheet.appendRow([
    order.id,
    order.name,
    order.milk,
    order.syrup,
    order.createdAt
  ]);

  return order;
}

function deleteOrder_(id) {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return;
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (var index = ids.length - 1; index >= 0; index -= 1) {
    if (String(ids[index][0]) === id) {
      sheet.deleteRow(index + 2);
      return;
    }
  }
}

function clearOrders_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    sheet.deleteRows(2, lastRow - 1);
  }
}

function getSheet_() {
  if (SPREADSHEET_ID === "PASTE_YOUR_GOOGLE_SHEET_ID_HERE") {
    throw new Error("Set SPREADSHEET_ID in Code.gs before deploying.");
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["id", "name", "milk", "syrup", "createdAt"]);
  }

  return sheet;
}

function validateOrderInput_(name, milk, syrup) {
  if (!name) {
    throw new Error("Please enter a name.");
  }

  if (VALID_MILKS.indexOf(milk) === -1) {
    throw new Error("Milk selection is not valid.");
  }

  if (VALID_SYRUPS.indexOf(syrup) === -1) {
    throw new Error("Syrup selection is not valid.");
  }
}

function sanitizeText_(value) {
  return String(value || "").trim();
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
