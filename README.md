# Fish-MVS Project Page

This repository hosts the public project page for the paper:

**Non-contact body length measurement and biomass estimation of grouper via underwater multi-view 3D reconstruction**

The page provides an interactive three.js-based point-cloud viewer for qualitative comparison of reconstruction results on a real grouper aquaculture scene captured with a 12-view semi-circular camera system.

## Live Page

After GitHub Pages is enabled, the site is available at:

`https://pengjuyan1.github.io/fish-mvs-page/`

## Repository Structure

- `index.html`: main project page
- `static/css/pointcloud-showcase.css`: custom page styling
- `static/js/pointcloud-carousel.js`: three.js point-cloud viewer and carousel logic
- `static/data/`: point-cloud files used by the viewer
- `static/vendor/three/`: local three.js runtime dependencies

## Current Viewer Content

The viewer loads the following point-cloud files directly by filename:

- `static/data/ours.ply`
- `static/data/acmh.ply`
- `static/data/acmm.ply`
- `static/data/acmp.ply`
- `static/data/acmmp.ply`

These files are shown without additional display-side geometric cleanup.

## Local Preview

You can preview the page locally with a simple static server:

```bash
cd /home/ypj/UnderWaterMVSGaussian/Academic-project-page-template
python3 -m http.server 8018
```

Then open:

`http://127.0.0.1:8018/`

## Deployment

This site is intended to be deployed with GitHub Pages from the `main` branch root.

GitHub repository:

`https://github.com/PengjuYan1/fish-mvs-page`

## Data Link

The project page currently points to the public dataset release here:

`https://doi.org/10.6084/m9.figshare.32109580`

## Acknowledgment

This page was initially adapted from the Academic Project Page Template and then simplified into a dedicated point-cloud showcase for reviewer-facing presentation.
