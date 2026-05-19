const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxYdY9rWDEQRcBIMzFtWY7pUy-Rwbf5Q0xdT5pEFfUDsRx2V55kN441ilQO0OnVsD-Q/exec";
const APPS_SCRIPT_URL_PLACEHOLDER = "https://script.google.com/macros/s/AKfycbxYdY9rWDEQRcBIMzFtWY7pUy-Rwbf5Q0xdT5pEFfUDsRx2V55kN441ilQO0OnVsD-Q/exec";

const milkOrder = ["2%", "2% lactose free", "soy", "oat"];
const syrupOrder = [
  "pumpkin pie",
  "pumpkin pie sugar free",
  "peanut butter cup",
  "bourbon caramel",
  "brown sugar cinnamon",
  "peppermint sugar free"
];

const NOTE_LIMIT = 160;

const form = document.getElementById("order-form");
const nameInput = document.getElementById("name");
const milkSelect = document.getElementById("milk");
const syrupSelect = document.getElementById("syrup");
const noteInput = document.getElementById("note");
const formMessage = document.getElementById("form-message");
const groupedOrders = document.getElementById("grouped-orders");
const orderCount = document.getElementById("order-count");
const clearOrdersButton = document.getElementById("clear-orders");
const refreshOrdersButton = document.getElementById("refresh-orders");
const emptyStateTemplate = document.getElementById("empty-state-template");

let orders = [];
let loadingOrders = false;
let loadErrorMessage = "";

renderOrders();
initialize();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const milk = milkSelect.value;
  const syrup = syrupSelect.value;
  const note = noteInput.value.trim();

  if (!name || !milk || !syrup) {
    setMessage("Please enter a name and choose both a milk and syrup.", "error");
    return;
  }

  if (note.length > NOTE_LIMIT) {
    setMessage(`Special requests must be ${NOTE_LIMIT} characters or fewer.`, "error");
    return;
  }

  if (!isConfigured()) {
    setMessage("Add your Apps Script URL in script.js before using the shared order list.", "error");
    return;
  }

  try {
    setBusyState(true);
    await postToApi("add", { name, milk, syrup, note });
    form.reset();
    nameInput.focus();
    await fetchOrders(`${name} added to the latte list.`);
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setBusyState(false);
  }
});

clearOrdersButton.addEventListener("click", async () => {
  if (!orders.length) {
    setMessage("There are no orders to clear.", "error");
    return;
  }

  if (!isConfigured()) {
    setMessage("Add your Apps Script URL in script.js before using the shared order list.", "error");
    return;
  }

  const adminToken = window.prompt("Enter the admin clear-all token to remove every order:");

  if (adminToken === null) {
    setMessage("Clear all canceled.", "error");
    return;
  }

  if (!adminToken.trim()) {
    setMessage("An admin token is required to clear all orders.", "error");
    return;
  }

  try {
    setBusyState(true);
    await postToApi("clear", { adminToken: adminToken.trim() });
    await fetchOrders("All orders cleared.");
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setBusyState(false);
  }
});

refreshOrdersButton.addEventListener("click", async () => {
  if (!isConfigured()) {
    setMessage("Add your Apps Script URL in script.js before using the shared order list.", "error");
    return;
  }

  await fetchOrders("Orders refreshed.");
});

groupedOrders.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-order-id]");

  if (!button || !isConfigured()) {
    return;
  }

  const orderId = button.dataset.orderId;
  const match = orders.find((order) => order.id === orderId);

  try {
    setBusyState(true);
    await postToApi("delete", { id: orderId });
    await fetchOrders(match ? `${match.name} removed from the latte list.` : "Order removed.");
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setBusyState(false);
  }
});

async function initialize() {
  if (!isConfigured()) {
    setMessage("Add your Apps Script URL in script.js to connect this page to Google Sheets.", "error");
    return;
  }

  await fetchOrders("Connected to Google Sheets.");
}

function isConfigured() {
  return APPS_SCRIPT_URL && APPS_SCRIPT_URL !== APPS_SCRIPT_URL_PLACEHOLDER;
}

async function fetchOrders(successMessage) {
  if (loadingOrders) {
    return;
  }

  try {
    loadingOrders = true;
    setBusyState(true);

    const response = await fetch(`${APPS_SCRIPT_URL}?action=list`, {
      method: "GET",
      cache: "no-store"
    });

    const payload = await parseJsonResponse(response, "Unable to load orders from Google Sheets.");

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Unable to load orders from Google Sheets.");
    }

    loadErrorMessage = "";
    orders = Array.isArray(payload.orders)
      ? payload.orders.filter(isValidOrder).map(normalizeOrder)
      : [];

    renderOrders();
    setMessage(successMessage || "Connected to Google Sheets.", "success");
  } catch (error) {
    loadErrorMessage = error.message;
    renderOrders();
    setMessage(error.message, "error");
  } finally {
    loadingOrders = false;
    setBusyState(false);
  }
}

