(() => {
  // elementos
  const mtsNum = document.getElementById('mtsNum');
  const clNum  = document.getElementById('clNum');
  const mtsRange = document.getElementById('mtsRange');
  const clRange  = document.getElementById('clRange');
  const calcBtn = document.getElementById('calcBtn');
  const resultBox = document.getElementById('result');
  const valueDiv = resultBox.querySelector('.value');
  const labelDiv = resultBox.querySelector('.label');
  const clearHistBtn = document.getElementById('clearHistBtn');
  const themeToggle = document.getElementById('themeToggle');

  // chart
  const ctx = document.getElementById('nsChart').getContext('2d');
  const MAX_POINTS = 40;
  let history = JSON.parse(localStorage.getItem('ns_history') || '[]');

  // color stops to form continuous gradient.
  // positions are relative (0..1) along the value axis we consider (0..18)
  // colors chosen to reflect requested palette:
  const colorStops = [
    { pos: 0.0, color: '#7a1fa2' }, // purple (0)
    { pos: 0.28, color: '#1e90ff' }, // blue (~5)
    { pos: 0.56, color: '#28a745' }, // green (~10)
    { pos: 0.62, color: '#ffc107' }, // yellow (~11)
    { pos: 0.72, color: '#ff8c00' }, // orange (~13)
    { pos: 0.78, color: '#ff6347' }, // red1 (~14)
    { pos: 0.83, color: '#ff3b30' }, // red2 (~15)
    { pos: 0.89, color: '#cc0000' }, // red3 (~16)
    { pos: 1.0, color: '#000000' }   // black (>=17)
  ];

  // helpers: hex <-> rgb and interpolation
  function hexToRgb(hex) {
    const h = hex.replace('#','');
    const bigint = parseInt(h.length===3 ? h.split('').map(c=>c+c).join('') : h, 16);
    return [(bigint>>16)&255, (bigint>>8)&255, bigint&255];
  }
  function rgbToHex(r,g,b){
    return '#'+[r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
  }
  function lerp(a,b,t){ return a + (b-a)*t; }

  // map value -> color via stops. valueRange: 0..18 (adjust as needed)
  function getColorForValue(v){
    // clamp negative
    const maxV = 18;
    const minV = 0;
    const clamped = Math.max(minV, Math.min(maxV, v));
    const t = (clamped - minV) / (maxV - minV); // 0..1

    // find neighbor stops
    let a = colorStops[0], b = colorStops[colorStops.length-1];
    for (let i=0;i<colorStops.length-1;i++){
      if (t >= colorStops[i].pos && t <= colorStops[i+1].pos){
        a = colorStops[i];
        b = colorStops[i+1];
        // local interpolation factor
        const localT = (t - a.pos) / (b.pos - a.pos || 1);
        const ra = hexToRgb(a.color), rb = hexToRgb(b.color);
        const r = Math.round(lerp(ra[0], rb[0], localT));
        const g = Math.round(lerp(ra[1], rb[1], localT));
        const bl= Math.round(lerp(ra[2], rb[2], localT));
        return rgbToHex(r,g,bl);
      }
    }
    return a.color;
  }

  // classification text (for label)
  function classifyText(v){
    if (!isFinite(v) || v < 0) return 'Valor inválido';
    if (v >= 0 && v <= 5) return 'Excelente';
    if (v > 5 && v < 10) return 'Ótimo';
    if (v >= 10 && v <= 11) return 'Ideal';
    if (v > 11 && v <= 12) return 'Aceitável';
    // note: 12-13 treated in continuous gradient, label as "Transição"
    if (v > 12 && v < 13) return 'Transição';
    if (v >= 13 && v < 14) return 'Lento';
    if (v >= 14 && v < 15) return 'Muito lento (14–15)';
    if (v >= 15 && v < 16) return 'Muito lento (15–16)';
    if (v >= 16 && v < 17) return 'Muito lento (16–17)';
    if (v >= 17) return 'Inaceitável';
    return 'Sem classificação';
  }

  // calculation formula: (1 / (MTs / 2)) * CL * 1000
  function computeNS(mts, cl){
    return (1 / (mts / 2)) * cl * 1000;
  }

  // chart setup
  const chartData = {
    labels: history.map((h,i)=>i+1),
    datasets: [{
      label: 'ns',
      data: history.map(h=>h.value),
      tension: 0.25,
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius:6,
      fill: false,
      // color will be updated dynamically per point using plugin
      borderColor: '#888',
      backgroundColor: function(context){
        // fallback
        return getColorForValue(context.dataset.data[context.dataIndex] || 0);
      }
    }]
  };

  const nsChart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
      animation:false,
      responsive:true,
      maintainAspectRatio:false,
      scales: {
        x: { display:false },
        y: {
          beginAtZero:true,
          ticks: { callback: v => v.toLocaleString('pt-BR')+' ns' }
        }
      },
      plugins: {
        legend: { display:false }
      },
      elements: {
        point: {
          backgroundColor: (ctx) => {
            const val = ctx.parsed.y;
            return getColorForValue(val);
          }
        },
        line: {
          borderColor: function(ctx){
            // gradient along chart — simple fallback color
            return '#888';
          }
        }
      }
    },
    plugins: [{
      // draw a vertical marker for latest
      id: 'latestPointColor',
      afterDatasetDraw(chart) {
        // do nothing here; points already colored via point.backgroundColor
      }
    }]
  });

  // update chart dataset function
  function pushHistory(val){
    const now = new Date().toISOString();
    history.push({ts: now, value: val});
    if (history.length > MAX_POINTS) history.shift();
    localStorage.setItem('ns_history', JSON.stringify(history));
    refreshChart();
  }
  function refreshChart(){
    nsChart.data.labels = history.map((h,i)=> {
      const t = new Date(h.ts);
      return t.toLocaleTimeString();
    });
    nsChart.data.datasets[0].data = history.map(h=>h.value);
    nsChart.update('none');
  }

  // UI sync functions
  function syncFromRangeToNum(range, num){
    num.value = Number(range.value).toLocaleString('pt-BR','maximumFractionDigits:3').replace(/\./g,'').replace(',','.');
    // simpler: keep number value exact from range:
    num.value = range.value;
  }
  function syncFromNumToRange(num, range){
    const v = parseFloat(num.value);
    if (isFinite(v)) range.value = v;
  }

  // update result visual
  function showResult(ns){
    const rounded = Math.round(ns * 1000) / 1000;
    const color = getColorForValue(rounded);
    const label = classifyText(rounded);
    valueDiv.textContent = `${rounded.toLocaleString('pt-BR')} ns`;
    labelDiv.textContent = label;
    resultBox.style.background = color;
    // choose text color depending on background luminance
    const rgb = hexToRgb(color);
    const luminance = (0.299*rgb[0] + 0.587*rgb[1] + 0.114*rgb[2]) / 255;
    resultBox.style.color = luminance > 0.6 ? '#111' : '#fff';
  }

  // main calculate and record
  function doCalculate(andRecord = true){
    const mts = parseFloat(mtsNum.value);
    const cl = parseFloat(clNum.value);
    if (!isFinite(mts) || mts === 0){
      valueDiv.textContent = 'MTs inválido';
      labelDiv.textContent = '';
      resultBox.style.background = '#000';
      resultBox.style.color = '#fff';
      return;
    }
    if (!isFinite(cl)){
      valueDiv.textContent = 'CL inválido';
      labelDiv.textContent = '';
      resultBox.style.background = '#000';
      resultBox.style.color = '#fff';
      return;
    }
    const ns = computeNS(mts, cl);
    showResult(ns);
    if (andRecord) pushHistory(ns);
  }

  // events: sync sliders & inputs
  mtsRange.addEventListener('input', () => {
    syncFromRangeToNum(mtsRange, mtsNum);
    doCalculate(false);
  });
  clRange.addEventListener('input', () => {
    syncFromRangeToNum(clRange, clNum);
    doCalculate(false);
  });

  mtsNum.addEventListener('change', () => {
    syncFromNumToRange(mtsNum, mtsRange);
    doCalculate(false);
  });
  clNum.addEventListener('change', () => {
    syncFromNumToRange(clNum, clRange);
    doCalculate(false);
  });

  calcBtn.addEventListener('click', () => doCalculate(true));
  clearHistBtn.addEventListener('click', () => {
    history = [];
    localStorage.removeItem('ns_history');
    refreshChart();
  });

  // theme toggle persistence
  function applyTheme(dark){
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    themeToggle.checked = dark;
    localStorage.setItem('ns_theme_dark', JSON.stringify(!!dark));
  }
  themeToggle.addEventListener('change', (e) => applyTheme(e.target.checked));
  (function initTheme(){
    const stored = JSON.parse(localStorage.getItem('ns_theme_dark') || 'null');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
    applyTheme(stored === null ? prefersDark : stored);
  })();

  // initialize values and chart
  (function init(){
    // sync numeric inputs with range initial values
    syncFromRangeToNum(mtsRange, mtsNum);
    syncFromRangeToNum(clRange, clNum);
    refreshChart();
    // if no history, compute once but do not record to avoid clutter
    if (history.length === 0) doCalculate(false);
    else {
      // show last value visually
      const last = history[history.length-1].value;
      showResult(last);
    }

    // keyboard: Enter on numeric triggers calculation
    [mtsNum, clNum].forEach(el => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doCalculate(true);
      });
    });

    // adapt canvas height responsively
    const canvas = document.getElementById('nsChart');
    function resizeCanvas(){
      const h = Math.max(200, Math.min(420, window.innerHeight * 0.32));
      canvas.style.height = h + 'px';
      nsChart.resize();
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
  })();

})();
