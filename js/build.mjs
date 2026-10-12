// Builds the editor into dist/ (committed; see ../formy.libraries.yml).
// Usage: node build.mjs [--watch]
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const common = {
  bundle: true,
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  target: ['es2022'],
  logLevel: 'info',
  legalComments: 'none',
};

const builds = [
  { ...common, entryPoints: { 'formy-editor': 'src/index.ts' }, outdir: 'dist', format: 'iife' },
  { ...common, entryPoints: { 'formy-editor': 'src/styles.css' }, outdir: 'dist' },
  { ...common, entryPoints: { 'signature-preview': 'src/extensions/signature-preview.ts' }, outdir: 'dist/extensions', format: 'iife' },
];

if (watch) {
  for (const options of builds) {
    const context = await esbuild.context(options);
    await context.watch();
  }
}
else {
  await Promise.all(builds.map((options) => esbuild.build(options)));
}
