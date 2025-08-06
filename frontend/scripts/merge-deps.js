// scripts/merge-deps.js
const fs = require('fs');
const path = require('path');

console.log('Starting dependency merge...');

const mainPackagePath = path.join(process.cwd(), 'package.json');
const playwrightPackagePath = path.join(process.cwd(), 'package.playwright.json');

if (!fs.existsSync(mainPackagePath)) {
  console.error('Error: Main package.json not found!');
  process.exit(1);
}

if (!fs.existsSync(playwrightPackagePath)) {
  console.error('Error: package.playwright.json not found!');
  process.exit(1);
}

const mainPkg = JSON.parse(fs.readFileSync(mainPackagePath, 'utf8'));
const playwrightPkg = JSON.parse(fs.readFileSync(playwrightPackagePath, 'utf8'));

console.log('Merging dependencies...');

// Ensure dependency objects exist before merging
mainPkg.dependencies = mainPkg.dependencies || {};
mainPkg.devDependencies = mainPkg.devDependencies || {};
playwrightPkg.dependencies = playwrightPkg.dependencies || {};
playwrightPkg.devDependencies = playwrightPkg.devDependencies || {};

// Merge dependencies, giving playwright's precedence in case of conflict
Object.assign(mainPkg.dependencies, playwrightPkg.dependencies);
Object.assign(mainPkg.devDependencies, playwrightPkg.devDependencies);

console.log('Writing merged package.json...');
fs.writeFileSync(mainPackagePath, JSON.stringify(mainPkg, null, 2));

console.log('Dependency merge complete.');
