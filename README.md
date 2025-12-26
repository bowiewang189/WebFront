# WangBaoWei Templates (Front-end only)

Next.js + Tailwind project that renders **final images** (no video, no backend).
Pick a template, adjust parameters, click **Render**, then **Download PNG**.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## UI changes requested
### Chain Ribbons
- Inputs: **Speed ratio** (signed CSV) + **Length ratio** (CSV)
- Fixed: legs=1, ribbonMode=tip, maxLength=4, startTheta=π/2

### Rolling Circle Spirograph
- Fixed: one arm (ballCount removed)
- Turns input removed; turns are auto-chosen from big/small radius ratio (with safety caps)

## Tips
- 2560×1440 + 20000 points/steps looks very smooth.


### Fourier Image
- Upload an image + choose Order N
- Front-end contour extraction (Otsu threshold) + discrete Fourier reconstruction
- Renders final curve as a white line

- Improved contour extraction using Marching Squares (more stable than greedy boundary ordering)
