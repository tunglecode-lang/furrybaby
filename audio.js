/* ==========================================================================
   FURRYBABY - RETRO CHIPTUNE SOUND & AUDIO ENGINE (WEB AUDIO API)
   Zero-dependency procedural sound effects and relaxing sanctuary music
   ========================================================================== */

(function(window) {
  'use strict';

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.bgmPlaying = false;
      this.bgmTimer = null;
      this.masterGain = null;
      this.sfxGain = null;
      this.bgmGain = null;
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.15;
      this.bgmGain.connect(this.masterGain);
    }

    ensureContext() {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      if (this.masterGain) {
        this.masterGain.gain.value = this.isMuted ? 0 : 0.8;
      }
      return this.isMuted;
    }

    // --- SFX GENERATORS ---
    playTone(freq, type, duration, startTime = 0, gainVal = 0.3) {
      if (this.isMuted || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        g.gain.setValueAtTime(gainVal, this.ctx.currentTime + startTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + startTime + duration);

        osc.connect(g);
        g.connect(this.sfxGain);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
      } catch (e) {}
    }

    // Cute Greeting Chirp
    playChirp() {
      this.ensureContext();
      this.playTone(523.25, 'sine', 0.08, 0, 0.25); // C5
      this.playTone(659.25, 'sine', 0.08, 0.07, 0.25); // E5
      this.playTone(783.99, 'triangle', 0.16, 0.14, 0.3); // G5
    }

    // Feeding Nom Crunch
    playNom() {
      this.ensureContext();
      this.playTone(320, 'square', 0.06, 0, 0.15);
      this.playTone(240, 'square', 0.08, 0.06, 0.18);
      this.playTone(440, 'sine', 0.12, 0.12, 0.22);
    }

    // Petting Purr / Heart Chime
    playHeart() {
      this.ensureContext();
      this.playTone(880, 'sine', 0.12, 0, 0.2); // A5
      this.playTone(1046.5, 'sine', 0.18, 0.09, 0.25); // C6
      this.playTone(1318.5, 'triangle', 0.24, 0.18, 0.2); // E6
    }

    // Play Trick Jump
    playJump() {
      this.ensureContext();
      if (this.isMuted || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.18);
        g.gain.setValueAtTime(0.25, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.22);
      } catch (e) {}
    }

    // Sleeping Lullaby
    playZzz() {
      this.ensureContext();
      this.playTone(440, 'sine', 0.35, 0, 0.15);
      this.playTone(392, 'sine', 0.45, 0.25, 0.12);
    }

    // UI Click
    playClick() {
      this.ensureContext();
      this.playTone(700, 'triangle', 0.04, 0, 0.15);
    }

    // Level Up Fanfare
    playFanfare() {
      this.ensureContext();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        this.playTone(f, 'triangle', 0.16, i * 0.1, 0.25);
      });
      this.playTone(1318.5, 'sine', 0.4, 0.45, 0.3);
    }

    // --- PROCEDURAL RELAXING CHIPTUNE BGM ---
    toggleBGM() {
      this.ensureContext();
      if (this.bgmPlaying) {
        this.stopBGM();
        return false;
      } else {
        this.startBGM();
        return true;
      }
    }

    startBGM() {
      if (this.bgmPlaying || !this.ctx) return;
      this.bgmPlaying = true;
      const melody = [
        // Peaceful Pentatonic C-Major / A-Minor sequence
        523.25, 659.25, 783.99, 987.77, 783.99, 659.25,
        587.33, 698.46, 880.00, 698.46, 587.33, 523.25,
        440.00, 523.25, 659.25, 783.99, 659.25, 523.25,
        392.00, 523.25, 587.33, 659.25, 587.33, 523.25
      ];
      let step = 0;

      const tick = () => {
        if (!this.bgmPlaying || this.isMuted || !this.ctx) return;
        const note = melody[step % melody.length];
        const bass = note / 2;

        try {
          // Melody bell
          const osc1 = this.ctx.createOscillator();
          const g1 = this.ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.value = note;
          g1.gain.setValueAtTime(0.08, this.ctx.currentTime);
          g1.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.35);
          osc1.connect(g1);
          g1.connect(this.bgmGain);
          osc1.start();
          osc1.stop(this.ctx.currentTime + 0.35);

          // Soft bass pulse every 2 beats
          if (step % 2 === 0) {
            const osc2 = this.ctx.createOscillator();
            const g2 = this.ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.value = bass;
            g2.gain.setValueAtTime(0.06, this.ctx.currentTime);
            g2.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);
            osc2.connect(g2);
            g2.connect(this.bgmGain);
            osc2.start();
            osc2.stop(this.ctx.currentTime + 0.6);
          }
        } catch (e) {}

        step++;
        this.bgmTimer = setTimeout(tick, 380);
      };

      tick();
    }

    stopBGM() {
      this.bgmPlaying = false;
      if (this.bgmTimer) {
        clearTimeout(this.bgmTimer);
        this.bgmTimer = null;
      }
    }
  }

  window.SoundEngine = new SoundEngine();

})(window);
