const form = document.getElementById("quote");
const selectedMenu = document.getElementById("selected-menu");
const eventDate = form.elements.date;
const guestCount = form.elements.guests;
const choices = document.getElementById("quote-choices");
const choiceGroups = document.getElementById("choice-groups");
const choiceSummary = document.getElementById("choice-summary");
const choiceSummaryTitle = document.getElementById("choice-summary-title");
const choiceSummaryList = document.getElementById("choice-summary-list");
const choiceNotice = document.getElementById("quote-choice-notice");
const quoteSubmit = document.getElementById("quote-submit");
const dateError = document.getElementById("quote-date-error");
const estimate = document.getElementById("quote-estimate");
const estimateBreakdown = document.getElementById("quote-estimate-breakdown");
const estimateTotal = document.getElementById("quote-estimate-total");
const result = document.getElementById("quote-result");
const resultTitle = document.getElementById("quote-result-title");
const messageField = document.getElementById("quote-message");
const whatsappLink = document.getElementById("whatsapp");
const quoteCard = document.getElementById("whatsapp-card");
const menuSelections = new Map();
let attemptedSubmit = false;
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

function showDateError(message) {
  eventDate.setCustomValidity(message);
  eventDate.setAttribute("aria-invalid", message ? "true" : "false");
  if (dateError.textContent !== message) dateError.textContent = message;
  dateError.hidden = !message;
}

function rejectPastDate(clear = false) {
  const minDate = updateMinimumDate();
  if (!eventDate.value || eventDate.value >= minDate) return false;

  if (clear) eventDate.value = "";
  showDateError("A data escolhida já passou. Selecione hoje ou uma data futura.");
  return true;
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

function addIssue(items, message, target, focusTarget = target) {
  const item = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = message;
  button.addEventListener("click", () => {
    focusTarget.focus({ preventScroll: true });
    target.scrollIntoView({ block: "center" });
  });
  item.append(button);
  items.push(item);
}

function updateChoiceSummary() {
  const missingItems = [];
  if (attemptedSubmit) {
    if (!selectedMenu.value) addIssue(missingItems, "Selecione um cardápio.", selectedMenu);
    if (!eventDate.value || !eventDate.validity.valid) {
      addIssue(missingItems, dateError.textContent || "Informe a data do evento.", eventDate);
    }
    if (!guestCount.validity.valid || (selectedMenu.value && !currentEstimate())) {
      addIssue(missingItems, "Informe a quantidade de convidados em número inteiro, a partir de 1.", guestCount);
    }
    const location = form.elements.location;
    if (!location.value.trim()) addIssue(missingItems, "Informe o bairro ou local do evento.", location);
  }
  let totalMissing = 0;

  for (const group of choiceGroups.querySelectorAll("fieldset")) {
    const missing = Math.max(0, Number(group.dataset.requiredCount) - group.querySelectorAll("input:checked").length);
    totalMissing += missing;
    group.classList.toggle("choice-error", attemptedSubmit && missing > 0);
    if (attemptedSubmit && missing > 0) {
      addIssue(missingItems, group.dataset.title + ": " + missingChoiceText(missing), group,
        group.querySelector("input:not(:checked):not(:disabled)"));
    }
  }
  choiceSummaryList.replaceChildren(...missingItems);
  choiceSummary.hidden = missingItems.length === 0;
  const notice = totalMissing === 1 ? "Falta 1 opção para continuar." :
    totalMissing > 1 ? "Faltam " + totalMissing + " opções para continuar." : "";
  if (choiceNotice.textContent !== notice) choiceNotice.textContent = notice;
  choiceNotice.hidden = !notice || !choiceSummary.hidden;
  const buttonText = totalMissing || missingItems.length ? "Ver o que falta" : "Preparar mensagem";
  if (quoteSubmit.textContent !== buttonText) quoteSubmit.textContent = buttonText;
  return totalMissing === 0 && missingItems.length === 0;
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
    feedback.textContent = missing ? missingChoiceText(missing) : "Escolhas completas (" + count + " de " + limit + "). Para trocar, desmarque uma opção.";
    for (const checkbox of checkboxes) {
      checkbox.disabled = !checkbox.checked && count >= limit;
    }
    return picked;
  }

  refreshChoices();
  fieldset.addEventListener("change", () => {
    const picked = refreshChoices();
    selections.set(title, new Set(picked.map(checkbox => checkbox.value)));
    updateChoiceSummary();
    result.hidden = true;
  });
  choiceGroups.append(fieldset);
}

function showChoices() {
  choiceSummary.hidden = true;
  choiceSummaryList.replaceChildren();
  choiceGroups.replaceChildren();
  choices.hidden = !selectedMenu.value;
  if (selectedMenu.value) {
    const menu = document.getElementById(selectedMenu.value);
    if (!menuSelections.has(menu.id)) menuSelections.set(menu.id, new Map());
    const selections = menuSelections.get(menu.id);

    for (const section of menu.querySelectorAll("[data-choice-limit]")) {
      addChoiceGroup(section, selections);
    }
    addChoiceGroup(document.getElementById("juice-choices"), selections);
  }
  updateChoiceSummary();
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
rejectPastDate(true);
window.addEventListener("pageshow", () => {
  rejectPastDate(true);
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
  if (!rejectPastDate()) showDateError("");
});
eventDate.addEventListener("change", () => {
  if (!rejectPastDate(true) && eventDate.value) showDateError("");
  if (attemptedSubmit) updateChoiceSummary();
  result.hidden = true;
});
form.addEventListener("input", event => {
  result.hidden = true;
  if (attemptedSubmit && event.target.type !== "checkbox" && event.target !== selectedMenu) updateChoiceSummary();
});

const dateInquiry = document.getElementById("date-inquiry");
dateInquiry.addEventListener("click", () => {
  const date = eventDate.value;
  const message = date && date >= updateMinimumDate() && eventDate.validity.valid
    ? "Olá, Chefe Valdo! Gostaria de consultar a disponibilidade para " + date.split("-").reverse().join("/") + "."
    : "Olá, Chefe Valdo! Gostaria de consultar uma data para meu evento.";
  dateInquiry.href = "https://wa.me/5585989765643?text=" + encodeURIComponent(message);
});

form.addEventListener("submit", event => {
  event.preventDefault();

  result.hidden = true;
  rejectPastDate(true);
  attemptedSubmit = true;
  if (!updateChoiceSummary()) {
    choiceSummaryTitle.focus({ preventScroll: true });
    choiceSummary.scrollIntoView({ block: "center" });
    return;
  }

  if (!form.reportValidity()) return;

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
