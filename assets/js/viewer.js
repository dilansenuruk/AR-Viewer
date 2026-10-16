import { MODELS, getModel, modelUrl, modelDir, pageUrl } from './models.js';

const $ = (id) => document.getElementById(id);

const stage = $('stage');
const ui = {
  loading: $('loading'),
  bar: $('loader-bar'),
  pct: $('loader-pct'),
  status: $('loader-status'),
  note: $('loader-note'),
  error: $('error'),
  errorTitle: $('error-title'),
  errorMessage: $('error-message'),
  errorDetail: $('error-detail'),
  retry: $('retry-btn'),
  toast: $('toast'),
};
const RING_LENGTH = 2 * Math.PI * 46;

/* ---------------------------------------------------------------------------
   Page info (independent of WebGL so it renders even if the viewer fails)
--------------------------------------------------------------------------- */

const id = new URLSearchParams(location.search).get('id');
const model = getModel(id);

if (!model) {
  document.title = 'Model not found · Materia Lab';
  $('model-name').textContent = 'Model not found';
  $('model-category').textContent = 'Error';
  $('model-desc').textContent = 'The requested model does not exist. Choose one from the gallery.';
  showError(
    'Model not found',
    id ? 'There is no model with this ID.' : 'No model was specified in the URL.',
    id ? `id=${id}` : '',
    false,
  );
  fillPager(MODELS.length - 1, 0);
} else {
  const index = MODELS.indexOf(model);
  document.title = `${model.name} · Materia Lab`;
  $('model-name').textContent = model.name;
  $('model-category').textContent = model.category;
  $('model-desc').textContent = model.description;
  $('spec-size').textContent = `${model.sizeMB} MB`;
  fillPager((index - 1 + MODELS.length) % MODELS.length, (index + 1) % MODELS.length);
  ui.note.textContent = model.sizeMB > 20 ? `High-detail model · ~${model.sizeMB} MB download` : '';
  start();
}

function fillPager(prevIdx, nextIdx) {
  for (const [el, m] of [
    [$('prev-link'), MODELS[prevIdx]],
    [$('next-link'), MODELS[nextIdx]],
  ]) {
    el.href = pageUrl(m);
    el.querySelector('span').textContent = m.name;
    el.title = m.name;
  }
}

/* ---------------------------------------------------------------------------
   UI helpers
--------------------------------------------------------------------------- */

function setProgress(fraction, status) {
  const f = Math.max(0, Math.min(1, fraction));
  ui.bar.style.strokeDashoffset = String(RING_LENGTH * (1 - f));
  ui.pct.textContent = `${Math.round(f * 100)}%`;
  if (status) ui.status.textContent = status;
}

function showError(title, message, detail = '', canRetry = true) {
  ui.loading.hidden = true;
  ui.errorTitle.textContent = title;
  ui.errorMessage.textContent = message;
  ui.errorDetail.textContent = detail;
  ui.retry.hidden = !canRetry;
  ui.error.hidden = false;
}

let toastTimer;
function toast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 5000);
}

ui.retry.addEventListener('click', () => location.reload());

/* ---------------------------------------------------------------------------
   Viewer
--------------------------------------------------------------------------- */

