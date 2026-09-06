(function () {
  const audio = document.getElementById('siteAudio');
  const musicControl = document.getElementById('musicControl');
  const toggle = document.getElementById('musicToggle');
  const volume = document.getElementById('musicVolume');
  if (!audio || !musicControl || !toggle || !volume) return;

  const TRACK_TITLE = 'Kyuujitsuno Sugoshikakata';
  // The UI is a comfortable site-volume scale: even 100% is master-capped
  // so the source track can never reach the browser's full output volume.
  const DEFAULT_VOLUME = 0.06;
  const MAX_OUTPUT_VOLUME = 0.18;
  const FALLBACK_VOLUME = 0.3;
  const label = musicControl.querySelector('.music-label');
  const percentDisplay = musicControl.querySelector('.music-percent');
  const srLabel = toggle.querySelector('.sr-only');
  let enabled = false;
  let resumeAfterVideo = false;
  const activeVideos = new Set();
  let volumeFadeFrame = null;
  let selectedVolume = DEFAULT_VOLUME;

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
    kicker.textContent = 'Kirinji';

    label.textContent = TRACK_TITLE;
    label.parentNode.insertBefore(summary, label);
    track.append(kicker, label);
    summary.append(art, track);
  }

  audio.volume = DEFAULT_VOLUME * MAX_OUTPUT_VOLUME;
  audio.muted = true;

  function syncPlayback() {
    setToggleIcon(!audio.paused && !audio.muted);
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    audio.muted = !enabled;
    if (!enabled) {
      resumeAfterVideo = false;
      audio.pause();
    }
    syncPlayback();
  }

  async function play() {
    if (!enabled) return;
    if (activeVideos.size > 0) {
      resumeAfterVideo = true;
      return;
    }
    try {
      await audio.play();
      // A later "no"/pause may have happened while playback was starting.
      if (!enabled || activeVideos.size > 0) audio.pause();
    } catch (err) {
      console.info('Music playback is unavailable or awaiting interaction:', err);
    }
    syncPlayback();
  }

  function playWithFade() {
    if (!enabled) return;
    if (volumeFadeFrame) cancelAnimationFrame(volumeFadeFrame);
    const targetVolume = selectedVolume * MAX_OUTPUT_VOLUME;
    audio.volume = 0;
    play();

    const duration = 900;
    const startedAt = performance.now();
    const fade = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      audio.volume = targetVolume * progress;
      if (progress < 1) volumeFadeFrame = requestAnimationFrame(fade);
      else volumeFadeFrame = null;
    };
    volumeFadeFrame = requestAnimationFrame(fade);
  }

  // All automatic playback goes through the visitor's explicit preference.
  window.siteMusic = {
    setEnabled,
    play,
    playWithFade,
    get enabled() { return enabled; },
    suspendForVideo(video) {
      if (activeVideos.size === 0) resumeAfterVideo = enabled && !audio.paused;
      activeVideos.add(video);
      audio.pause();
    },
    releaseVideo(video) {
      if (!activeVideos.delete(video)) return;
      if (activeVideos.size === 0 && resumeAfterVideo) {
        resumeAfterVideo = false;
        play();
      }
    },
    releaseVideos() {
      activeVideos.clear();
      if (resumeAfterVideo) {
        resumeAfterVideo = false;
        play();
      }
    }
  };

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
    const percent = Math.round(selectedVolume * 100);
    if (percentDisplay) percentDisplay.textContent = percent + '%';
    volume.style.setProperty('--volume-percent', percent + '%');
    volume.setAttribute('aria-valuetext', percent + '%');
    volume.value = selectedVolume;
  }

  setToggleIcon(false);
  volume.value = selectedVolume;
  updateVolumeDisplay();

  toggle.addEventListener('click', () => {
    if (audio.paused || audio.muted) {
      setEnabled(true);
      play();
    } else {
      setEnabled(false);
    }
  });

  volume.addEventListener('input', (event) => {
    const nextVolume = parseFloat(event.target.value);
    selectedVolume = Number.isNaN(nextVolume) ? FALLBACK_VOLUME : Math.min(1, Math.max(0, nextVolume));
    audio.volume = selectedVolume * MAX_OUTPUT_VOLUME;
    updateVolumeDisplay();
  });

  audio.addEventListener('play', syncPlayback);
  audio.addEventListener('pause', syncPlayback);
  audio.addEventListener('ended', syncPlayback);
  audio.addEventListener('volumechange', () => {
    updateVolumeDisplay();
    syncPlayback();
  });
  audio.addEventListener('error', (event) => {
    console.error('Background audio error:', event, audio.error);
  });

  // Keyboard shortcut: press M while the page itself has focus.
  document.addEventListener('keydown', (event) => {
    if (!event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey &&
        (event.key === 'm' || event.key === 'M') && document.activeElement === document.body &&
        musicControl.classList.contains('is-visible')) {
      toggle.click();
    }
  });

})();
