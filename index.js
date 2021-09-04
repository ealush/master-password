const $form = document.querySelector("form.master-strings");
const $inputLength = $form.querySelector("form input.length");
const $btnAdd = $form.querySelector("button.add");
const $strContainer = $form.querySelector(".str-container");
const $inputResult = document.querySelector(".result input");

const CLEAR_OUTPUT_TIMEOUT_MS = 1000 * 30;
let clearOutputTimeout;

const newInput = () => {
  const label = document.createElement("label");
  label.classList.add("str");
  label.innerHTML = `<span class="input-wrapper">
      <input type="password"/>
      <button class="toggle-reveal" type="button">🕶</button>
    </span>
    <button class="delete">&times;</button>
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
    handleClear()
    return;
  }

  clearOutputTimeout = setTimeout(() => {
    handleClear()
  }, CLEAR_OUTPUT_TIMEOUT_MS);
};

addInput();

vent($btnAdd).on("click", addInput);

function handleClear() {
  setInputValue("");
  Array.from(document.querySelectorAll("label.str")).forEach((n) =>
    n.remove()
  );
  addInput();
}

const removeLabel = (target) => {
  let next =
    target.parentElement.previousElementSibling ||
    target.parentElement.nextElementSibling;
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
  .on("submit", (e) => {
    e.preventDefault();

    const values = [...$form.querySelectorAll("input")].map(
      ({ value }) => value
    );

    vent($inputResult).trigger("focus");

    sendMessage(values);
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

const sendMessage = (msg) => {
  try {
    navigator.serviceWorker.controller.postMessage(msg);
  } catch (e) {
    console.error(e);
  }
};

(async () => {
  try {
    await navigator.serviceWorker.register("./sw.js", {
      updateViaCache: "none",
    });

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
function copyResult(target) {
  target.select();
  document.execCommand("copy");
  setClearResult(true);
}
