const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const backdrop = document.getElementById('backdrop');
const buttons = Array.from(document.querySelectorAll('.menu-btn'));
const screens = { home: document.getElementById('screen-home'), news: document.getElementById('screen-news') };

function setMenu(open){
  sidebar.classList.toggle('open', open);
  backdrop.classList.toggle('open', open);
  menuToggle.classList.toggle('open', open);
  menuToggle.textContent = open ? '×' : '|||';
  menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
}
menuToggle.addEventListener('click', () => setMenu(!sidebar.classList.contains('open')));
backdrop.addEventListener('click', () => setMenu(false));
buttons.forEach(btn => btn.addEventListener('click', () => {
  const target = btn.dataset.target;
  buttons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[target].classList.add('active');
  setMenu(false);
}));
document.getElementById('year').textContent = new Date().getFullYear();

async function loadNews(){
  const list = document.getElementById('newsList');
  const empty = document.getElementById('newsEmpty');
  const err = document.getElementById('newsError');
  list.innerHTML = ''; empty.style.display = 'none'; err.style.display = 'none';
  try{
    const res = await fetch('./news.json', {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const news = await res.json();
    if(!Array.isArray(news) || news.length === 0){ empty.style.display = 'block'; return; }
    news.sort((a,b)=> new Date(b.date) - new Date(a.date));
    for(const item of news){
      const card = document.createElement('article');
      card.className = 'news-item';
      card.innerHTML = `
        <div class="news-date">${item.date ?? ''}</div>
        <h3 class="news-title">${item.title ?? 'Без названия'}</h3>
        <p class="news-text">${item.text ?? ''}</p>
      `;
      list.appendChild(card);
    }
  }catch(e){ err.style.display = 'block'; }
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

  if(!audio || !playBtn || !seek || !vol || !time) return;

  const fmt = (s)=>{
    if(!Number.isFinite(s)) return "00:00";
    const m = Math.floor(s/60);
    const ss = Math.floor(s%60);
    return String(m).padStart(2,'0') + ":" + String(ss).padStart(2,'0');
  };

  const setIcons = ()=>{
    const playing = !audio.paused;
    iconPlay.style.display = playing ? 'none' : '';
    iconPause.style.display = playing ? '' : 'none';
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  };

  const setSeekBg = ()=>{
    const p = Number(seek.value) || 0;
    seek.style.setProperty('--progress', p + '%');
  };
  const setVolBg = ()=>{
    const p = Math.round((Number(vol.value)||0)*100);
    vol.style.setProperty('--vol', p + '%');
  };

  const loadVol = ()=>{
    const saved = localStorage.getItem('jeazy_player_volume');
    if(saved !== null){
      const v = Math.min(1, Math.max(0, Number(saved)));
      if(Number.isFinite(v)) vol.value = String(v);
    }
    audio.volume = Number(vol.value);
    setVolBg();
  };

  playBtn.addEventListener('click', async ()=>{
    try{
      if(audio.paused) await audio.play();
      else audio.pause();
    }catch(e){}
    setIcons();
  });

  audio.addEventListener('play', setIcons);
  audio.addEventListener('pause', setIcons);
  audio.addEventListener('ended', ()=>{
    setIcons();
    seek.value = "0";
    setSeekBg();
  });

  audio.addEventListener('loadedmetadata', ()=>{
    time.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
  });

  audio.addEventListener('timeupdate', ()=>{
    if(Number.isFinite(audio.duration) && audio.duration > 0){
      const p = (audio.currentTime / audio.duration) * 100;
      seek.value = String(p);
      setSeekBg();
      time.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
    }
  });

  seek.addEventListener('input', ()=>{
    setSeekBg();
    if(Number.isFinite(audio.duration) && audio.duration > 0){
      const t = (Number(seek.value)/100) * audio.duration;
      time.textContent = `${fmt(t)} / ${fmt(audio.duration)}`;
    }
  });
  seek.addEventListener('change', ()=>{
    if(Number.isFinite(audio.duration) && audio.duration > 0){
      audio.currentTime = (Number(seek.value)/100) * audio.duration;
    }
  });

  vol.addEventListener('input', ()=>{
    audio.volume = Number(vol.value);
    localStorage.setItem('jeazy_player_volume', vol.value);
    setVolBg();
  });
loadVol();
  setIcons();
  setSeekBg();
})();

(function(){
  const audio = document.getElementById('player');
  const eqBg = document.getElementById('eqBg');
  if(!audio || !eqBg) return;

  // Create bars
  const BAR_COUNT = 34;
  for(let i=0;i<BAR_COUNT;i++){
    const b = document.createElement('span');
    b.className = 'eq-bar';
    b.style.opacity = (0.55 + Math.random()*0.45).toFixed(2);
    eqBg.appendChild(b);
  }
  const bars = Array.from(eqBg.children);

  let ctx = null, analyser = null, data = null, source = null;
  let raf = 0;
  let fallbackTick = 0;

  function ensureAudioGraph(){
    if(ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    ctx = new AC();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    data = new Uint8Array(analyser.frequencyBinCount);
    source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);
  }

  function drawFallback(){
    fallbackTick += 0.04;
    for(let i=0;i<bars.length;i++){
      const v = 0.35 + Math.abs(Math.sin(fallbackTick + i*0.35))*2.35;
      bars[i].style.transform = `scaleY(${v.toFixed(3)})`;
    }
  }

  function animate(){
    if(audio.paused){
      // settle down when paused
      for(const b of bars) b.style.transform = 'scaleY(.2)';
      cancelAnimationFrame(raf);
      raf = 0;
      return;
    }

    if(analyser && data){
      analyser.getByteFrequencyData(data);
      const step = Math.max(1, Math.floor(data.length / bars.length));
      for(let i=0;i<bars.length;i++){
        const idx = i * step;
        const raw = data[idx] || 0;
        const n = raw / 255;
        const v = 0.35 + Math.pow(n, 0.62) * 3.05;
        bars[i].style.transform = `scaleY(${Math.min(3.6, v).toFixed(3)})`;
      }
    }else{
      drawFallback();
    }

    raf = requestAnimationFrame(animate);
  }

  audio.addEventListener('play', async ()=>{
    try{
      ensureAudioGraph();
      if(ctx && ctx.state === 'suspended') await ctx.resume();
    }catch(e){}
    if(!raf) animate();
  });

  audio.addEventListener('pause', ()=>{
    if(!raf) return;
    animate(); // lets it settle
  });
  audio.addEventListener('ended', ()=>{
    if(!raf) return;
    animate();
  });

  // init calm state
  for(const b of bars) b.style.transform = 'scaleY(.2)';
})();