const $form = document.querySelector('form.master-strings');
const $inputLength =$form.querySelector('form input.length');
const $btnAdd = $form.querySelector('button.add');
const $strContainer = $form.querySelector('.str-container');
const $inputResult = document.querySelector('input.result');

const CLEAR_OUTPUT_TIMEOUT_MS = 1000 * 30;
let clearOutputTimeout;

const newInput = () => {
    const label = document.createElement('label');
    label.classList.add('str');
    label.innerHTML = '<input type="text"/><button class="delete">&times;</button>';
    return label;
}

const addInput = () => {
    const $inputWrapper = newInput();
    $strContainer.appendChild($inputWrapper);
    $inputWrapper.querySelector('input').focus();
};

const setClearResult = (immediate = false) => {
    clearTimeout(clearOutputTimeout);

    if (immediate) {
        $inputResult.value = '';
        return;
    }

    clearOutputTimeout = setTimeout(() => {
        $inputResult.value = '';
    }, CLEAR_OUTPUT_TIMEOUT_MS)
}

addInput();

vent($btnAdd).on('click', addInput);

const removeLabel = ({ target }) => {
    let next = target.parentElement.previousElementSibling
        || target.parentElement.nextElementSibling;
    target.parentElement.remove();

    if (next) {
        next.focus();
    }

    setClearResult(/*immediate:*/true);
};

const onArrowDown = (target) => {
    if (target.parentElement.nextElementSibling) {
        target.parentElement.nextElementSibling.focus();
        return;
    }

    if (target.value) {
        addInput();
    }
}

const onArrowUp = (target) => {
    if (target.parentElement.previousElementSibling) {
        target.parentElement.previousElementSibling.focus();
        return;
    }

    $inputLength.focus();
}

vent($form)
    .on('click', '.delete', removeLabel)
    .on('keyup', '.str input', (e) => {
        if ([e.key, e.code].includes('Escape')) {
            removeLabel(e);
        } else if ([e.key, e.code].includes('ArrowDown')) {
            onArrowDown(e.target);
        } else if ([e.key, e.code].includes('ArrowUp')) {
            onArrowUp(e.target);
        }
    })
    .on('submit', (e) => {
        e.preventDefault();

        const values = [...$form.querySelectorAll('input')].map(({ value }) => value);

        sendMessage(values);
    });

vent($inputResult).on('click', ({ target }) => {
    target.select();
    document.execCommand('copy');
    setClearResult();
});

const sendMessage = (msg) => {
    navigator.serviceWorker.controller.postMessage(msg);
};

(async () => {
    await navigator.serviceWorker.register('./sw.js', {
        updateViaCache: 'none'
    });

    vent(navigator.serviceWorker)
        .on('message', ({ data }) => {
            $inputResult.value = data;
            setClearResult();
        });
})()
