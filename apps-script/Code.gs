const DEFAULT_SHEET_NAME = "Orders";
const NOTE_LIMIT = 160;

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
  const action = getAction_(e);

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
  const action = getAction_(e);
  const params = (e && e.parameter) || {};

  try {
    if (action === "add") {
      const name = sanitizeText_(params.name);
      const milk = sanitizeText_(params.milk);
      const syrup = sanitizeText_(params.syrup);
      const note = sanitizeText_(params.note);

      validateOrderInput_(name, milk, syrup, note);

      return withLock_(function() {
        return jsonResponse_({
          ok: true,
          order: addOrder_(name, milk, syrup, note)
        });
      });
    }

    if (action === "delete") {
      const id = sanitizeText_(params.id);

      if (!id) {
        throw new Error("Missing order id.");
      }

      return withLock_(function() {
        deleteOrder_(id);
        return jsonResponse_({ ok: true });
      });
    }

    if (action === "clear") {
      const adminToken = sanitizeText_(params.adminToken);
      validateClearAllToken_(adminToken);

      return withLock_(function() {
        clearOrders_();
        return jsonResponse_({ ok: true });
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
    .getRange(2, 1, lastRow - 1, 6)
    .getValues()
    .map(function(row) {
      return {
        id: String(row[0] || ""),
        name: String(row[1] || ""),
        milk: String(row[2] || ""),
        syrup: String(row[3] || ""),
        note: String(row[4] || ""),
        createdAt: String(row[5] || "")
      };
    })
    .filter(function(order) {
      return isStoredOrderValid_(order);
    });
}

function addOrder_(name, milk, syrup, note) {
  const sheet = getSheet_();
  const order = {
    id: Utilities.getUuid(),
    name: name,
    milk: milk,
    syrup: syrup,
    note: note,
    createdAt: new Date().toISOString()
  };

  sheet.appendRow([
    order.id,
    order.name,
    order.milk,
    order.syrup,
    order.note,
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
  const spreadsheetId = getRequiredProperty_(
    "SPREADSHEET_ID",
    "Set the SPREADSHEET_ID script property before deploying."
  );
  const sheetName = getOptionalProperty_("SHEET_NAME", DEFAULT_SHEET_NAME);
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["id", "name", "milk", "syrup", "note", "createdAt"]);
  }

  return sheet;
}

function getAction_(e) {
  return (e && e.parameter && e.parameter.action) || "list";
}

function validateOrderInput_(name, milk, syrup, note) {
  if (!name) {
    throw new Error("Please enter a name.");
  }

  if (VALID_MILKS.indexOf(milk) === -1) {
    throw new Error("Milk selection is not valid.");
  }

  if (VALID_SYRUPS.indexOf(syrup) === -1) {
    throw new Error("Syrup selection is not valid.");
  }

  if (note.length > NOTE_LIMIT) {
    throw new Error("Special requests must be 160 characters or fewer.");
  }
}

function validateClearAllToken_(providedToken) {
  const configuredToken = getRequiredProperty_(
    "CLEAR_ALL_TOKEN",
    "Set the CLEAR_ALL_TOKEN script property before deploying."
  );

  if (!providedToken) {
    throw new Error("An admin token is required to clear all orders.");
  }

  if (providedToken !== configuredToken) {
    throw new Error("Admin token is invalid.");
  }
}

function isStoredOrderValid_(order) {
  return (
    order.id &&
    order.name &&
    order.createdAt &&
    VALID_MILKS.indexOf(order.milk) !== -1 &&
    VALID_SYRUPS.indexOf(order.syrup) !== -1 &&
    order.note.length <= NOTE_LIMIT
  );
}

function getRequiredProperty_(key, errorMessage) {
  const value = getOptionalProperty_(key, "");

  if (!value) {
    throw new Error(errorMessage);
  }

  return value;
}

function getOptionalProperty_(key, fallbackValue) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  return value ? String(value).trim() : fallbackValue;
}

function sanitizeText_(value) {
  return String(value || "").trim();
}

function withLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
