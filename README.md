# AR-Viewer

A static 3D showcase website for the six models in [`GLTFModels/`](GLTFModels/). It has a homepage gallery and a dedicated interactive viewer page for each model, built with [three.js](https://threejs.org/).

## Run locally

```sh
npm start          # serves the site at http://localhost:5173/
```

No install step is needed. `server.mjs` is a zero-dependency static server. You can use any other static server instead, but you can't open the site from `file://` because browsers block module and model loading there. three.js (r169) and the web fonts load from CDNs, so the site needs an internet connection.

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | Gallery homepage with six tiles |
| `model.html?id=<model-id>` | Viewer page for one model |
| `assets/js/models.js` | Model catalogue: names, descriptions, original folder and file names |
| `assets/js/viewer.js` | three.js viewer: loading, PBR materials, controls, errors |
| `assets/js/home.js` | Renders the gallery tiles |
| `assets/css/styles.css` | Shared styles |
| `assets/thumbs/` | Small WebP swatches cropped from each model's diffuse texture, used by the gallery |
| `GLTFModels/` | Original model files (unchanged) |

## About the models

Although the folder is named `GLTFModels`, every model is a **binary FBX** file with external baked PBR textures (`_Diffuse`, `_Normal`, `_Roughness`, `_Metalness`, and `_Alpha` for the algae façade) stored next to it. The viewer loads the FBX with `FBXLoader`, which resolves the textures by their relative filenames. It then rebuilds each material as a `MeshStandardMaterial` and adds the roughness and metalness maps that `FBXLoader` skips.

Each viewer page loads only its own model (about 4–9 MB each) and shows download progress while it loads. Textures are resolved by filename inside the model's own folder, so exports that store extra folders in their texture paths still work.

### Adding a model

1. Put the model folder in `GLTFModels/`.
2. Add an entry to `MODELS` in `assets/js/models.js`.
3. Add a `assets/thumbs/<id>.webp` swatch.
