import * as THREE from '../vendor/three/three.module.js';
import { OrbitControls } from '../vendor/three/addons/controls/OrbitControls.js';
import { PLYLoader } from '../vendor/three/addons/loaders/PLYLoader.js';

const MODEL_CONFIGS = [
  { id: 'ours', name: 'Ours', fishUrl: 'static/data/ours.ply', pointSize: 0.040 },
  { id: 'acmh', name: 'ACMH', fishUrl: 'static/data/acmh.ply', pointSize: 0.040 },
  { id: 'acmm', name: 'ACMM', fishUrl: 'static/data/acmm.ply', pointSize: 0.040 },
  { id: 'acmp', name: 'ACMP', fishUrl: 'static/data/acmp.ply', pointSize: 0.040 },
  { id: 'acmmp', name: 'ACMMP', fishUrl: 'static/data/acmmp.ply', pointSize: 0.040 },
];

const canvasMount = document.getElementById('viewer-canvas');
const loadingEl = document.getElementById('viewer-loading');
const carouselDots = Array.from(document.querySelectorAll('.carousel-dot'));
const modelNameEl = document.getElementById('model-name');

const loader = new PLYLoader();
const geometryCache = new Map();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0xffffff, 1);
canvasMount.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.panSpeed = 0.9;
controls.enableZoom = true;
controls.zoomSpeed = 1.0;
controls.rotateSpeed = 0.85;
controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;

scene.add(new THREE.AmbientLight(0xffffff, 1.55));

const keyLight = new THREE.DirectionalLight(0x90c6ff, 0.95);
keyLight.position.set(2.8, 2.0, 1.8);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xb2efe8, 0.38);
fillLight.position.set(-2.0, -1.0, 1.1);
scene.add(fillLight);

const state = {
  currentIndex: 0,
  activePoints: null,
  currentBounds: null,
  baseDistance: 3.2,
  baseYaw: -0.22,
  basePitch: 0.07,
  minDistance: 2.0,
  maxDistance: 6.5,
};

function setLoading(visible, text = 'Loading point cloud...') {
  if (!loadingEl) return;
  loadingEl.textContent = text;
  loadingEl.classList.toggle('is-hidden', !visible);
}

function buildMaterial(size, hasVertexColors, colorHex) {
  return new THREE.PointsMaterial({
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.97,
    depthWrite: false,
    vertexColors: hasVertexColors,
    color: hasVertexColors ? 0xffffff : colorHex,
  });
}

function buildPoints(geometry, size, colorHex) {
  const hasVertexColors = Boolean(geometry.getAttribute('color'));
  const points = new THREE.Points(geometry, buildMaterial(size, hasVertexColors, colorHex));
  points.scale.y = -1;
  points.scale.z = -1;
  return points;
}

async function loadGeometry(url) {
  if (geometryCache.has(url)) {
    return geometryCache.get(url);
  }
  const geometry = await loader.loadAsync(url);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometryCache.set(url, geometry);
  return geometry;
}

function cloneGeometry(geometry) {
  const copy = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    copy.setAttribute(name, attribute.clone());
  }
  if (geometry.index) {
    copy.setIndex(geometry.index.clone());
  }
  copy.computeBoundingBox();
  copy.computeBoundingSphere();
  return copy;
}

function disposePoints(points) {
  if (!points) return;
  scene.remove(points);
  if (points.geometry) points.geometry.dispose();
  if (points.material) points.material.dispose();
}

function fitCamera(bounds) {
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() * 0.5, 0.8);
  const aspect = Math.max(canvasMount.clientWidth, 1) / Math.max(canvasMount.clientHeight, 1);
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const fitHeight = (size.y * 0.60) / Math.tan(vFov / 2);
  const fitWidth = (size.x * 0.66) / Math.tan(hFov / 2);
  const fitDepth = size.z * 0.92;
  const fittedDistance = Math.max(fitHeight, fitWidth, fitDepth, radius * 1.85);

  state.baseDistance = Math.max(fittedDistance * 0.88, 2.35);
  state.minDistance = Math.max(state.baseDistance * 0.62, radius * 0.78);
  state.maxDistance = state.baseDistance * 1.68;

  controls.target.copy(center);
  controls.minDistance = state.minDistance;
  controls.maxDistance = state.maxDistance;
  controls.minAzimuthAngle = state.baseYaw - 0.58;
  controls.maxAzimuthAngle = state.baseYaw + 0.58;
  controls.minPolarAngle = Math.PI / 2 - 0.24;
  controls.maxPolarAngle = Math.PI / 2 + 0.20;

  resetView();
}

function sphericalOffset(distance, yaw, pitch) {
  const cp = Math.cos(pitch);
  return new THREE.Vector3(
    Math.cos(yaw) * cp * distance,
    Math.sin(pitch) * distance,
    Math.sin(yaw) * cp * distance,
  );
}

function resetView() {
  const offset = sphericalOffset(state.baseDistance, state.baseYaw, state.basePitch);
  camera.position.copy(controls.target).add(offset);
  camera.lookAt(controls.target);
  controls.update();
}

function updateSelection(index) {
  carouselDots.forEach((dot, dotIndex) => {
    const selected = dotIndex === index;
    dot.classList.toggle('is-selected', selected);
    dot.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
  if (modelNameEl) {
    modelNameEl.textContent = MODEL_CONFIGS[index].name;
  }
}

async function showModel(index) {
  const safeIndex = (index + MODEL_CONFIGS.length) % MODEL_CONFIGS.length;
  const model = MODEL_CONFIGS[safeIndex];
  state.currentIndex = safeIndex;
  updateSelection(safeIndex);
  setLoading(true, `Loading ${model.name}...`);

  disposePoints(state.activePoints);
  state.activePoints = null;

  const geometry = await loadGeometry(model.fishUrl);
  const points = buildPoints(cloneGeometry(geometry), model.pointSize * 1.38, 0x6cc8ff);
  scene.add(points);
  state.activePoints = points;
  state.currentBounds = geometry.boundingBox.clone();
  fitCamera(state.currentBounds);
  setLoading(false);
}

function resizeRenderer() {
  const width = Math.max(canvasMount.clientWidth, 1);
  const height = Math.max(canvasMount.clientHeight, 1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function render() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function bindEvents() {
  window.addEventListener('resize', () => {
    resizeRenderer();
    if (state.currentBounds) {
      fitCamera(state.currentBounds);
    }
  });

  carouselDots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const index = Number(dot.dataset.modelIndex || 0);
      showModel(index).catch(handleError);
    });
  });
}

function handleError(error) {
  console.error(error);
  setLoading(true, `Failed to load point cloud: ${error.message || error}`);
}

async function main() {
  resizeRenderer();
  bindEvents();
  await showModel(0);
  render();
}

main().catch(handleError);