async function postToApi(action, data = {}) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: new URLSearchParams({
      action,
      ...data
    })
  });

  const payload = await parseJsonResponse(response, "Request to Google Sheets failed.");

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Request to Google Sheets failed.");
  }

  return payload;
}

async function parseJsonResponse(response, fallbackMessage) {
  try {
    return await response.json();
  } catch (error) {
    throw new Error(fallbackMessage);
  }
}

function setBusyState(isBusy) {
  form.querySelectorAll("input, select, textarea, button").forEach((element) => {
    element.disabled = isBusy;
  });
  refreshOrdersButton.disabled = isBusy;
  groupedOrders.querySelectorAll("button").forEach((button) => {
    button.disabled = isBusy;
  });
}

function isValidOrder(order) {
  return Boolean(
    order &&
    typeof order.id === "string" &&
    typeof order.name === "string" &&
    typeof order.createdAt === "string" &&
    (typeof order.note === "undefined" || typeof order.note === "string") &&
    milkOrder.includes(order.milk) &&
    syrupOrder.includes(order.syrup)
  );
}

function normalizeOrder(order) {
  return {
    ...order,
    note: typeof order.note === "string" ? order.note.trim() : ""
  };
}

function setMessage(message, tone) {
  formMessage.textContent = message;
  formMessage.className = `form-message ${tone}`;
}

function renderOrders() {
  groupedOrders.replaceChildren();
  orderCount.textContent = `${orders.length} order${orders.length === 1 ? "" : "s"}`;

  if (!isConfigured()) {
    groupedOrders.append(
      createInfoState(
        "Google Sheets is not connected yet. Follow the README setup steps, then paste your Apps Script web app URL into script.js."
      )
    );
    return;
  }

  if (loadErrorMessage && !orders.length) {
    groupedOrders.append(createInfoState(loadErrorMessage));
    return;
  }

  if (!orders.length) {
    groupedOrders.append(emptyStateTemplate.content.cloneNode(true));
    return;
  }

  const grouped = groupOrders(orders);

  milkOrder.forEach((milk) => {
    const syrupGroups = grouped[milk];

    if (!syrupGroups) {
      return;
    }

    const milkCard = document.createElement("section");
    milkCard.className = "milk-card";

    const milkHeading = document.createElement("h3");
    milkHeading.textContent = milk;
    milkCard.append(milkHeading);

    const syrupGrid = document.createElement("div");
    syrupGrid.className = "syrup-grid";

    syrupOrder.forEach((syrup) => {
      const names = syrupGroups[syrup];

      if (!names || !names.length) {
        return;
      }

      const syrupCard = document.createElement("article");
      syrupCard.className = "syrup-card";

      const syrupHeading = document.createElement("h4");
      syrupHeading.textContent = `${syrup} (${names.length})`;
      syrupCard.append(syrupHeading);

      const nameList = document.createElement("ul");
      nameList.className = "name-list";

      names
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .forEach((order) => {
          const nameItem = document.createElement("li");
          nameItem.className = "name-pill";

          const orderCopy = document.createElement("div");
          orderCopy.className = "order-copy";

          const nameText = document.createElement("span");
          nameText.className = "order-name";
          nameText.textContent = order.name;
          orderCopy.append(nameText);

          if (order.note) {
            const noteText = document.createElement("span");
            noteText.className = "order-note";
            noteText.textContent = `Special request: ${order.note}`;
            orderCopy.append(noteText);
          }

          const removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.className = "remove-button";
          removeButton.dataset.orderId = order.id;
          removeButton.setAttribute("aria-label", `Remove ${order.name}`);
          removeButton.textContent = "Remove";

          nameItem.append(orderCopy, removeButton);
          nameList.append(nameItem);
        });

      syrupCard.append(nameList);
      syrupGrid.append(syrupCard);
    });

    milkCard.append(syrupGrid);
    groupedOrders.append(milkCard);
  });
}

function groupOrders(orderList) {
  return orderList.reduce((result, order) => {
    if (!result[order.milk]) {
      result[order.milk] = {};
    }

    if (!result[order.milk][order.syrup]) {
      result[order.milk][order.syrup] = [];
    }

    result[order.milk][order.syrup].push(order);
    return result;
  }, {});
}

function createInfoState(message) {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";

  const text = document.createElement("p");
  text.textContent = message;

  wrapper.append(text);
  return wrapper;
}
