const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const backdrop = document.getElementById('backdrop');
const buttons = Array.from(document.querySelectorAll('.menu-btn'));
const screens = { 
  home: document.getElementById('screen-home'), 
  news: document.getElementById('screen-news') 
};

function setMenu(open){
  sidebar.classList.toggle('open', open);
  backdrop.classList.toggle('open', open);
  menuToggle.classList.toggle('open', open);
  menuToggle.textContent = open ? '×' : '☰';
}

menuToggle?.addEventListener('click', () => setMenu(!sidebar.classList.contains('open')));
backdrop?.addEventListener('click', () => setMenu(false));

buttons.forEach(btn => btn.addEventListener('click', () => {
  const target = btn.dataset.target;
  if (!screens[target]) return;
  buttons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  Object.values(screens).forEach(s => s?.classList.remove('active'));
  screens[target].classList.add('active');
  setMenu(false);
}));

document.getElementById('year').textContent = new Date().getFullYear();

async function loadNews(){
  const list = document.getElementById('newsList');
  const empty = document.getElementById('newsEmpty');
  const err = document.getElementById('newsError');
  if(!list) return;

  list.innerHTML = ''; 
  if(empty) empty.style.display = 'none'; 
  if(err) err.style.display = 'none';

  try {
    const res = await fetch('assets/news.json?v=' + Date.now(), { cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const news = await res.json();

    if(!Array.isArray(news) || news.length === 0){ 
      if(empty) empty.style.display = 'block'; 
      return; 
    }

    news.sort((a,b) => new Date(b.date) - new Date(a.date));

    news.forEach(item => {
      const card = document.createElement('article');
      card.className = 'news-item';
      card.innerHTML = `
        <div class="news-date">${item.date || ''}</div>
        <h3 class="news-title">${item.title || 'Без названия'}</h3>
        <p class="news-text">${item.text || ''}</p>
      `;
      list.appendChild(card);
    });
  } catch(e) { 
    console.error("News load error:", e);
    if(err) err.style.display = 'block'; 
  }
}
loadNews();

(function(){
  const audio = document.getElementById('player');
  const playBtn = document.getElementById('playBtn');
  const seek = document.getElementById('seek');
  const vol = document.getElementById('vol');
  const time = document.getElementById('time');
  const iconPlay = document.getElementById('iconPlay');
  const iconPause = document.getElementById('iconPause');

  if(!audio || !playBtn) return;

  const fmt = (s) => {
    if(!Number.isFinite(s)) return "00:00";
    const m = Math.floor(s/60);
    const ss = Math.floor(s%60);
    return String(m).padStart(2,'0') + ":" + String(ss).padStart(2,'0');
  };

  const setIcons = () => {
    const playing = !audio.paused;
    if(iconPlay) iconPlay.style.display = playing ? 'none' : '';
    if(iconPause) iconPause.style.display = playing ? '' : 'none';
  };

  const setSeekBg = () => {
    seek.style.setProperty('--progress', (seek.value || 0) + '%');
  };

  const setVolBg = () => {
    const p = Math.round((vol.value || 0) * 100);
    vol.style.setProperty('--vol', p + '%');
  };

  const loadVol = () => {
    const saved = localStorage.getItem('jeazy_player_volume');
    if(saved !== null) audio.volume = Math.min(1, Math.max(0, Number(saved)));
    vol.value = audio.volume;
    setVolBg();
  };

  playBtn.addEventListener('click', async () => {
    try {
      if(audio.paused) await audio.play();
      else audio.pause();
    } catch(e) { console.warn("Playback blocked"); }
    setIcons();
  });

  audio.addEventListener('timeupdate', () => {
    if(audio.duration > 0){
      const p = (audio.currentTime / audio.duration) * 100;
      seek.value = p;
      setSeekBg();
      time.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
    }
  });

  seek.addEventListener('input', () => {
    setSeekBg();
    if(audio.duration > 0) {
      const t = (seek.value / 100) * audio.duration;
      time.textContent = `${fmt(t)} / ${fmt(audio.duration)}`;
    }
  });

  seek.addEventListener('change', () => {
    if(audio.duration > 0) audio.currentTime = (seek.value / 100) * audio.duration;
  });

  vol.addEventListener('input', () => {
    audio.volume = vol.value;
    localStorage.setItem('jeazy_player_volume', vol.value);
    setVolBg();
  });

  audio.addEventListener('play', setIcons);
  audio.addEventListener('pause', setIcons);
  loadVol();
})();


(function(){
  const audio = document.getElementById('player');
  const eqBg = document.getElementById('eqBg');
  if(!audio || !eqBg) return;

  const BAR_COUNT = 34;
  for(let i=0; i<BAR_COUNT; i++){
    const b = document.createElement('span');
    b.className = 'eq-bar';
    b.style.transform = 'scaleY(0.2)';
    eqBg.appendChild(b);
  }
  const bars = Array.from(eqBg.children);

  let ctx = null, analyser = null, data = null, source = null;
  let raf = 0;

  function ensureAudioGraph(){
    if(ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      data = new Uint8Array(analyser.frequencyBinCount);
      source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
    } catch(e) { console.error("Visualizer error:", e); }
  }

  function animate(){
    if(audio.paused) {
      bars.forEach(b => b.style.transform = 'scaleY(0.2)');
      raf = 0;
      return;
    }

    if(analyser && data){
      analyser.getByteFrequencyData(data);
      const step = Math.max(1, Math.floor(data.length / bars.length));
      for(let i=0; i<bars.length; i++){
        const raw = data[i * step] || 0;
        const v = 0.35 + (raw / 255) * 3.0;
        bars[i].style.transform = `scaleY(${Math.min(3.5, v).toFixed(2)})`;
      }
    }
    raf = requestAnimationFrame(animate);
  }

  audio.addEventListener('play', async () => {
    ensureAudioGraph();
    if(ctx && ctx.state === 'suspended') await ctx.resume();
    if(!raf) animate();
  });
})();