(function () {
  const audio = document.getElementById('siteAudio');
  const musicControl = document.getElementById('musicControl');
  const toggle = document.getElementById('musicToggle');
  const volume = document.getElementById('musicVolume');
  if (!audio || !musicControl || !toggle || !volume) return;

  const TRACK_TITLE = 'Kyuujitsuno Sugoshikakata';
  const DEFAULT_VOLUME = 0.08;
  const FALLBACK_VOLUME = 0.3;
  const label = musicControl.querySelector('.music-label');
  const percentDisplay = musicControl.querySelector('.music-percent');
  const srLabel = toggle.querySelector('.sr-only');

  // Build the compact summary here so the player keeps one source of truth.
  if (!musicControl.querySelector('.music-summary') && label) {
    const summary = document.createElement('div');
    const art = document.createElement('img');
    const track = document.createElement('div');
    const kicker = document.createElement('span');

    summary.className = 'music-summary';
    art.className = 'music-art';
    art.src = 'https://whitenoiserecords.org/cdn/shop/products/kirinji-cherish_800x.jpg?v=1652516839';
    art.alt = 'Kirinji - Cherish album cover';
    art.loading = 'lazy';
    track.className = 'music-track';
    kicker.className = 'music-kicker';
    kicker.textContent = 'now playing';

    label.textContent = TRACK_TITLE;
    label.parentNode.insertBefore(summary, label);
    track.append(kicker, label);
    summary.append(art, track);
  }

  audio.volume = DEFAULT_VOLUME;
  audio.muted = false;

  function setToggleIcon(isPlaying) {
    const icon = toggle.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-play', !isPlaying);
      icon.classList.toggle('fa-pause', isPlaying);
    }

    toggle.setAttribute('aria-pressed', String(isPlaying));
    toggle.title = isPlaying ? 'Pause background music' : 'Play background music';
    toggle.setAttribute('aria-label', toggle.title);
    if (srLabel) srLabel.textContent = toggle.title;
  }

  function updateVolumeDisplay() {
    const percent = Math.round(audio.volume * 100);
    if (percentDisplay) percentDisplay.textContent = percent + '%';
    volume.style.setProperty('--volume-percent', percent + '%');
    volume.setAttribute('aria-valuetext', percent + '%');
  }

  setToggleIcon(false);
  volume.value = audio.volume;
  updateVolumeDisplay();

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

  volume.addEventListener('input', (event) => {
    const nextVolume = parseFloat(event.target.value);
    audio.volume = Number.isNaN(nextVolume) ? FALLBACK_VOLUME : Math.min(1, Math.max(0, nextVolume));
    updateVolumeDisplay();
  });

  audio.addEventListener('play', () => setToggleIcon(true));
  audio.addEventListener('pause', () => setToggleIcon(false));
  audio.addEventListener('ended', () => setToggleIcon(false));
  audio.addEventListener('error', (event) => {
    console.error('Background audio error:', event, audio.error);
  });

  // Keyboard shortcut: press M while the page itself has focus.
  document.addEventListener('keydown', (event) => {
    if ((event.key === 'm' || event.key === 'M') && document.activeElement === document.body) {
      toggle.click();
    }
  });

  // Start playback on the first user interaction after the landing screen.
  const startAutoplay = () => {
    if (audio.paused) {
      audio.play().then(() => setToggleIcon(true)).catch((err) => {
        console.log('Autoplay deferred until active interaction:', err);
      });
    }
    document.removeEventListener('click', startAutoplay);
    document.removeEventListener('keydown', startAutoplay);
  };
  document.addEventListener('click', startAutoplay);
  document.addEventListener('keydown', startAutoplay);
})();
