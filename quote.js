const form = document.getElementById("quote");
const selectedMenu = document.getElementById("selected-menu");
const choices = document.getElementById("quote-choices");
const choiceGroups = document.getElementById("choice-groups");
const result = document.getElementById("quote-result");
const messageField = document.getElementById("quote-message");
const whatsappLink = document.getElementById("whatsapp");

function addChoiceGroup(section) {
  const limit = Number(section.dataset.choiceLimit);
  const title = section.querySelector("h3").textContent;
  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");

  fieldset.dataset.title = title;
  legend.textContent = title + " · até " + limit;
  fieldset.append(legend);

  for (const item of section.querySelectorAll("li")) {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");

    label.className = "choice-option";
    checkbox.type = "checkbox";
    checkbox.value = item.textContent;
    label.append(checkbox, item.textContent);
    fieldset.append(label);
  }

  const checkboxes = [...fieldset.querySelectorAll("input")];
  fieldset.addEventListener("change", () => {
    const count = checkboxes.filter(checkbox => checkbox.checked).length;
    for (const checkbox of checkboxes) {
      checkbox.disabled = !checkbox.checked && count >= limit;
    }
  });
  choiceGroups.append(fieldset);
}

function showChoices() {
  choiceGroups.replaceChildren();
  choices.hidden = !selectedMenu.value;
  if (!selectedMenu.value) return;

  const menu = document.getElementById(selectedMenu.value);
  for (const section of menu.querySelectorAll("[data-choice-limit]")) {
    addChoiceGroup(section);
  }
  addChoiceGroup(document.getElementById("juice-choices"));
}

for (const link of document.querySelectorAll("[data-menu]")) {
  link.addEventListener("click", () => {
    document.getElementById("whatsapp-card").open = true;
    if (selectedMenu.value !== link.dataset.menu) {
      selectedMenu.value = link.dataset.menu;
      showChoices();
    }
    result.hidden = true;
  });
}

form.hidden = false;
selectedMenu.addEventListener("change", showChoices);
form.addEventListener("input", () => { result.hidden = true; });

form.addEventListener("submit", event => {
  event.preventDefault();

  const fields = new FormData(form);
  const location = fields.get("location").trim();
  if (!location) {
    form.elements.location.value = "";
    form.elements.location.reportValidity();
    return;
  }

  const date = fields.get("date").split("-").reverse().join("/");
  const menu = selectedMenu.selectedOptions[0].textContent;
  const message = [
    "Olá, Chefe Valdo! Gostaria de solicitar um orçamento para um evento.",
    "",
    "Cardápio: " + menu,
    "Data: " + date,
    "Local: " + location,
    "Número de convidados: " + fields.get("guests")
  ];

  for (const fieldset of choiceGroups.querySelectorAll("fieldset")) {
    const checked = [...fieldset.querySelectorAll("input:checked")];
    if (checked.length) {
      message.push(fieldset.dataset.title + ": " + checked.map(checkbox => checkbox.value).join(", "));
    }
  }
  messageField.value = message.join("\n");
  whatsappLink.href = "https://wa.me/5585989765643?text=" + encodeURIComponent(messageField.value);
  result.hidden = false;
  messageField.focus();
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
