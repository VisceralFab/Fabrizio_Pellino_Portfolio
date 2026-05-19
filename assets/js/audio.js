(function () {
  const audio = document.getElementById('siteAudio');
  const toggle = document.getElementById('musicToggle');
  const volume = document.getElementById('musicVolume');
  if (!audio || !toggle || !volume) return;

  const STORAGE_KEYS = {
    playing: 'siteMusicPlaying', // We might ignore this for auto-start, but keep for volume?
    volume: 'siteMusicVolume'
  };

  // Defaults - Force volume to 0.3 initially or use saved if allowable, but user asked for "standard volume max 30%".
  // I will set it to 0.3 by default. If the user had it higher, maybe we should respect it?
  // "vorrei che il volume standard sia abbastanza basso (massimo 30%)" -> "I would like the standard volume to be quite low (max 30%)"
  // I'll adhere to 0.3.
  let startVolume = 0.08;
  // If we want to remember volume across sessions:
  // let savedVolume = parseFloat(localStorage.getItem(STORAGE_KEYS.volume));
  // if (!Number.isNaN(savedVolume)) startVolume = savedVolume;
  // However, specifically for the request "standard volume... max 30%", I'll cap it at 0.3 if we restore, or just set to 0.3.
  // Let's set it to 0.3 to be safe and strictly follow "standard volume".

  audio.volume = startVolume;
  audio.muted = false; // Ensure it's not muted (volume controls actual output)

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

  // Volume percentage display
  const percentDisplay = document.querySelector('.music-percent');

  function updateVolumeDisplay() {
    if (percentDisplay) {
      percentDisplay.textContent = Math.round(audio.volume * 100) + '%';
    }
  }

  // Initialize UI (Not playing by default)
  setToggleIcon(false);
  volume.value = audio.volume;
  updateVolumeDisplay();

  // Button toggles playback
  toggle.addEventListener('click', async () => {
    if (audio.paused) {
      try {
        await audio.play();
        setToggleIcon(true);
      } catch (err) {
        console.error('Playback failed:', err);
      }
    } else {
      audio.pause();
      setToggleIcon(false);
    }
  });

  // Volume control
  volume.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    audio.volume = isNaN(v) ? 0.3 : Math.min(1, Math.max(0, v));
    updateVolumeDisplay();
    // localStorage.setItem(STORAGE_KEYS.volume, audio.volume); // Optional: save volume preference
  });

  // Keep UI in sync with audio events
  audio.addEventListener('play', () => setToggleIcon(true));
  audio.addEventListener('pause', () => setToggleIcon(false));
  audio.addEventListener('ended', () => {
    // Loop handled by HTML attribute, but just in case
    setToggleIcon(false);
  });
  audio.addEventListener('error', (e) => {
    console.error('Background audio error:', e, audio.error);
  });

  // Accessibility: space or M toggles music when focus is on body
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'm' || e.key === 'M') && document.activeElement === document.body) {
      toggle.click();
    }
  });

  // Autoplay on first click/keydown anywhere on the document (modern browser compliant)
  const startAutoplay = () => {
    if (audio.paused) {
      audio.play().then(() => {
        setToggleIcon(true);
      }).catch(err => {
        console.log('Autoplay deferred until active interaction:', err);
      });
    }
    document.removeEventListener('click', startAutoplay);
    document.removeEventListener('keydown', startAutoplay);
  };
  document.addEventListener('click', startAutoplay);
  document.addEventListener('keydown', startAutoplay);
})();
