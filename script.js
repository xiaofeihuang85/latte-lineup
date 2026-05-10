const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyq9ujfehDZn2bEI1r4gRbFFmJhuLAHa-wpbD_nw_518hWxhias9hqF7eizGEdRsar9Pw/exec";

const milkOrder = ["2%", "2% lactose free", "soy", "oat"];
const syrupOrder = [
  "pumpkin pie",
  "pumpkin pie sugar free",
  "peanut butter cup",
  "bourbon caramel",
  "brown sugar cinnamon",
  "peppermint sugar free"
];

const form = document.getElementById("order-form");
const nameInput = document.getElementById("name");
const milkSelect = document.getElementById("milk");
const syrupSelect = document.getElementById("syrup");
const formMessage = document.getElementById("form-message");
const groupedOrders = document.getElementById("grouped-orders");
const orderCount = document.getElementById("order-count");
const clearOrdersButton = document.getElementById("clear-orders");
const refreshOrdersButton = document.getElementById("refresh-orders");
const emptyStateTemplate = document.getElementById("empty-state-template");

let orders = [];
let loadingOrders = false;

initialize();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const milk = milkSelect.value;
  const syrup = syrupSelect.value;

  if (!name || !milk || !syrup) {
    setMessage("Please enter a name and choose both a milk and syrup.", "error");
    return;
  }

  if (!isConfigured()) {
    setMessage("Add your Apps Script URL in script.js before using the shared order list.", "error");
    return;
  }

  try {
    setBusyState(true);
    await postToApi("add", { name, milk, syrup });
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

  try {
    setBusyState(true);
    await postToApi("clear");
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

  if (!button) {
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
  renderOrders();

  if (!isConfigured()) {
    setMessage("Add your Apps Script URL in script.js to connect this page to Google Sheets.", "error");
    return;
  }

  await fetchOrders();
}

function isConfigured() {
  return APPS_SCRIPT_URL !== "https://script.google.com/macros/s/AKfycbyq9ujfehDZn2bEI1r4gRbFFmJhuLAHa-wpbD_nw_518hWxhias9hqF7eizGEdRsar9Pw/exec";
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
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Unable to load orders from Google Sheets.");
    }

    orders = Array.isArray(payload.orders) ? payload.orders.filter(isValidOrder) : [];
    renderOrders();

    if (successMessage) {
      setMessage(successMessage, "success");
    } else {
      setMessage("Connected to Google Sheets.", "success");
    }
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    loadingOrders = false;
    setBusyState(false);
  }
}

async function postToApi(action, data = {}) {
  const body = new URLSearchParams({
    action,
    ...data
  });

  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body
  });

  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Request to Google Sheets failed.");
  }

  return payload;
}

function setBusyState(isBusy) {
  form.querySelectorAll("input, select, button").forEach((element) => {
    element.disabled = isBusy;
  });
  refreshOrdersButton.disabled = isBusy;
}

function isValidOrder(order) {
  return Boolean(
    order &&
    typeof order.id === "string" &&
    typeof order.name === "string" &&
    milkOrder.includes(order.milk) &&
    syrupOrder.includes(order.syrup)
  );
}

function setMessage(message, tone) {
  formMessage.textContent = message;
  formMessage.className = `form-message ${tone}`;
}

function renderOrders() {
  groupedOrders.replaceChildren();
  orderCount.textContent = `${orders.length} order${orders.length === 1 ? "" : "s"}`;

  if (!isConfigured()) {
    groupedOrders.append(createInfoState("Google Sheets is not connected yet. Follow the README setup steps, then paste your Apps Script web app URL into script.js."));
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

          const nameText = document.createElement("span");
          nameText.textContent = order.name;

          const removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.className = "remove-button";
          removeButton.dataset.orderId = order.id;
          removeButton.setAttribute("aria-label", `Remove ${order.name}`);
          removeButton.textContent = "Remove";

          nameItem.append(nameText, removeButton);
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
