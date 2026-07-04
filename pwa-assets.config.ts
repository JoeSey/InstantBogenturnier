import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// D-06: generic archery target/arrow motif (public/favicon.svg), accent teal #14B8A6.
// assetName override keeps output filenames matching vite.config.ts's manifest.icons
// exactly (no size suffix), per this plan's acceptance criteria.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    assetName: (type, size) => {
      if (type === 'transparent') return `pwa-${size.width}x${size.height}.png`;
      if (type === 'maskable') return `maskable-icon-${size.width}x${size.height}.png`;
      if (type === 'apple') return 'apple-touch-icon.png';
      return `${type}-${size.width}x${size.height}.png`;
    },
  },
  images: ['public/favicon.svg'],
});
