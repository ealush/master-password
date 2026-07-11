const form = document.querySelector(".master-strings");
const inputLength = form.querySelector(".length");
const btnAdd = document.querySelector(".add");
const strContainer = form.querySelector(".str-container");
const resultOutput = document.querySelector(".result-output");
const resultText = resultOutput.querySelector(".password");
const toast = document.querySelector(".toast");

const CLEAR_OUTPUT_TIMEOUT_MS = 30_000;
let clearOutputTimeout;
let toastTimeout;

function newInput() {
  const label = document.createElement("label");
  label.className = "str";
  label.innerHTML = `
    <span class="row-number" aria-hidden="true"></span>
    <span class="input-wrapper">
      <input class="secret-input" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="Secret ingredient" />
      <button class="toggle-reveal" type="button" aria-label="Reveal secret" aria-pressed="false">🕶️</button>
    </span>
    <button class="delete" type="button" aria-label="Remove secret">×</button>`;
  return label;
}

function renumberInputs() {
  [...strContainer.querySelectorAll(".str")].forEach((row, index) => {
    row.querySelector(".row-number").textContent = String(index + 1).padStart(2, "0");
    row.querySelector(".secret-input").setAttribute("aria-label", `Secret ingredient ${index + 1}`);
  });
}

function addInput({ focus = true } = {}) {
  const row = newInput();
  strContainer.appendChild(row);
  renumberInputs();
  if (focus) requestAnimationFrame(() => row.querySelector("input").focus());
}

function setInputValue(value) {
  resultText.textContent = value;
  resultOutput.classList.toggle("has-result", Boolean(value));
  resultOutput.disabled = !value;
}

function handleClear({ resetInputs = true } = {}) {
  clearTimeout(clearOutputTimeout);
  setInputValue("");
  if (resetInputs) {
    strContainer.replaceChildren();
    addInput();
  }
}

function scheduleClear() {
  clearTimeout(clearOutputTimeout);
  clearOutputTimeout = setTimeout(() => handleClear(), CLEAR_OUTPUT_TIMEOUT_MS);
}

function showToast(message) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimeout = setTimeout(() => toast.classList.remove("visible"), 1600);
}

function removeRow(row) {
  const rows = [...strContainer.querySelectorAll(".str")];
  const index = rows.indexOf(row);
  if (rows.length === 1) {
    row.querySelector("input").value = "";
    row.querySelector("input").focus();
  } else {
    row.remove();
    const remaining = [...strContainer.querySelectorAll(".secret-input")];
    (remaining[Math.min(index, remaining.length - 1)] || inputLength).focus();
  }
  renumberInputs();
  handleClear({ resetInputs: false });
}

function moveBetweenRows(input, direction) {
  const row = input.closest(".str");
  const sibling = direction === "down" ? row.nextElementSibling : row.previousElementSibling;
  if (sibling) return sibling.querySelector("input").focus();
  if (direction === "up") return inputLength.focus();
  if (input.value) addInput();
}

async function hash(values) {
  const data = new TextEncoder().encode(values.join());
  const buffer = await crypto.subtle.digest("SHA-512", data);
  return btoa([...new Uint8Array(buffer)].map((byte) => byte.toString(35).padStart(2, "0")).join(""))
    .substr(0, values[0]);
}

async function generatePassword() {
  const length = Math.max(4, Math.min(128, Number.parseInt(inputLength.value, 10) || 15));
  inputLength.value = length;
  const secrets = [...strContainer.querySelectorAll(".secret-input")].map(({ value }) => value);
  if (!secrets.some(Boolean)) {
    strContainer.querySelector("input").focus();
    showToast("Add at least one secret");
    return;
  }
  setInputValue(await hash([String(length), ...secrets]));
  scheduleClear();
  resultOutput.focus();
}

async function copyResult() {
  if (!resultText.textContent) return;
  try {
    await navigator.clipboard.writeText(resultText.textContent);
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(resultText);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
    selection.removeAllRanges();
  }
  showToast("Copied — secrets cleared");
  handleClear();
}

btnAdd.addEventListener("click", () => addInput());
form.addEventListener("submit", (event) => { event.preventDefault(); generatePassword(); });
resultOutput.addEventListener("click", copyResult);

form.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".delete");
  if (deleteButton) return removeRow(deleteButton.closest(".str"));

  const revealButton = event.target.closest(".toggle-reveal");
  if (!revealButton) return;
  const input = revealButton.closest(".input-wrapper").querySelector("input");
  const reveal = input.type === "password";
  input.type = reveal ? "text" : "password";
  revealButton.textContent = reveal ? "👓" : "🕶️";
  revealButton.setAttribute("aria-label", reveal ? "Hide secret" : "Reveal secret");
  revealButton.setAttribute("aria-pressed", String(reveal));
  input.focus({ preventScroll: true });
});

form.addEventListener("keydown", (event) => {
  if (!event.target.matches(".secret-input")) return;
  if (event.key === "Escape") { event.preventDefault(); removeRow(event.target.closest(".str")); }
  if (event.key === "ArrowDown") { event.preventDefault(); moveBetweenRows(event.target, "down"); }
  if (event.key === "ArrowUp") { event.preventDefault(); moveBetweenRows(event.target, "up"); }
});

addInput({ focus: false });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(console.error);
}
