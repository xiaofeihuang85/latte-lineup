const STORAGE_KEY = "latte-lineup-orders";
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
const emptyStateTemplate = document.getElementById("empty-state-template");
const milkOrder = getOptionValues(milkSelect);
const syrupOrder = getOptionValues(syrupSelect);

let orders = loadOrders();

renderOrders();

form.addEventListener("submit", (event) => {
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

  orders.push({
    id: crypto.randomUUID(),
    name,
    milk,
    syrup,
    note
  });

  persistOrders();
  renderOrders();
  form.reset();
  nameInput.focus();
  setMessage(`${name} added to the latte list.`, "success");
});

clearOrdersButton.addEventListener("click", () => {
  if (!orders.length) {
    setMessage("There are no orders to clear.", "error");
    return;
  }

  orders = [];
  persistOrders();
  renderOrders();
  setMessage("All orders cleared.", "success");
});

groupedOrders.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-order-id]");

  if (!button) {
    return;
  }

  const orderId = button.dataset.orderId;
  const match = orders.find((order) => order.id === orderId);
  orders = orders.filter((order) => order.id !== orderId);
  persistOrders();
  renderOrders();

  if (match) {
    setMessage(`${match.name} removed from the latte list.`, "success");
  }
});

function loadOrders() {
  try {
    const savedValue = localStorage.getItem(STORAGE_KEY);

    if (!savedValue) {
      return [];
    }

    const parsed = JSON.parse(savedValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizeOrder).filter(isValidOrder);
  } catch (error) {
    console.error("Unable to read saved orders.", error);
    return [];
  }
}

function persistOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function isValidOrder(order) {
  return Boolean(
    order &&
    typeof order.id === "string" &&
    typeof order.name === "string" &&
    order.name &&
    (typeof order.note === "undefined" || typeof order.note === "string") &&
    typeof order.milk === "string" &&
    order.milk &&
    typeof order.syrup === "string" &&
    order.syrup
  );
}

function normalizeOrder(order) {
  return {
    ...order,
    name: typeof order.name === "string" ? order.name.trim() : "",
    milk: typeof order.milk === "string" ? order.milk.trim() : "",
    syrup: typeof order.syrup === "string" ? order.syrup.trim() : "",
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

  if (!orders.length) {
    groupedOrders.append(emptyStateTemplate.content.cloneNode(true));
    return;
  }

  const grouped = groupOrders(orders);
  const milkGroups = sortGroupKeys(grouped, milkOrder);

  milkGroups.forEach((milk) => {
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
    const syrupGroupsInOrder = sortGroupKeys(syrupGroups, syrupOrder);

    syrupGroupsInOrder.forEach((syrup) => {
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

function getOptionValues(select) {
  return Array.from(select.options)
    .map((option) => option.value.trim())
    .filter(Boolean);
}

function sortGroupKeys(groups, preferredOrder) {
  const preferredPositions = new Map(
    preferredOrder.map((value, index) => [value, index])
  );

  return Object.keys(groups).sort((left, right) => {
    const leftPosition = preferredPositions.get(left);
    const rightPosition = preferredPositions.get(right);

    if (typeof leftPosition === "number" && typeof rightPosition === "number") {
      return leftPosition - rightPosition;
    }

    if (typeof leftPosition === "number") {
      return -1;
    }

    if (typeof rightPosition === "number") {
      return 1;
    }

    return left.localeCompare(right);
  });
}

function createInfoState(message) {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";

  const text = document.createElement("p");
  text.textContent = message;

  wrapper.append(text);
  return wrapper;
}
