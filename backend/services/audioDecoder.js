// backend/services/audioDecoder.js
// Decodes uploaded voice samples (webm/opus) to PCM float32 arrays
// using ffmpeg sidecar. Required for server-side VCS voice profile analysis.
// Client-side real-time VCS uses feature vectors, not raw audio.

const { execFile } = require('child_process');
const { promisify } = require('util');
const { Readable } = require('stream');

const execFileAsync = promisify(execFile);

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const SAMPLE_RATE = 16000; // 16kHz mono — sufficient for vocal feature extraction
const MAX_DURATION_SEC = 30;

/**
 * Decode audio buffer (webm/opus/mp4/any) to raw PCM float32 samples.
 * Returns Float32Array of mono samples at SAMPLE_RATE.
 */
async function decodeAudioBuffer(inputBuffer) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', 'pipe:0',
      '-t', String(MAX_DURATION_SEC),
      '-ac', '1',                    // mono
      '-ar', String(SAMPLE_RATE),    // 16kHz
      '-f', 'f32le',                 // raw float32 little-endian
      '-loglevel', 'error',
      'pipe:1',
    ];

    const proc = require('child_process').spawn(FFMPEG, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const chunks = [];
    proc.stdout.on('data', chunk => chunks.push(chunk));
    proc.stderr.on('data', () => {}); // suppress — loglevel=error already filters

    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`ffmpeg exited ${code}`));
      const raw = Buffer.concat(chunks);
      const samples = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
      resolve(samples);
    });

    proc.on('error', err => {
      if (err.code === 'ENOENT') reject(new Error('ffmpeg not found — install ffmpeg or set FFMPEG_PATH'));
      else reject(err);
    });

    const readable = Readable.from(inputBuffer);
    readable.pipe(proc.stdin);
    proc.stdin.on('error', () => {}); // ignore broken pipe on short files
  });
}

/**
 * Extract basic acoustic features from PCM samples.
 * Used for static voice profile (onboarding sample), not real-time VCS.
 */
function extractFeatures(samples) {
  if (!samples.length) return null;

  // RMS energy
  const rms = Math.sqrt(samples.reduce((s, x) => s + x * x, 0) / samples.length);

  // Zero-crossing rate (proxy for pitch range)
  let zeroCrossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) zeroCrossings++;
  }
  const zcr = zeroCrossings / samples.length;

  // Spectral centroid approximation via windowed energy
  const windowSize = SAMPLE_RATE / 10; // 100ms windows
  const windowEnergies = [];
  for (let i = 0; i < samples.length - windowSize; i += windowSize) {
    const window = samples.slice(i, i + windowSize);
    const energy = window.reduce((s, x) => s + x * x, 0) / windowSize;
    windowEnergies.push(energy);
  }
  const energyVariance = variance(windowEnergies);
  const durationSec = samples.length / SAMPLE_RATE;

  return {
    rmsEnergy:      parseFloat(rms.toFixed(4)),
    zeroCrossingRate: parseFloat(zcr.toFixed(4)),
    energyVariance: parseFloat(energyVariance.toFixed(4)),
    durationSec:    parseFloat(durationSec.toFixed(2)),
    sampleRate:     SAMPLE_RATE,
    sampleCount:    samples.length,
  };
}

function variance(arr) {
  if (!arr.length) return 0;
  const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
  return arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
}

module.exports = { decodeAudioBuffer, extractFeatures, SAMPLE_RATE };
