const $form = document.querySelector("form.master-strings");
const $inputLength = $form.querySelector("input.length");
const $lengthSlider = $form.querySelector("input.length-slider");
const $btnAdd = $form.querySelector("button.add");
const $strContainer = $form.querySelector(".str-container");
const $inputResult = document.querySelector(".result input");
const $copyResult = document.querySelector("button.copy-result");
const $themeToggle = document.querySelector("button.theme-toggle");

const CLEAR_OUTPUT_TIMEOUT_MS = 1000 * 30;
let clearOutputTimeout;
let activeServiceWorker = null;

const applyTheme = (theme) => {
  const isLight = theme === "light";
  document.body.classList.toggle("light", isLight);
  $themeToggle.innerText = isLight ? "🌙" : "☀️";
};

const storedTheme = localStorage.getItem("theme") || "dark";
applyTheme(storedTheme);

$themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("light") ? "dark" : "light";
  applyTheme(nextTheme);
  localStorage.setItem("theme", nextTheme);
});

const syncLengthInputs = (value) => {
  const numeric = Math.max(4, Math.min(40, Number(value) || 15));
  $inputLength.value = numeric;
  $lengthSlider.value = numeric;
};

syncLengthInputs($inputLength.value);

vent($lengthSlider).on("input", ({ target }) => {
  syncLengthInputs(target.value);
});

vent($inputLength).on("input", ({ target }) => {
  syncLengthInputs(target.value);
});

const newInput = () => {
  const label = document.createElement("label");
  label.classList.add("str");
  label.innerHTML = `<span class="input-wrapper">
      <input type="password" placeholder="phrase" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"/>
      <button class="toggle-reveal" type="button">🕶</button>
    </span>
    <button class="delete" type="button">&times;</button>
  `;
  return label;
};

const addInput = () => {
  const $inputWrapper = newInput();
  $strContainer.appendChild($inputWrapper);
  requestAnimationFrame(() => {
    $inputWrapper.querySelector("input").focus();
  });
};

const setClearResult = (immediate = false) => {
  clearTimeout(clearOutputTimeout);

  if (immediate) {
    handleClear();
    return;
  }

  clearOutputTimeout = setTimeout(() => {
    handleClear();
  }, CLEAR_OUTPUT_TIMEOUT_MS);
};

addInput();
addInput();

vent($btnAdd).on("click", addInput);

function handleClear() {
  setInputValue("");
  Array.from(document.querySelectorAll("label.str")).forEach((n) => n.remove());
  addInput();
}

const removeLabel = (target) => {
  let next = target.parentElement.previousElementSibling || target.parentElement.nextElementSibling;
  target.parentElement.remove();

  if (next) {
    next.focus();
  }

  setClearResult(/*immediate:*/ true);
};

const onArrowDown = (target) => {
  const label = target.closest("label");
  if (label.nextElementSibling) {
    label.nextElementSibling.focus();
    return;
  }

  if (target.value) {
    addInput();
  }
};

const onArrowUp = (target) => {
  const label = target.closest("label");
  if (label.previousElementSibling) {
    label.previousElementSibling.focus();
    return;
  }

  $inputLength.focus();
};

vent($form)
  .on("click", ".delete", ({ target }) => removeLabel(target))
  .on("keyup", ".str input", (e) => {
    if ([e.key, e.code].includes("Escape")) {
      removeLabel(e.target);
    } else if ([e.key, e.code].includes("ArrowDown")) {
      onArrowDown(e.target);
    } else if ([e.key, e.code].includes("ArrowUp")) {
      onArrowUp(e.target);
    }
  })
  .on("submit", async (e) => {
    e.preventDefault();

    const values = [$inputLength.value, ...$form.querySelectorAll("label.str input")].map(({ value }) => value);

    vent($inputResult).trigger("focus");

    await sendMessage(values);
  })
  .on("click", ".toggle-reveal", ({ target }) => {
    const wrapper = target.closest(".input-wrapper");
    const input = wrapper.querySelector("input");

    const shouldHide = input.type === "text";

    if (shouldHide) {
      target.innerText = "🕶";
      input.type = "password";
    } else {
      target.innerText = "👓";
      input.type = "text";
    }
  });

vent($inputResult).on("click", ({ target }) => {
  copyResult(target);
});

vent($inputResult).on("keyup", (e) => {
  if ([e.key, e.code].includes("Enter")) {
    copyResult(e.target);
  }
});

vent($copyResult).on("click", () => {
  copyResult($inputResult);
});

const hashLocally = async (value) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.join());
  const buffer = await crypto.subtle.digest("SHA-512", data);
  return btoa(
    Array.from(new Uint8Array(buffer))
      .map((buff) => buff.toString(35).padStart(2, "0"))
      .join("")
  ).substr(0, value[0]);
};

const sendMessage = async (msg) => {
  try {
    if (activeServiceWorker) {
      activeServiceWorker.postMessage(msg);
      return;
    }

    const localResult = await hashLocally(msg);
    setInputValue(localResult);
    setClearResult();
  } catch (e) {
    console.error(e);
  }
};

(async () => {
  try {
    if (!navigator.serviceWorker) {
      return;
    }

    const registration = await navigator.serviceWorker.register("./sw.js", {
      updateViaCache: "none",
    });

    await navigator.serviceWorker.ready;

    activeServiceWorker = navigator.serviceWorker.controller || registration.active || registration.waiting;

    vent(navigator.serviceWorker).on("message", ({ data }) => {
      setInputValue(data);
      setClearResult();
    });
  } catch (e) {
    console.error(e);
  }
})();

function setInputValue(value) {
  $inputResult.value = value;
}

async function copyResult(target) {
  const value = target.value;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
    } else {
      target.removeAttribute("readonly");
      target.focus();
      target.setSelectionRange(0, value.length);
      document.execCommand("copy");
      target.setAttribute("readonly", "readonly");
      window.getSelection()?.removeAllRanges();
    }
  } catch (e) {
    console.error(e);
  }

  setClearResult(true);
}