async function start() {
  setProgress(0, 'Initialising viewer…');

  let THREE, OrbitControls, FBXLoader, RoomEnvironment;
  try {
    [THREE, { OrbitControls }, { FBXLoader }, { RoomEnvironment }] = await Promise.all([
      import('three'),
      import('three/addons/controls/OrbitControls.js'),
      import('three/addons/loaders/FBXLoader.js'),
      import('three/addons/environments/RoomEnvironment.js'),
    ]);
  } catch (err) {
    console.error(err);
    showError(
      'Viewer failed to start',
      'The 3D engine could not be downloaded. Check your internet connection and try again.',
      String(err?.message || err),
    );
    return;
  }

  /* Renderer ------------------------------------------------------------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.error(err);
    showError(
      'WebGL unavailable',
      'Your browser or device does not support WebGL, which is required for the 3D viewer.',
      String(err?.message || err),
      false,
    );
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-label', `3D model of ${model.name}`);
  renderer.domElement.setAttribute('role', 'img');
  stage.prepend(renderer.domElement);

  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    showError('Graphics context lost', 'The GPU reset while rendering. Reload to continue.');
  });

  /* Scene ---------------------------------------------------------------- */
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xbfe9ff, 0x1a1040, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rimCyan = new THREE.DirectionalLight(0x22e6ff, 1.1);
  rimCyan.position.set(-4, 2, -3);
  scene.add(rimCyan);
  const rimViolet = new THREE.DirectionalLight(0x9b5cff, 1.0);
  rimViolet.position.set(4, 1, -4);
  scene.add(rimViolet);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotateSpeed = 1.2;
  controls.screenSpacePanning = true;
  controls.zoomToCursor = true;
  // Pause auto-rotate while the user interacts; resume if it was on.
  controls.addEventListener('start', () => {
    controls.userWasRotating = controls.autoRotate;
    controls.autoRotate = false;
  });
  controls.addEventListener('end', () => {
    if (controls.userWasRotating) controls.autoRotate = true;
  });

  /* Resize & render loop ------------------------------------------------- */
  function resize() {
    const { clientWidth: w, clientHeight: h } = stage;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  /* Loading -------------------------------------------------------------- */
  const manager = new THREE.LoadingManager();
  const failed = [];
  let fbxFraction = 0;
  let fbxDone = false;
  manager.onProgress = (url, loaded, total) => {
    if (!fbxDone) return;
    // Remaining items are textures (the FBX itself is still counted until its callback ends).
    const texTotal = Math.max(total - 1, 1);
    const texLoaded = Math.min(loaded, texTotal);
    setProgress(0.7 + 0.3 * (texLoaded / texTotal), `Streaming textures ${texLoaded}/${texTotal}`);
  };
  manager.onError = (url) => {
    failed.push(decodeURIComponent(url.split('/').pop()));
    console.warn('Failed to load', url);
  };

  const dir = modelDir(model);
  // Textures always sit next to the FBX, but some exports store their RelativeFilename
  // with extra folders (e.g. "GLTFModels\<folder>\<file>.png"). Resolve every image by
  // its bare filename inside the model's own folder.
  manager.setURLModifier((url) => {
    if (/^(blob|data):/.test(url) || !/\.(png|jpe?g|webp|tga)$/i.test(url)) return url;
    return dir + url.split(/[\\/]/).pop();
  });

  const texLoader = new THREE.TextureLoader(manager);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // FBXLoader yields Phong materials and skips roughness/metalness maps.
  // Rebuild each as a PBR material using the baked texture set for that material.
  function upgradeMaterial(old) {
    const mat = new THREE.MeshStandardMaterial({
      name: old.name,
      color: 0xffffff,
      map: old.map || null,
      normalMap: old.normalMap || null,
      alphaMap: old.alphaMap || null,
      alphaTest: old.alphaMap ? 0.5 : 0,
      roughness: 0.85,
      metalness: 0,
      side: model.doubleSided || old.alphaMap ? THREE.DoubleSide : THREE.FrontSide,
    });
    for (const t of [mat.map, mat.normalMap, mat.alphaMap]) if (t) t.anisotropy = maxAniso;

    // e.g. "Coconut coir insulation board .002_Baked.009" -> "Coconut coir insulation board .002"
    const prefix = old.name.replace(/_Baked(\.\d+)?$/, '');
    if (prefix && prefix !== old.name) {
      texLoader.load(`${dir}${prefix}_Bake1_PBR_Roughness.png`, (tex) => {
        tex.anisotropy = maxAniso;
        mat.roughnessMap = tex;
        mat.roughness = 1;
        mat.needsUpdate = true;
      });
      texLoader.load(`${dir}${prefix}_Bake1_PBR_Metalness.png`, (tex) => {
        mat.metalnessMap = tex;
        mat.metalness = 1;
        mat.needsUpdate = true;
      });
    }
    old.dispose();
    return mat;
  }

  const stats = { tris: 0, meshes: 0 };
  const materials = [];

  function prepare(object) {
    const cache = new Map();
    object.traverse((o) => {
      if (!o.isMesh) return;
      stats.meshes++;
      const g = o.geometry;
      stats.tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      const swap = (m) => {
        if (!cache.has(m)) {
          const nm = upgradeMaterial(m);
          cache.set(m, nm);
          materials.push(nm);
        }
        return cache.get(m);
      };
      o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
    });

    // Normalise: centre on origin, rest on the ground, fit to ~2 units.
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2 / maxDim;
    object.scale.multiplyScalar(scale);
    object.updateMatrixWorld(true);
    box.setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
    object.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(object);
  }

  function addFloor(box) {
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.z) * 0.75 + 0.4;

    const grid = new THREE.GridHelper(radius * 4, 28, 0x22e6ff, 0x3a3f8f);
    grid.material.transparent = true;
    grid.material.opacity = 0.18;
    grid.material.depthWrite = false;
    grid.position.y = -0.002;
    scene.add(grid);

    // Soft neon "contact glow" disc under the model.
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(34,230,255,0.55)');
    grad.addColorStop(0.45, 'rgba(110,110,255,0.22)');
    grad.addColorStop(1, 'rgba(155,92,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    const glowTex = new THREE.CanvasTexture(c);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2.4, radius * 2.4),
      new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.001;
    scene.add(glow);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius, radius + 0.012, 128),
      new THREE.MeshBasicMaterial({ color: 0x22e6ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
  }

  let home = null;
  function frame(box) {
    const size = box.getSize(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    // Aim slightly below centre so the model sits clear of the bottom toolbar.
    const center = box.getCenter(new THREE.Vector3()).add(new THREE.Vector3(0, -sphere.radius * 0.1, 0));

    // Look at the broad face: thin-in-X/Z objects are walls, thin-in-Y are slabs.
    let dir;
    if (size.x < size.y * 0.35 && size.x < size.z) dir = new THREE.Vector3(1.6, 0.45, 0.7);
    else if (size.z < size.y * 0.35 && size.z < size.x) dir = new THREE.Vector3(0.7, 0.45, 1.6);
    else dir = new THREE.Vector3(1, 0.85, 1.35);
    dir.normalize();

    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fitH = sphere.radius / Math.sin(fov / 2);
    const fitW = sphere.radius / Math.sin(Math.atan(Math.tan(fov / 2) * camera.aspect));
    const distance = Math.max(fitH, fitW) * 1.22;

    home = { target: center.clone(), position: center.clone().addScaledVector(dir, distance) };
    camera.near = distance / 100;
    camera.far = distance * 20;
    camera.updateProjectionMatrix();
    controls.minDistance = sphere.radius * 0.35;
    controls.maxDistance = distance * 4;
    controls.maxPolarAngle = Math.PI * 0.95;
    resetView();
  }

  function resetView() {
    if (!home) return;
    camera.position.copy(home.position);
    controls.target.copy(home.target);
    controls.update();
  }

  setProgress(0, 'Downloading geometry…');

  const loader = new FBXLoader(manager);
  loader.load(
    modelUrl(model),
    (object) => {
      fbxDone = true;
      setProgress(0.7, 'Building materials…');
      let box;
      try {
        box = prepare(object);
      } catch (err) {
        console.error(err);
        showError('Unable to process model', 'The model was downloaded but could not be prepared for display.', String(err?.message || err));
        return;
      }
      scene.add(object);
      addFloor(box);
      frame(box);
      $('spec-tris').textContent = Math.round(stats.tris).toLocaleString();
      $('spec-meshes').textContent = String(stats.meshes);

      // Reveal once every texture has settled (loaded or failed).
      manager.onLoad = () => {
        setProgress(1, 'Ready');
        renderer.compile(scene, camera);
        stage.classList.add('is-ready');
        ui.loading.hidden = true;
        if (failed.length) {
          toast(`${failed.length} texture${failed.length > 1 ? 's' : ''} could not be loaded. The model is shown with partial materials.`);
        }
      };
    },
    (e) => {
      if (fbxDone) return;
      if (e.lengthComputable && e.total) {
        fbxFraction = e.loaded / e.total;
        const mb = (n) => (n / 1048576).toFixed(1);
        setProgress(
          fbxFraction * 0.7,
          fbxFraction >= 1 ? 'Parsing geometry…' : `Downloading geometry ${mb(e.loaded)} / ${mb(e.total)} MB`,
        );
      } else {
        ui.status.textContent = `Downloading geometry ${(e.loaded / 1048576).toFixed(1)} MB`;
      }
    },
    (err) => {
      console.error(err);
      const offline = !navigator.onLine;
      const notFound = /404|not found/i.test(String(err?.message || err));
      showError(
        'Unable to load model',
        offline
          ? 'You appear to be offline. Reconnect and try again.'
          : notFound
            ? 'The model file could not be found on the server.'
            : 'The model file could not be downloaded or parsed.',
        String(err?.message || err),
      );
    },
  );

  /* Toolbar -------------------------------------------------------------- */
  const btnRotate = $('tool-rotate');
  const btnWire = $('tool-wire');
  const btnFull = $('tool-full');
  btnRotate.setAttribute('aria-pressed', String(controls.autoRotate));

  btnRotate.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    controls.userWasRotating = controls.autoRotate;
    btnRotate.setAttribute('aria-pressed', String(controls.autoRotate));
  });
  btnWire.addEventListener('click', () => {
    const on = btnWire.getAttribute('aria-pressed') !== 'true';
    for (const m of materials) m.wireframe = on;
    btnWire.setAttribute('aria-pressed', String(on));
  });
  $('tool-reset').addEventListener('click', resetView);

  if (!document.fullscreenEnabled) {
    btnFull.hidden = true;
  } else {
    btnFull.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else stage.requestFullscreen().catch(() => {});
    });
    document.addEventListener('fullscreenchange', () => {
      btnFull.setAttribute('aria-pressed', String(document.fullscreenElement === stage));
    });
  }
}
