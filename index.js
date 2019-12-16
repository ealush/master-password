const $form = document.querySelector('form.master-strings');
const $btnAdd = $form.querySelector('button.add');
const $inputResult = document.querySelector('input.result');

const newInput = () => {
    const label = document.createElement('label');
    label.classList.add('str');
    label.innerHTML = '<input type="text"/><button class="delete">&times;</button>';
    return label;
}

const addInput = () => {
    $form.appendChild(newInput());
};

addInput();

vent($btnAdd).on('click', addInput);

vent($form).on('click', '.delete', (e) => {
    const $btn = e.target;
    const $label = $btn.closest('label');
    $label.remove();
});

vent($form).on('submit', (e) => {
    e.preventDefault();

    const values = [...$form.querySelectorAll('input')].map(({ value }) => value);

    sendMessage(values);
});

vent($inputResult).on('click', ({ target }) => {
    target.select();
    document.execCommand('copy');
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
        });
})()
