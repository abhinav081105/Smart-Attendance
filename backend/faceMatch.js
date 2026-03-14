const fs = require('fs');
const path = require('path');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const tf = require('@tensorflow/tfjs-node');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODELS_PATH = path.join(__dirname, 'models');
const DESCRIPTORS_FILE = path.join(__dirname, 'descriptors.json');
const DIST_THRESHOLD = parseFloat(process.env.FACE_CONFIDENCE_THRESHOLD || '0.6'); // lower = stricter

let labeledDescriptors = null;

async function loadModelsAndDescriptors() {
  if (!faceapi.nets.ssdMobilenetv1.params) {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
  }
  if (!labeledDescriptors) {
    if (!fs.existsSync(DESCRIPTORS_FILE)) {
      console.warn('Descriptors file not found:', DESCRIPTORS_FILE);
      labeledDescriptors = {};
      return;
    }
    const raw = JSON.parse(fs.readFileSync(DESCRIPTORS_FILE, 'utf8'));
    // convert arrays back to Float32Array
    labeledDescriptors = {};
    for (const label of Object.keys(raw)) {
      labeledDescriptors[label] = raw[label].map(arr => new Float32Array(arr));
    }
  }
}

// Euclidean distance
function euclidean(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

// Given imagePath, detect primary face, compute descriptor, compare with labeled descriptors
// Return { register: string|null, distance: number|null }
async function matchFace(imagePath) {
  await loadModelsAndDescriptors();

  if (!fs.existsSync(imagePath)) return { register: null, distance: null };

  const img = await canvas.loadImage(imagePath);
  const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
  if (!detection || !detection.descriptor) return { register: null, distance: null };

  const probe = detection.descriptor;
  let best = { label: null, distance: Infinity };

  for (const label of Object.keys(labeledDescriptors || {})) {
    for (const ref of labeledDescriptors[label]) {
      const dist = euclidean(probe, ref);
      if (dist < best.distance) {
        best = { label, distance: dist };
      }
    }
  }

  if (best.label && best.distance <= DIST_THRESHOLD) {
    return { register: best.label, distance: best.distance };
  }
  return { register: null, distance: best.distance === Infinity ? null : best.distance };
}

module.exports = { matchFace };