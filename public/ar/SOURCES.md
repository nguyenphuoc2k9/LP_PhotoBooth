# Local AR assets

- Runtime: @mediapipe/tasks-vision 0.10.32, Google MediaPipe, Apache-2.0. `vision.js` is the unchanged `vision_bundle.cjs` distribution; the classic worker supplies its CommonJS exports object. WebAssembly files are copied unchanged from the same package.
- Model: Google MediaPipe Face Landmarker float16, version 1.
  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
- Documentation and model cards: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker
- Renderer: original Stillroom canvas drawings (glasses, cat ears, crown, bow).

All files are served from this website. No camera images are sent to Google or another remote inference service. The model performs landmark localization, not identity recognition. Landmark results are kept only in memory. No blendshapes or identity templates are stored.
