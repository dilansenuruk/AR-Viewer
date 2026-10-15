// Single source of truth for the six models in /GLTFModels.
// `folder` and `file` are the original on-disk names and must not be changed:
// each FBX references its PBR textures by relative filename inside its own folder.

export const MODEL_ROOT = 'GLTFModels';

export const MODELS = [
  {
    id: 'algae-facade',
    name: 'Algae Façade',
    category: 'Façade System',
    folder: 'Algae façade',
    file: 'Algae façade .fbx',
    sizeMB: 5.8,
    textureSets: 1,
    accent: 'cyan',
    doubleSided: true,
    description:
      'A bio-adaptive building envelope with integrated algae panels that shade the façade while cultivating biomass.',
  },
  {
    id: 'bamboo-parquet',
    name: 'Bamboo Parquet',
    category: 'Flooring',
    folder: 'Bamboo paraquet',
    file: 'Bamboo paraquet .fbx',
    sizeMB: 24,
    textureSets: 1,
    accent: 'violet',
    description:
      'Bamboo flooring board, a rapidly renewable alternative to hardwood with a warm, linear grain.',
  },
  {
    id: 'coconut-coir-insulation-board',
    name: 'Coconut Coir Insulation Board',
    category: 'Insulation',
    folder: 'Coconut coir insulation board',
    file: 'Coconut coir insulat.fbx',
    sizeMB: 66,
    textureSets: 3,
    accent: 'cyan',
    description:
      'Thermal and acoustic insulation board pressed from coconut husk fibre, a by-product of coconut processing.',
  },
  {
    id: 'coconut-shell-biochar-concrete',
    name: 'Coconut Shell Biochar Concrete',
    category: 'Concrete',
    folder: 'Coconut shell biochar concrete',
    file: 'Coconut shell biocha.fbx',
    sizeMB: 4.8,
    textureSets: 1,
    accent: 'violet',
    description:
      'Concrete that uses carbonised coconut shell biochar as a partial aggregate, which locks carbon into the mix.',
  },
  {
    id: 'coconut-wood-composite-board',
    name: 'Coconut Wood Composite Board',
    category: 'Composite Board',
    folder: 'Coconut wood composite board',
    file: 'Coconut wood composi.fbx',
    sizeMB: 6.6,
    textureSets: 1,
    accent: 'cyan',
    description:
      'Engineered board made from coconut palm stem wood, which turns ageing plantation palms into usable timber.',
  },
  {
    id: 'rice-husk-ash-composite-panel',
    name: 'Rice Husk Ash Composite Panel',
    category: 'Composite Panel',
    folder: 'Rice husk ash composite panel',
    file: 'Rice husk ash compos.fbx',
    sizeMB: 63,
    textureSets: 2,
    accent: 'violet',
    description:
      'Composite panel that uses silica-rich rice husk ash, an agricultural residue, as a binder and filler.',
  },
];

export function getModel(id) {
  return MODELS.find((m) => m.id === id) || null;
}

/** URL of the model's FBX file (encoded; the folder doubles as the texture base path). */
export function modelUrl(model) {
  return encodeURI(`${MODEL_ROOT}/${model.folder}/${model.file}`);
}

export function modelDir(model) {
  return encodeURI(`${MODEL_ROOT}/${model.folder}/`);
}

export function thumbUrl(model) {
  return `assets/thumbs/${model.id}.webp`;
}

export function pageUrl(model) {
  return `model.html?id=${encodeURIComponent(model.id)}`;
}
