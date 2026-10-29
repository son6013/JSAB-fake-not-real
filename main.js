(function () {
  const C = window.CONFIG;
  
  const canvas = document.getElementById('gameCanvas');
  const viewport = new window.Viewport(canvas);
  const player = new window.Player();

  // UI
  const uploadOverlay = document.getElementById('upload-overlay');
  const deathOverlay = document.getElementById('death-overlay');
  const winOverlay = document.getElementById('win-overlay');
  const fileInput = document.getElementById('audio-upload');
  const uploadBtn = document.getElementById('upload-btn');
  const restartBtn = document.getElementById('restart-btn');
  const winRestartBtn = document.getElementById('win-restart-btn');
  const deathMenuBtn = document.getElementById('death-menu-btn');
  const levelList = document.getElementById('level-list');
  const uiLayer = document.getElementById('ui-layer');
  const hpDisplay = document.getElementById('hp-display');
  
  // QTE UI (Вирус)
  const qteOverlay = document.getElementById('qte-overlay');
  const qteBox = document.getElementById('qte-box');

  // === МОБИЛЬНОЕ УПРАВЛЕНИЕ ===
  function bindTouchControls() {
    const bindBtn = (id, key) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault(); 
        player.keys[key] = true;
        btn.style.background = 'rgba(0, 229, 255, 0.8)'; 
      });
      const release = (e) => {
        e.preventDefault();
        player.keys[key] = false;
        btn.style.background = 'rgba(0, 229, 255, 0.15)';
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointerleave', release); 
      btn.addEventListener('pointercancel', release);
    };

    bindBtn('btn-w', 'w');
    bindBtn('btn-a', 'a');
    bindBtn('btn-s', 's');
    bindBtn('btn-d', 'd');

    const dashBtn = document.getElementById('dash-btn');
    if (dashBtn) {
      dashBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        player.tryDash();
        dashBtn.style.background = 'rgba(255, 43, 214, 0.8)';
      });
      const dashRelease = (e) => {
        e.preventDefault();
        dashBtn.style.background = 'rgba(255, 43, 214, 0.15)';
      };
      dashBtn.addEventListener('pointerup', dashRelease);
      dashBtn.addEventListener('pointerleave', dashRelease);
      dashBtn.addEventListener('pointercancel', dashRelease);
    }
  }
  bindTouchControls();

  // === НАСТРОЙКИ УРОВНЕЙ ===
  const levelsData = [
    { name: "Рыгмифон", file: "music/track1.mp3", difficulty: "Легко" },
    { name: "Фрутагер.аер", file: "music/track2.mp3", difficulty: "Средне" },
    { name: "СЕГРЕЙ РОМАНЦЕВ!!?", file: "music/track3.mp3", difficulty: "Хардкор" }
  ];
  const menuMusicFile = "music/menu_theme.mp3";

  let audioCtx = null;
  let analyser = null;
  let source = null;
  let audioBuffer = null;
  let dataArray = null;
  let isPlaying = false;
  
  let menuSource = null; 
  let menuBuffer = null; 

  let lastTime = performance.now();
  let accumulator = 0;
  let obstacles = [];
  let particles = [];
  let spawnTimer = 0;
  let isDead = false;
  let shakeTime = 0;
  let shakePower = 0;
  let pulse = 0;
  let hp = 4;
  let invulnTimer = 0;
  let boredomTimer = 0; 
  let isHardcore = false; 
  let hardcoreTextTimer = 0; 
  let isTrackEnded = false;
  let winTimer = 0;

  // === ПЕРЕМЕННЫЕ ДЛЯ ВИРУСА (QTE) ===
  let virusTimer = 15; 
  let isVirusActive = false;
  let virusClicks = 5;
  let virusTimeLeft = 0;
  let virusCooldown = 0; 

  // ВОТ ЭТА ФУНКЦИЯ ОТВЕЧАЕТ ЗА КАРТОЧКИ УРОВНЕЙ
  function buildMenu() {
    levelList.innerHTML = "";
    levelsData.forEach(level => {
      const card = document.createElement('div');
      card.className = 'level-card';
      card.innerHTML = `
        <h3>${level.name}</h3>
        <span style="color: #00e5ff">${level.difficulty}</span>
      `;
      card.onclick = () => loadTrackFromPath(level.file);
      levelList.appendChild(card);
    });
  }

  async function loadMenuMusic() {
    if (!audioCtx) return;
    try {
      const response = await fetch(menuMusicFile);
      if (!response.ok) throw new Error("Нет файла");
      const arrayBuffer = await response.arrayBuffer();
      menuBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      playMenuMusic();
    } catch (err) {
      console.warn("Музыка меню не загружена.");
    }
  }

  function playMenuMusic() {
    if (!menuBuffer || !audioCtx) return;
    stopGameMusic(); 
    if (menuSource) { try { menuSource.stop(); } catch(e){} }
    menuSource = audioCtx.createBufferSource();
    menuSource.buffer = menuBuffer;
    menuSource.loop = true; 
    menuSource.connect(audioCtx.destination);
    menuSource.start(0);
  }

  function stopMenuMusic() {
    if (menuSource) {
      try { menuSource.stop(); } catch(e){}
      menuSource.disconnect();
      menuSource = null;
    }
  }

  async function loadTrackFromPath(path) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      uploadBtn.innerText = "Загрузка...";
      uploadBtn.disabled = true;
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Файл ${path} не найден`);
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      setupGameAndPlay();
    } catch (err) {
      console.error(err);
      alert("Ошибка! Проверь, что файл лежит в папке music.");
      uploadBtn.innerText = "Загрузить свой MP3";
      uploadBtn.disabled = false;
    }
  }

  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      uploadBtn.innerText = "Загрузка...";
      uploadBtn.disabled = true;
      const arrayBuffer = await file.arrayBuffer();
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      setupGameAndPlay();
    } catch (err) {
      console.error(err);
      alert("Ошибка загрузки файла!");
      uploadBtn.innerText = "Загрузить свой MP3";
      uploadBtn.disabled = false;
    }
  });

  function setupGameAndPlay() {
    stopMenuMusic(); 
    if (!analyser) {
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
    
    uploadOverlay.classList.add('hidden');
    qteOverlay.classList.add('hidden');
    uiLayer.classList.remove('hidden');
    uploadBtn.innerText = "Загрузить свой MP3";
    uploadBtn.disabled = false;
    
    resetGameState();
    startMusic();
  }

  function stopGameMusic() {
    if (source) { try { source.stop(); } catch(e){} source.disconnect(); source = null; }
    isPlaying = false;
  }

  function startMusic() {
    stopGameMusic();
    source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    source.onended = () => {
      if (!isDead && !isTrackEnded) {
        isTrackEnded = true;
        winTimer = 10.0; 
      }
    };

    source.start(0);
    isPlaying = true;
    isTrackEnded = false;
  }

  function resetGameState() {
    isDead = false; obstacles = []; particles = []; spawnTimer = 0; shakeTime = 0;
    hp = 4; invulnTimer = 0; boredomTimer = 0; isHardcore = false; isTrackEnded = false;
    
    virusTimer = 15;
    isVirusActive = false;
    virusCooldown = 0;
    qteOverlay.classList.add('hidden');
    
    player.x = C.field.width / 2; player.y = C.field.height / 2; player.vx = 0; player.vy = 0;
    updateHpDisplay(); deathOverlay.classList.add('hidden'); winOverlay.classList.add('hidden');
  }

  function resetToMenu() {
    stopGameMusic(); isTrackEnded = false; isDead = false; isVirusActive = false;
    uploadOverlay.classList.remove('hidden'); deathOverlay.classList.add('hidden'); winOverlay.classList.add('hidden'); uiLayer.classList.add('hidden'); qteOverlay.classList.add('hidden');
    fileInput.value = "";
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!menuBuffer) loadMenuMusic(); else playMenuMusic();
  }

  restartBtn.addEventListener('click', () => { restartBtn.blur(); resetGameState(); startMusic(); });
  winRestartBtn.addEventListener('click', () => { winRestartBtn.blur(); resetToMenu(); });
  deathMenuBtn.addEventListener('click', () => { deathMenuBtn.blur(); resetToMenu(); });

  function updateHpDisplay() {
    let hearts = "";
    for (let i = 0; i < 4; i++) hearts += (i < hp) ? "❤" : "🖤";
    hpDisplay.innerText = hearts;
  }

  function spawnVirus() {
    isVirusActive = true;
    virusClicks = 5;
    virusTimeLeft = 3.0; 
    
    const rx = 30 + Math.random() * 20; 
    const ry = 30 + Math.random() * 20; 
    
    qteOverlay.style.left = `${rx}%`;
    qteOverlay.style.top = `${ry}%`;
    
    qteBox.innerText = virusClicks;
    qteBox.style.transform = 'scale(1)';
    qteBox.style.background = 'rgba(255, 43, 214, 0.2)';
    qteOverlay.classList.remove('hidden');
    
    shakeTime = 0.2;
    shakePower = 5;
  }

  function handleVirusClick(e) {
    if (!isVirusActive) return;
    if (e) e.preventDefault();

    virusClicks--;
    qteBox.innerText = virusClicks;
    
    qteBox.style.transform = 'scale(0.8)';
    setTimeout(() => qteBox.style.transform = 'scale(1)', 50);
    qteBox.style.background = 'rgba(255, 255, 255, 0.5)';
    setTimeout(() => qteBox.style.background = 'rgba(255, 43, 214, 0.2)', 100);

    if (virusClicks <= 0) {
      isVirusActive = false;
      qteOverlay.classList.add('hidden');
      virusCooldown = 10; 
      
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2; const speed = 100 + Math.random() * 300;
        particles.push({ 
          x: C.field.width / 2, y: C.field.height / 2, 
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, 
          life: 0.8, color: '#ff2bd6' 
        });
      }
    }
  }

  qteBox.addEventListener('pointerdown', handleVirusClick);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isVirusActive) handleVirusClick();
  });

  function failVirus() {
    isVirusActive = false;
    qteOverlay.classList.add('hidden');
    
    hp--; 
    updateHpDisplay();
    shakeTime = 0.5;
    shakePower = 20;
    virusCooldown = 10;
    
    if (hp <= 0) {
      triggerDeath();
    }
  }

  function spawnObstacle() {
    if (!window.Obstacle) return;
    const speedMult = isHardcore ? 1.2 : 1.0;
    const rand = Math.random();
    if (rand < 0.5) {
      const fromLeft = Math.random() > 0.5;
      const speed = (300 + Math.random() * 150) * speedMult;
      obstacles.push(new window.Obstacle(fromLeft ? -50 : C.field.width + 50, Math.random() * C.field.height, 40, 40, fromLeft ? speed : -speed, (Math.random() - 0.5) * 200));
    } else if (rand < 0.8) {
      const fromLeft = Math.random() > 0.5;
      const y = Math.random() * (C.field.height - 120);
      const speed = (350 + Math.random() * 150) * speedMult;
      obstacles.push(new window.Obstacle(fromLeft ? -50 : C.field.width + 50, y, 50, 120, fromLeft ? speed : -speed, 0));
    } else {
      const fromTop = Math.random() > 0.5;
      const x = Math.random() * (C.field.width - 150);
      const speed = (350 + Math.random() * 150) * speedMult;
      obstacles.push(new window.Obstacle(x, fromTop ? -50 : C.field.height + 50, 150, 40, 0, fromTop ? speed : -speed));
    }
  }

  function takeDamage() {
    if (invulnTimer > 0 || isDead) return;
    hp--; updateHpDisplay(); shakeTime = 0.3; shakePower = 10; invulnTimer = 1.0;
    if (isHardcore) { isHardcore = false; boredomTimer = 0; }
    if (hp <= 0) triggerDeath();
  }

  function triggerDeath() {
    isDead = true; shakeTime = 0.4; shakePower = 15; stopGameMusic();
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2; const speed = 100 + Math.random() * 600;
      particles.push({ x: player.x, y: player.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1.0, color: '#00e5ff' });
    }
    setTimeout(() => deathOverlay.classList.remove('hidden'), 500);
  }

  function drawBackground() {
    const ctx = viewport.ctx;
    viewport.beginField();
    ctx.fillStyle = pulse > 200 ? '#15102a' : C.colors.bg;
    ctx.fillRect(0, 0, C.field.width, C.field.height);
    ctx.strokeStyle = C.colors.grid; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= C.field.width; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, C.field.height); }
    for (let y = 0; y <= C.field.height; y += 64) { ctx.moveTo(0, y); ctx.lineTo(C.field.width, y); }
    ctx.stroke();
    ctx.strokeStyle = isHardcore ? '#ff2bd6' : C.colors.frame;
    ctx.lineWidth = isHardcore ? 8 : 4 + (pulse / 50);
    ctx.strokeRect(0, 0, C.field.width, C.field.height);
  }

  function loop(now) {
    let frameTime = (now - lastTime) / 1000;
    if (frameTime > C.loop.maxFrameTime) frameTime = C.loop.maxFrameTime;
    lastTime = now; accumulator += frameTime;

    if (isPlaying && analyser) {
      analyser.getByteFrequencyData(dataArray);
      let bassSum = 0; for (let i = 0; i < 10; i++) bassSum += dataArray[i];
      pulse = bassSum / 10;
    } else { pulse = 0; }

    let steps = 0;
    while (accumulator >= C.loop.fixedDt && steps < C.loop.maxStepsPerFrame) {
      const dt = C.loop.fixedDt;

      if (isPlaying && !isDead && !isTrackEnded && !isVirusActive) {
        if (virusCooldown > 0) {
          virusCooldown -= dt;
        } else {
          virusTimer -= dt;
          if (virusTimer <= 0) {
            spawnVirus();
            virusTimer = 15 + Math.random() * 5; 
          }
        }
      }

      if (isVirusActive) {
        virusTimeLeft -= dt;
        if (virusTimeLeft <= 0) {
          failVirus();
        }
      }

      if (isTrackEnded) {
        winTimer -= dt;
        if (winTimer <= 0) {
          isTrackEnded = false; winOverlay.classList.remove('hidden'); uiLayer.classList.add('hidden'); 
          if (!menuBuffer && audioCtx) loadMenuMusic(); else playMenuMusic(); 
        }
      }

      if (!isDead && isPlaying && !isTrackEnded) {
        player.update(dt);
        if (invulnTimer > 0) invulnTimer -= dt;
        if (obstacles.length === 0 && !isHardcore) {
          boredomTimer += dt;
          if (boredomTimer >= 10.0) { isHardcore = true; hardcoreTextTimer = 3.0; }
        } else { boredomTimer = 0; }
        if (isHardcore && hardcoreTextTimer > 0) hardcoreTextTimer -= dt;

        spawnTimer -= dt;
        const spawnThreshold = isHardcore ? 0.4 : 0.8; 
        const shouldSpawn = isHardcore || (pulse > 180);
        if (shouldSpawn && spawnTimer <= 0) { spawnObstacle(); spawnTimer = spawnThreshold; }

        const pSize = player.size / 2;
        if (player.x < pSize) player.x = pSize;
        if (player.x > C.field.width - pSize) player.x = C.field.width - pSize;
        if (player.y < pSize) player.y = pSize;
        if (player.y > C.field.height - pSize) player.y = C.field.height - pSize;

        for (let i = obstacles.length - 1; i >= 0; i--) {
          const obs = obstacles[i]; obs.update(dt);
          if (!player.isDashing && obs.collidesWith(player)) { takeDamage(); obs.dead = true; }
          if (obs.dead) obstacles.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.95; p.vy *= 0.95; p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }
      if (isTrackEnded) {
        for (let i = obstacles.length - 1; i >= 0; i--) { obstacles[i].update(dt); if (obstacles[i].dead) obstacles.splice(i, 1); }
      }
      if (shakeTime > 0) shakeTime -= dt;
      accumulator -= C.loop.fixedDt; steps++;
    }

    viewport.clear(C.colors.bg);
    drawBackground();

    let sx = 0, sy = 0;
    if (shakeTime > 0) { sx = (Math.random() - 0.5) * shakePower; sy = (Math.random() - 0.5) * shakePower; }

    viewport.beginField(sx, sy);
    for (const obs of obstacles) obs.draw(viewport.ctx);
    if (!isDead && !(invulnTimer > 0 && Math.floor(invulnTimer * 10) % 2 === 0)) player.draw(viewport.ctx);
    for (const p of particles) { viewport.ctx.fillStyle = p.color; viewport.ctx.fillRect(p.x - 4, p.y - 4, 8, 8); }

    if (hardcoreTextTimer > 0) {
      viewport.ctx.fillStyle = '#ff2bd6'; viewport.ctx.font = 'bold 40px sans-serif'; viewport.ctx.textAlign = 'center'; viewport.ctx.shadowBlur = 20; viewport.ctx.shadowColor = '#ff2bd6';
      viewport.ctx.fillText('Слишком скучно, добавлю сложности >:)', C.field.width / 2, C.field.height / 2); viewport.ctx.shadowBlur = 0;
    }
    
    if (isTrackEnded) {
      viewport.ctx.fillStyle = '#b6ff3b'; viewport.ctx.font = 'bold 50px sans-serif'; viewport.ctx.textAlign = 'center'; viewport.ctx.shadowBlur = 30; viewport.ctx.shadowColor = '#b6ff3b';
      viewport.ctx.fillText('Ты победил :D!!', C.field.width / 2, C.field.height / 2 - 20); viewport.ctx.font = '24px sans-serif'; viewport.ctx.fillStyle = '#ffffff';
      viewport.ctx.fillText(`Меню через ${Math.ceil(winTimer)}...`, C.field.width / 2, C.field.height / 2 + 30); viewport.ctx.shadowBlur = 0;
    }

    if (isVirusActive) {
      viewport.ctx.fillStyle = '#ff2bd6'; viewport.ctx.font = 'bold 24px sans-serif'; viewport.ctx.textAlign = 'center';
      viewport.ctx.fillText(`ВИРУС: ${virusTimeLeft.toFixed(1)}s`, C.field.width / 2, 80);
    }

    if (isPlaying && !isDead && !isTrackEnded) {
      viewport.ctx.fillStyle = '#ffffff'; viewport.ctx.font = '16px monospace'; viewport.ctx.textAlign = 'left';
      viewport.ctx.fillText(`Бас: ${Math.round(pulse)}`, 20, 30);
      if (!isHardcore) {
        viewport.ctx.fillStyle = boredomTimer > 7 ? '#ff2bd6' : '#c9d0ff';
        if (obstacles.length === 0) viewport.ctx.fillText(`Скука: ${(10 - boredomTimer).toFixed(1)}s`, 20, 50);
        else viewport.ctx.fillText(`Скука: ожидание...`, 20, 50);
      } else {
        viewport.ctx.fillStyle = '#ff2bd6'; viewport.ctx.fillText(`РЕЖИМ: ХАРДКОР`, 20, 50);
      }
    }
    requestAnimationFrame(loop);
  }

  // ЗАПУСК МЕНЮ (ВОТ ЭТА СТРОЧКА БЫЛА ПОТЕРЯНА)
  buildMenu();
  
  window.addEventListener('click', () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      loadMenuMusic();
    }
  }, { once: true });

  requestAnimationFrame(loop);
})();