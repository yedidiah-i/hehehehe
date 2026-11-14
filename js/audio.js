/**
 * Neon Arcade Audio Engine
 * Pure Web Audio API synthesized sound effects - zero external audio assets required.
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.4;
        this.muted = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized && this.ctx) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
                this.initialized = true;
            }
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(muted) {
        this.muted = muted;
    }

    setVolume(val) {
        this.masterVolume = Math.max(0, Math.min(1, val));
    }

    getMasterGain(startTime, duration) {
        if (this.muted || !this.ctx) return null;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.masterVolume, startTime);
        gain.connect(this.ctx.destination);
        return gain;
    }

    /**
     * Massive arcade crash & explosion sound
     */
    playCrash() {
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const masterGain = this.getMasterGain(now, 0.8);
        if (!masterGain) return;

        // 1. Low frequency sub-bass thud (sine drop 180Hz -> 30Hz)
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(220, now);
        subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

        subGain.gain.setValueAtTime(1.0, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        subOsc.connect(subGain);
        subGain.connect(masterGain);
        subOsc.start(now);
        subOsc.stop(now + 0.45);

        // 2. White noise burst with lowpass filter sweep for explosion punch
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.5);
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1600, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + 0.45);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);
        whiteNoise.start(now);
        whiteNoise.stop(now + 0.5);

        // 3. High metallic ring / crunch
        const crunchOsc = this.ctx.createOscillator();
        const crunchGain = this.ctx.createGain();
        crunchOsc.type = 'sawtooth';
        crunchOsc.frequency.setValueAtTime(450, now);
        crunchOsc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

        crunchGain.gain.setValueAtTime(0.5, now);
        crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        crunchOsc.connect(crunchGain);
        crunchGain.connect(masterGain);
        crunchOsc.start(now);
        crunchOsc.stop(now + 0.3);
    }

    /**
     * Crisp whoosh / near-miss sound
     */
    playNearMiss() {
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const masterGain = this.getMasterGain(now, 0.25);
        if (!masterGain) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.22);
    }

    /**
     * Futuristic round start chime / fanfare
     */
    playRoundStart() {
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const masterGain = this.getMasterGain(now, 0.5);
        if (!masterGain) return;

        const notes = [330, 440, 554, 660]; // E4, A4, C#5, E5
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = now + idx * 0.07;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0.0, noteStart);
            gain.gain.linearRampToValueAtTime(0.25, noteStart + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.25);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(noteStart);
            osc.stop(noteStart + 0.28);
        });
    }

    /**
     * Ready countdown beep
     */
    playCountdown(final = false) {
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const masterGain = this.getMasterGain(now, 0.2);
        if (!masterGain) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = final ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(final ? 880 : 440, now);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (final ? 0.35 : 0.15));

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + (final ? 0.4 : 0.2));
    }

    /**
     * Sleek UI click / blip
     */
    playClick() {
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const masterGain = this.getMasterGain(now, 0.08);
        if (!masterGain) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(850, now + 0.04);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.06);
    }
}

// Global audio instance
window.soundEngine = new SoundEngine();
