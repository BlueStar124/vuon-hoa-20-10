/**
 * VƯỜN HOA 20/10 - ROMANTIC AUDIO PLAYER & SYNTHESIZER
 * Nhạc chính: Stephen Sanchez - The Pool (Acoustic lãng mạn)
 * Cùng các bản Piano kinh điển (Chopin, Debussy...) và hỗ trợ tải nhạc từ máy
 */

class RomanticAudio {
  constructor() {
    this.audioElement = new Audio();
    this.audioElement.loop = true;
    this.audioElement.volume = 0.8;
    this.isPlaying = false;
    this.currentTrack = 'the_pool'; // Đặt "The Pool" làm nhạc chính mặc định

    // Danh sách bài hát
    this.playlist = {
      the_pool: {
        title: 'Stephen Sanchez - The Pool',
        subtitle: 'Bản tình ca lãng mạn ngọt ngào (Nhạc chính)',
        src: 'audio/the_pool.webm',
        fallback: 'audio/the_pool.m4a',
        type: 'audio'
      },
      chopin: {
        title: 'Chopin - Nocturne Op. 9 No. 2',
        subtitle: 'Piano kinh điển, êm dịu & sâu lắng',
        src: 'audio/chopin_nocturne.ogg',
        type: 'audio'
      },
      clair: {
        title: 'Debussy - Clair de Lune',
        subtitle: 'Ánh trăng huyền ảo, da diết',
        src: 'audio/clair_de_lune.ogg',
        type: 'audio'
      },
      synth: {
        title: 'Hộp Nhạc Canon in D',
        subtitle: 'Giai điệu chuông thánh thót trong trẻo',
        type: 'synth'
      }
    };

    // Tự động chuyển fallback nếu định dạng webm không hỗ trợ trên trình duyệt cũ
    this.audioElement.addEventListener('error', () => {
      const track = this.playlist[this.currentTrack];
      const fallbackSrc = track && track.fallback
        ? new URL(track.fallback, document.baseURI).href
        : '';
      if (track && track.fallback && this.audioElement.src !== fallbackSrc) {
        console.log('Switching to audio fallback:', track.fallback);
        this.audioElement.src = fallbackSrc;
        if (this.isPlaying) {
          this.audioElement.play().catch(e => console.log('Fallback play error:', e));
        }
      }
    });

    // Bộ tổng hợp Web Audio API (Dự phòng cho hộp nhạc synth)
    this.audioCtx = null;
    this.synthTimer = null;
    this.synthStep = 0;
    this.notes = {
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
      'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
      'C6': 1046.50
    };
    this.melody = [
      ['C4', 'E4', 'G4', 'C5'],
      ['G4', 'B4', 'D5', 'G5'],
      ['A4', 'C5', 'E5', 'A5'],
      ['E4', 'G4', 'B4', 'E5'],
      ['F4', 'A4', 'C5', 'F5'],
      ['C4', 'E4', 'G4', 'E5'],
      ['F4', 'A4', 'C5', 'D5'],
      ['G4', 'B4', 'D5', 'G5']
    ];

    // Nạp bài hát chính ban đầu
    this.loadTrack('the_pool');
  }

  loadTrack(trackKey) {
    const track = this.playlist[trackKey];
    if (!track) return;
    this.currentTrack = trackKey;

    if (track.type === 'audio') {
      this.stopSynth();
      this.audioElement.src = track.src;
      this.audioElement.load();
    }
  }

  setCustomAudio(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    this.playlist.custom = {
      title: file.name.replace(/\.[^/.]+$/, ''),
      subtitle: 'Nhạc tải lên từ máy bạn',
      src: url,
      type: 'audio'
    };
    this.currentTrack = 'custom';
    this.audioElement.src = url;
    this.audioElement.load();

    if (this.isPlaying) {
      this.audioElement.play().catch(e => console.log('Autoplay policy:', e));
    }
  }

  play() {
    this.isPlaying = true;
    const track = this.playlist[this.currentTrack];

    if (track && track.type === 'synth') {
      this.audioElement.pause();
      this.startSynth();
    } else {
      this.stopSynth();
      this.audioElement.play().catch(err => {
        console.warn('Audio play request:', err);
      });
    }
  }

  stop() {
    this.isPlaying = false;
    this.audioElement.pause();
    this.stopSynth();
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.play();
      return true;
    }
  }

  // Web Audio Synthesizer logic
  initSynthContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  startSynth() {
    this.initSynthContext();
    this.stopSynth();
    this.synthTick();
  }

  stopSynth() {
    if (this.synthTimer) {
      clearTimeout(this.synthTimer);
      this.synthTimer = null;
    }
  }

  synthPlayNote(frequency, duration = 1.6, delay = 0, gainLevel = 0.12) {
    if (!this.audioCtx) return;

    setTimeout(() => {
      if (!this.isPlaying || this.currentTrack !== 'synth') return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

      const now = this.audioCtx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(gainLevel, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration);
    }, delay * 1000);
  }

  synthTick() {
    if (!this.isPlaying || this.currentTrack !== 'synth') return;

    const chord = this.melody[this.synthStep % this.melody.length];
    chord.forEach((noteName, idx) => {
      const freq = this.notes[noteName];
      if (freq) {
        this.synthPlayNote(freq, 2.0, idx * 0.22, 0.09 - idx * 0.015);
      }
    });

    if (Math.random() > 0.4) {
      const highNotes = ['G5', 'A5', 'C6', 'E5'];
      const pick = highNotes[Math.floor(Math.random() * highNotes.length)];
      this.synthPlayNote(this.notes[pick], 1.8, 0.7, 0.06);
    }

    this.synthStep++;
    this.synthTimer = setTimeout(() => this.synthTick(), 1100);
  }
}

window.RomanticAudio = RomanticAudio;
