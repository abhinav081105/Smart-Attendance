const fs = require('fs');
const path = require('path');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const tf = require('@tensorflow/tfjs-node');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODELS_PATH = path.join(__dirname, 'models');
const ENROLL_PATH = path.join(__dirname, 'enrollments');
const OUT_FILE = path.join(__dirname, 'descriptors.json');

async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
}

function imageFromFile(file) {
  return canvas.loadImage(file);
}

async function build() {
  await loadModels();
  const labels = fs.readdirSync(ENROLL_PATH).filter(f => fs.statSync(path.join(ENROLL_PATH, f)).isDirectory());
  const result = {};
  for (const label of labels) {
    const dir = path.join(ENROLL_PATH, label);
    const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f));
    const descriptors = [];
    for (const f of files) {
      const img = await imageFromFile(path.join(dir, f));
      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      if (detection && detection.descriptor) {
        descriptors.push(Array.from(detection.descriptor));
      } else {
        console.warn(`No face detected for ${label}/${f}`);
      }
    }
    if (descriptors.length) result[label] = descriptors;
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(result));
  console.log('Saved descriptors to', OUT_FILE);
}

build().catch(err => { console.error(err); process.exit(1); });