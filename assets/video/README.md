# Video assets

Drop the hero background video here, e.g. `assets/video/hero.mp4`.

Recommendations for a background video that loads fast and loops cleanly:

- **Format**: MP4 (H.264) — plays everywhere. Add a `.webm` copy too if you have one.
- **Resolution**: 1920x1080 is plenty for a background; 4K just wastes bandwidth.
- **Size**: aim for under ~15 MB. If it's bigger, compress with e.g.
  `ffmpeg -i input.mp4 -vf scale=1920:-2 -an -crf 28 -preset slow hero.mp4`
  (`-an` strips audio — background videos play muted anyway).
- **Poster**: optionally add `hero-poster.jpg` (a frame from the video) so the hero
  shows an image instantly while the video buffers.

Once the file is here, the home-page hero gets wired to use it as the background
(muted, autoplaying, looping, with the existing slideshow as fallback).
