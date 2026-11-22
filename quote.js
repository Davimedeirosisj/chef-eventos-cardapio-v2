const form = document.getElementById("quote");
const selectedMenu = document.getElementById("selected-menu");
const eventDate = form.elements.date;
const guestCount = form.elements.guests;
const choices = document.getElementById("quote-choices");
const choiceGroups = document.getElementById("choice-groups");
const choiceSummary = document.getElementById("choice-summary");
const choiceSummaryTitle = document.getElementById("choice-summary-title");
const choiceSummaryList = document.getElementById("choice-summary-list");
const estimate = document.getElementById("quote-estimate");
const estimateBreakdown = document.getElementById("quote-estimate-breakdown");
const estimateTotal = document.getElementById("quote-estimate-total");
const result = document.getElementById("quote-result");
const resultTitle = document.getElementById("quote-result-title");
const messageField = document.getElementById("quote-message");
const whatsappLink = document.getElementById("whatsapp");
const quoteCard = document.getElementById("whatsapp-card");
const menuSelections = new Map();
let checkingChoices = false;
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fortalezaCalendar = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit"
});

function updateMinimumDate() {
  const parts = fortalezaCalendar.formatToParts(new Date());
  const date = ["year", "month", "day"].map(type => parts.find(part => part.type === type).value).join("-");
  eventDate.min = date;
  return date;
}

function currentEstimate() {
  if (!selectedMenu.value || !guestCount.value) return null;

  const menu = document.getElementById(selectedMenu.value);
  const price = Number(menu.querySelector("[data-price-cents]").dataset.priceCents);
  const guests = guestCount.valueAsNumber;
  const total = price * guests;

  if (!Number.isSafeInteger(guests) || guests < 1 || !Number.isSafeInteger(total) || total < 1) return null;
  return { guests, unitPrice: currency.format(price / 100), totalPrice: currency.format(total / 100) };
}

function showEstimate() {
  const amount = currentEstimate();
  estimate.hidden = !amount;
  if (!amount) return;

  const people = amount.guests === 1 ? " convidado" : " convidados";
  const breakdown = amount.guests + people + " × " + amount.unitPrice;
  const total = "Total estimado: " + amount.totalPrice;
  if (estimateBreakdown.textContent !== breakdown) estimateBreakdown.textContent = breakdown;
  if (estimateTotal.textContent !== total) estimateTotal.textContent = total;
}

function missingChoiceText(count) {
  return count === 1 ? "Selecione mais 1 opção." : "Selecione mais " + count + " opções.";
}

function updateChoiceSummary() {
  const missingItems = [];

  for (const group of choiceGroups.querySelectorAll("fieldset")) {
    const missing = Number(group.dataset.requiredCount) - group.querySelectorAll("input:checked").length;
    group.classList.toggle("choice-error", checkingChoices && missing > 0);
    if (checkingChoices && missing > 0) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = group.dataset.title + ": " + missingChoiceText(missing);
      button.addEventListener("click", () => {
        group.querySelector("input:not(:checked):not(:disabled)")?.focus({ preventScroll: true });
        group.scrollIntoView({ block: "center" });
      });
      item.append(button);
      missingItems.push(item);
    }
  }
  choiceSummaryList.replaceChildren(...missingItems);
  choiceSummary.hidden = missingItems.length === 0;
  return choiceSummary.hidden;
}

function addChoiceGroup(section, selections) {
  const limit = Number(section.dataset.choiceLimit);
  const title = section.querySelector("h3").textContent;
  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");
  const feedback = document.createElement("p");
  const savedItems = selections.get(title) ?? new Set();

  fieldset.dataset.title = title;
  fieldset.dataset.requiredCount = String(limit);
  feedback.id = "choice-feedback-" + (choiceGroups.childElementCount + 1);
  feedback.className = "choice-feedback";
  feedback.setAttribute("aria-live", "polite");
  fieldset.setAttribute("aria-describedby", feedback.id);
  legend.textContent = title + " · escolha " + limit;
  fieldset.append(legend, feedback);

  for (const item of section.querySelectorAll("li")) {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");

    label.className = "choice-option";
    checkbox.type = "checkbox";
    checkbox.value = item.textContent;
    checkbox.checked = savedItems.has(checkbox.value);
    label.append(checkbox, item.textContent);
    fieldset.append(label);
  }

  const checkboxes = [...fieldset.querySelectorAll("input")];
  function refreshChoices() {
    const picked = checkboxes.filter(checkbox => checkbox.checked);
    const count = picked.length;
    const missing = limit - count;
    feedback.classList.toggle("complete", missing === 0);
    feedback.textContent = missing ? missingChoiceText(missing) : "Escolhas completas (" + count + " de " + limit + ").";
    for (const checkbox of checkboxes) {
      checkbox.disabled = !checkbox.checked && count >= limit;
    }
    return picked;
  }

  refreshChoices();
  fieldset.addEventListener("change", () => {
    const picked = refreshChoices();
    selections.set(title, new Set(picked.map(checkbox => checkbox.value)));
    if (checkingChoices) updateChoiceSummary();
    result.hidden = true;
  });
  choiceGroups.append(fieldset);
}

