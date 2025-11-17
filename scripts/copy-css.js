import { copyFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Create dist/design-systems directory
mkdirSync(join(root, 'dist/design-systems'), { recursive: true });

// Copy design system CSS files
const designSystemsDir = join(root, 'src/styles/design-systems');
const files = readdirSync(designSystemsDir).filter(file => file.endsWith('.css'));

for (const file of files) {
  copyFileSync(
    join(designSystemsDir, file),
    join(root, 'dist/design-systems', file)
  );
  console.log(`Copied ${file} to dist/design-systems/`);
}

// Copy components.css
copyFileSync(
  join(root, 'src/styles/components.css'),
  join(root, 'dist/components.css')
);
console.log('Copied components.css to dist/');

// Copy dist/styles/themes.css to dist/index.css for easier importing
copyFileSync(
  join(root, 'dist/styles/themes.css'),
  join(root, 'dist/index.css')
);
console.log('Copied themes.css to dist/index.css');

// Copy the source map file (referenced as themes.css.map in the CSS)
copyFileSync(
  join(root, 'dist/styles/themes.css.map'),
  join(root, 'dist/themes.css.map')
);
console.log('Copied themes.css.map to dist/themes.css.map');
