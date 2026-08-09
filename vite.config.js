import { defineConfig } from 'vite';

export default defineConfig({
  // relative base so the build works at any mount path (e.g. GitHub Pages
  // project sites like https://<user>.github.io/TDRPGTest3/)
  base: './',
});