function showChoices() {
  checkingChoices = false;
  choiceSummary.hidden = true;
  choiceSummaryList.replaceChildren();
  choiceGroups.replaceChildren();
  choices.hidden = !selectedMenu.value;
  if (!selectedMenu.value) return;

  const menu = document.getElementById(selectedMenu.value);
  if (!menuSelections.has(menu.id)) menuSelections.set(menu.id, new Map());
  const selections = menuSelections.get(menu.id);

  for (const section of menu.querySelectorAll("[data-choice-limit]")) {
    addChoiceGroup(section, selections);
  }
  addChoiceGroup(document.getElementById("juice-choices"), selections);
}

for (const link of document.querySelectorAll("[data-open-quote]")) {
  link.addEventListener("click", () => { quoteCard.open = true; });
}

for (const link of document.querySelectorAll("[data-menu]")) {
  link.addEventListener("click", () => {
    quoteCard.open = true;
    if (selectedMenu.value !== link.dataset.menu) {
      selectedMenu.value = link.dataset.menu;
      showChoices();
      showEstimate();
    }
    result.hidden = true;
  });
}

form.hidden = false;
updateMinimumDate();
window.addEventListener("pageshow", () => {
  updateMinimumDate();
  showChoices();
  showEstimate();
});
selectedMenu.addEventListener("change", () => {
  showChoices();
  showEstimate();
  result.hidden = true;
});
guestCount.addEventListener("input", () => {
  guestCount.setCustomValidity("");
  showEstimate();
});
eventDate.addEventListener("input", () => {
  eventDate.setCustomValidity("");
  updateMinimumDate();
});
form.addEventListener("input", () => { result.hidden = true; });

form.addEventListener("submit", event => {
  event.preventDefault();

  const minDate = updateMinimumDate();
  if (eventDate.value < minDate) {
    eventDate.setCustomValidity("Escolha a data de hoje ou uma data futura.");
    eventDate.reportValidity();
    return;
  }

  const amount = currentEstimate();
  if (!amount) {
    guestCount.setCustomValidity("Informe um número válido de convidados.");
    guestCount.reportValidity();
    return;
  }

  const location = form.elements.location.value.trim();
  if (!location) {
    form.elements.location.value = "";
    form.elements.location.reportValidity();
    return;
  }

  checkingChoices = true;
  if (!updateChoiceSummary()) {
    result.hidden = true;
    choiceSummaryTitle.focus({ preventScroll: true });
    choiceSummary.scrollIntoView({ block: "center" });
    return;
  }

  const date = eventDate.value.split("-").reverse().join("/");
  const menu = selectedMenu.selectedOptions[0].textContent;
  const message = [
    "Olá, Chefe Valdo! Gostaria de solicitar um orçamento para um evento.",
    "",
    "Cardápio: " + menu,
    "Data: " + date,
    "Local: " + location,
    "Número de convidados: " + amount.guests,
    "Total estimado: " + amount.totalPrice + " (a confirmar)"
  ];

  for (const fieldset of choiceGroups.querySelectorAll("fieldset")) {
    const checked = [...fieldset.querySelectorAll("input:checked")];
    if (checked.length) {
      message.push(fieldset.dataset.title + ": " + checked.map(checkbox => checkbox.value).join(", "));
    }
  }
  const messageText = message.join("\n");
  messageField.textContent = messageText;
  whatsappLink.href = "https://wa.me/5585989765643?text=" + encodeURIComponent(messageText);
  result.hidden = false;
  resultTitle.focus({ preventScroll: true });
  result.scrollIntoView({ block: "start" });
});

const shareButton = document.getElementById("share-site");
const shareStatus = document.getElementById("share-status");
const shareUrl = document.getElementById("share-url");
const siteUrl = document.querySelector('link[rel="canonical"]').href;

shareButton.hidden = false;
shareButton.addEventListener("click", async () => {
  shareStatus.textContent = "";
  shareUrl.hidden = true;

  if (navigator.share) {
    try {
      await navigator.share({ title: "Chefe Valdo", url: siteUrl });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(siteUrl);
      shareStatus.textContent = "Link copiado.";
      return;
    } catch {
      // The selectable URL also works without clipboard permission.
    }
  }

  shareUrl.value = siteUrl;
  shareUrl.hidden = false;
  shareUrl.focus();
  shareUrl.select();
  shareStatus.textContent = "Copie o link abaixo para compartilhar.";
});
