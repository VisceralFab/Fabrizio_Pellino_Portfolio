(function () {
  const audio = document.getElementById('siteAudio');
  const toggle = document.getElementById('musicToggle');
  const volume = document.getElementById('musicVolume');
  if (!audio || !toggle || !volume) return;

  const STORAGE_KEYS = {
    playing: 'siteMusicPlaying',
    volume: 'siteMusicVolume'
  };

  // Defaults
  let savedVolume = parseFloat(localStorage.getItem(STORAGE_KEYS.volume));
  if (Number.isNaN(savedVolume)) savedVolume = 0.3;
  audio.volume = Math.min(1, Math.max(0, savedVolume));

  function setToggleIcon(isPlaying) {
    const icon = toggle.querySelector('i');
    if (!icon) return;
    if (isPlaying) {
      icon.classList.remove('fa-play');
      icon.classList.add('fa-pause');
      toggle.setAttribute('aria-pressed', 'true');
      toggle.title = 'Pause background music';
    } else {
      icon.classList.remove('fa-pause');
      icon.classList.add('fa-play');
      toggle.setAttribute('aria-pressed', 'false');
      toggle.title = 'Play background music';
    }
  }

  // Start muted autoplay attempt (many browsers allow muted autoplay)
  audio.muted = true;
  audio.play().then(() => {
    console.log('Muted autoplay started for background music');
  }).catch((e) => {
    console.log('Muted autoplay blocked (expected in some browsers):', e && e.message);
  });

  // Restore saved state
  const savedPlayingRaw = localStorage.getItem(STORAGE_KEYS.playing);
  // note: if savedPlayingRaw === 'false' the user previously paused the music and we should not auto-start
  setToggleIcon(false);
  volume.value = audio.volume;

  // Autoplay on first user gesture unless user explicitly paused previously
  function tryAutoPlayOnGesture() {
    if (savedPlayingRaw === 'false') {
      // user explicitly left music paused; do not autoplay
      return;
    }

    audio.muted = false;
    audio.play().then(() => {
      setToggleIcon(true);
      try { localStorage.setItem(STORAGE_KEYS.playing, 'true'); } catch (_) {}
    }).catch((e) => console.error('Failed to autoplay audio on gesture:', e));
  }

  // First user gesture unblocks autoplay and allows unmute
  function handleFirstGesture() {
    document.removeEventListener('pointerdown', handleFirstGesture);
    document.removeEventListener('keydown', handleFirstGesture);
    document.removeEventListener('touchstart', handleFirstGesture);
    tryAutoPlayOnGesture();
  }

  document.addEventListener('pointerdown', handleFirstGesture, { once: true });
  document.addEventListener('keydown', handleFirstGesture, { once: true });
  document.addEventListener('touchstart', handleFirstGesture, { once: true });

  // Button toggles playback (and unmutes when playing)
  toggle.addEventListener('click', async () => {
    if (audio.paused) {
      try {
        audio.muted = false;
        await audio.play();
        setToggleIcon(true);
        localStorage.setItem(STORAGE_KEYS.playing, 'true');
      } catch (err) {
        console.error('Playback failed:', err);
      }
    } else {
      audio.pause();
      setToggleIcon(false);
      localStorage.setItem(STORAGE_KEYS.playing, 'false');
    }
  });

  // Volume control
  volume.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    audio.volume = isNaN(v) ? 0.3 : Math.min(1, Math.max(0, v));
    localStorage.setItem(STORAGE_KEYS.volume, audio.volume);
  });

  // Keep UI in sync with audio events
  audio.addEventListener('play', () => setToggleIcon(true));
  audio.addEventListener('pause', () => setToggleIcon(false));
  audio.addEventListener('error', (e) => {
    console.error('Background audio error:', e, audio.error);
  });

  // Accessibility: space or M toggles music when focus is on body
  document.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
      toggle.click();
    }
  });
})();