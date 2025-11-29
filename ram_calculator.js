const mtsInput = document.getElementById('mts');
const clInput = document.getElementById('cl');
const resultDiv = document.getElementById('result');
const calcBtn = document.getElementById('calcBtn');
const resetBtn = document.getElementById('resetBtn');

function classify(value) {
  resultDiv.className = 'result';

  const v = Number(value);
  let label = '';
  let cssClass = '';

  if (!isFinite(v) || v < 0) {
    return { label: 'Valor inválido', css: '' };
  } 
  else if (v >= 0 && v <= 5) {
    label = 'Excelente'; cssClass = 'c-purple';
  } 
  else if (v > 5 && v < 10) {
    label = 'Ótimo'; cssClass = 'c-blue';
  } 
  else if (v >= 10 && v <= 11) {
    label = 'Ideal'; cssClass = 'c-green';
  } 
  else if (v > 11 && v <= 12) {
    label = 'Aceitável'; cssClass = 'c-yellow';
  } 
  else if (v >= 13 && v < 14) {
    label = 'Lento'; cssClass = 'c-orange';
  } 
  else if (v >= 14 && v < 15) {
    label = 'Muito lento (14–15)'; cssClass = 'c-red1';
  } 
  else if (v >= 15 && v < 16) {
    label = 'Muito lento (15–16)'; cssClass = 'c-red2';
  } 
  else if (v >= 16 && v < 17) {
    label = 'Muito lento (16–17)'; cssClass = 'c-red3';
  } 
  else if (v >= 17) {
    label = 'Inaceitável'; cssClass = 'c-black';
  }

  return { label, css: cssClass };
}

function calculate() {
  const mts = parseFloat(mtsInput.value);
  const cl = parseFloat(clInput.value);

  if (!isFinite(mts) || mts === 0) {
    resultDiv.textContent = 'MTs inválido.';
    resultDiv.className = 'result c-black';
    return;
  }
  if (!isFinite(cl)) {
    resultDiv.textContent = 'CL inválido.';
    resultDiv.className = 'result c-black';
    return;
  }

  const computed = (1 / (mts / 2)) * cl * 1000;
  const rounded = Math.round(computed * 1000) / 1000;

  const { label, css } = classify(rounded);
  resultDiv.classList.add(css);

  // Corrigir contraste
  if (css === 'c-yellow') resultDiv.style.color = '#111';
  else resultDiv.style.color = '#fff';

  resultDiv.innerHTML = `${rounded.toLocaleString('pt-BR')} ns — ${label}`;
}

calcBtn.addEventListener('click', calculate);
[mtsInput, clInput].forEach(i =>
  i.addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); })
);

resetBtn.addEventListener('click', () => {
  mtsInput.value = '';
  clInput.value = '';
  resultDiv.className = 'result muted';
  resultDiv.textContent = 'Insira MTs e CL e clique em Calcular';
  resultDiv.style.color = '';
});
