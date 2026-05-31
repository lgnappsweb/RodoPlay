/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import confetti from 'canvas-confetti';

export function isAudioEnabled(): boolean {
  try {
    const stored = localStorage.getItem('game_audio_enabled');
    return stored !== 'false'; // default is true
  } catch (e) {
    return true;
  }
}

export function setAudioEnabled(enabled: boolean) {
  try {
    localStorage.setItem('game_audio_enabled', enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to save audio settings:', e);
  }
}

export function isVisualEffectsEnabled(): boolean {
  try {
    const stored = localStorage.getItem('game_visual_effects_enabled');
    return stored !== 'false'; // default is true
  } catch (e) {
    return true;
  }
}

export function setVisualEffectsEnabled(enabled: boolean) {
  try {
    localStorage.setItem('game_visual_effects_enabled', enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to save visual effects settings:', e);
  }
}

export function triggerGameConfetti() {
  if (!isVisualEffectsEnabled()) return;
  try {
    confetti({
      particleCount: 25,
      spread: 45,
      origin: { y: 0.8 },
      colors: ['#fbbf24', '#f59e0b', '#3b82f6', '#10b981', '#ec4899']
    });
  } catch (e) {
    console.warn('Confetti error:', e);
  }
}

export function playGameSfx(type: 'correct' | 'incorrect' | 'click' | 'win' | 'match' | 'reveal') {
  if (!isAudioEnabled()) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'correct' || type === 'match') {
      // Upbeat positive sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'incorrect') {
      // Incorrect buzzer sound
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.setValueAtTime(147, now + 0.12); // D3
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'win') {
      // Fanfare sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.82);
    } else if (type === 'click') {
      // Subtle physical click
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'reveal') {
      // Mysterious/pleasant slide up
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.2);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    console.warn('Web Audio API play error:', e);
  }
}
