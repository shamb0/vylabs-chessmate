#!/usr/bin/env node

/**
 * Vitest Test Discovery Diagnostic Script
 * Run this script to diagnose why integration tests are not being found
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

// Replicate __filename and __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function diagnostic() {
  console.log(' VITEST TEST DISCOVERY DIAGNOSTICS')
  console.log('=' .repeat(50))
  
  const cwd = process.cwd()
  console.log(` Current Working Directory: ${cwd}`)
  console.log(` Container Environment: ${!!process.env.DOCKER ? 'YES' : 'NO'}`)
  console.log(` CI Environment: ${process.env.CI || 'NO'}`)
  console.log()

  // 1. Check directory structure
  console.log(' DIRECTORY STRUCTURE ANALYSIS')
  console.log('-'.repeat(30))
  
  const criticalPaths = [
    'src',
    'src/tests',
    'src/tests/integration',
    'src/tests/unit', 
    'src/tests/e2e',
    'tests',
    'tests/integration',
    '__tests__',
    'package.json',
    'vite.config.ts',
    'vitest.config.ts'
  ]

  criticalPaths.forEach(dirPath => {
    const fullPath = path.join(cwd, dirPath)
    const exists = fs.existsSync(fullPath)
    const isDir = exists && fs.statSync(fullPath).isDirectory()
    const icon = exists ? (isDir ? '' : '') : '❌'
    console.log(`  ${icon} ${dirPath} ${exists ? (isDir ? '(directory)' : '(file)') : '(missing)'}`)
  })
  console.log()

  // 2. Search for test files with different patterns
  console.log(' TEST FILE DISCOVERY')
  console.log('-'.repeat(30))
  
  const patterns = [
    'src/tests/integration/**/*.spec.ts',
    'src/tests/integration/**/*.test.ts', 
    'src/tests/integration/**/*.spec.js',
    'src/tests/integration/**/*.test.js',
    'src/tests/**/*.spec.ts',
    'src/tests/**/*.test.ts',
    'tests/integration/**/*.spec.ts',
    'tests/integration/**/*.test.ts',
    '**/*integration*.spec.ts',
    '**/*integration*.test.ts',
    '**/*.{test,spec}.{ts,js,tsx,jsx}',
    'src/**/*.{test,spec}.{ts,js,tsx,jsx}'
  ]

  patterns.forEach(pattern => {
    try {
      const files = glob.sync(pattern, { 
        cwd,
        ignore: ['node_modules/**', 'dist/**', '.git/**']
      })
      console.log(`  Pattern: ${pattern}`)
      console.log(`    Found: ${files.length} files`)
      files.slice(0, 3).forEach(file => console.log(`      - ${file}`))
      if (files.length > 3) {
        console.log(`      ... and ${files.length - 3} more`)
      }
      if (files.length === 0) {
        console.log(`      ❌ No files found`)
      }
      console.log()
    } catch (err) {
      console.log(`  Pattern: ${pattern} - ERROR: ${err.message}`)
    }
  })

  // 3. Check package.json scripts
  console.log(' PACKAGE.JSON ANALYSIS')
  console.log('-'.repeat(30))
  
  try {
    const packagePath = path.join(cwd, 'package.json')
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
      console.log('  Scripts related to testing:')
      Object.entries(pkg.scripts || {}).forEach(([key, value]) => {
        if (key.includes('test') || value.includes('vitest')) {
          console.log(`    ${key}: ${value}`)
        }
      })
      
      console.log('  Dependencies:')
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      ['vitest', 'vite', '@vitejs/plugin-react'].forEach(dep => {
        console.log(`    ${dep}: ${deps[dep] || 'NOT FOUND'}`)
      })
    } else {
      console.log('  ❌ package.json not found')
    }
  } catch (err) {
    console.log(`  Error reading package.json: ${err.message}`)
  }
  console.log()

  // 4. Volume mount analysis (Docker-specific)
  console.log(' VOLUME MOUNT ANALYSIS')
  console.log('-'.repeat(30))
  
  if (process.env.DOCKER || cwd.includes('/usr/src/app')) {
    console.log('  Running in Docker container')
    console.log(`  Container working directory: ${cwd}`)
    
    // Check if files exist at expected mount points
    const hostMounts = ['/usr/src/app', '/app', '/workspace']
    hostMounts.forEach(mount => {
      if (fs.existsSync(mount)) {
        console.log(`  ✅ Mount point exists: ${mount}`)
        try {
          const files = fs.readdirSync(mount)
          console.log(`    Contents: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`)
        } catch (err) {
          console.log(`    Cannot read contents: ${err.message}`)
        }
      }
    })
  } else {
    console.log('  Not running in Docker container')
  }
  console.log()

  // 5. Vitest configuration analysis
  console.log('⚙️  VITEST CONFIGURATION ANALYSIS')
  console.log('-'.repeat(30))
  
  const configFiles = ['vite.config.ts', 'vite.config.js', 'vitest.config.ts', 'vitest.config.js']
  let configFound = false
  
  configFiles.forEach(configFile => {
    const configPath = path.join(cwd, configFile)
    if (fs.existsSync(configPath)) {
      configFound = true
      console.log(`  ✅ Configuration file: ${configFile}`)
      
      try {
        const content = fs.readFileSync(configPath, 'utf8')
        
        // Extract project names
        const projectMatches = content.match(/name:\s*['"`](\w+)['"`]/g)
        if (projectMatches) {
          console.log('    Defined projects:')
          projectMatches.forEach(match => {
            const name = match.match(/['"`](\w+)['"`]/)[1]
            console.log(`      - ${name}`)
          })
        }
        
        // Extract include patterns
        const includeMatches = content.match(/include:\s*\[([\s\S]*?)\]/g)
        if (includeMatches) {
          console.log('    Include patterns found:')
          includeMatches.forEach((match, index) => {
            console.log(`      Pattern ${index + 1}: ${match.replace(/\s+/g, ' ').slice(0, 80)}...`)
          })
        }
      } catch (err) {
        console.log(`    Cannot parse configuration: ${err.message}`)
      }
    }
  })
  
  if (!configFound) {
    console.log('  ❌ No Vitest configuration files found')
  }
  console.log()

  // 6. Recommended actions
  console.log(' RECOMMENDED ACTIONS')
  console.log('-'.repeat(30))
  console.log('1. Create test files in the expected locations:')
  console.log('   - src/tests/integration/ (create if missing)')
  console.log('   - Add .spec.ts or .test.ts files')
  console.log()
  console.log('2. Verify file patterns match actual file names')
  console.log('3. Check volume mounts in docker-compose.yml')
  console.log('4. Run: vitest list --project=integration (to see what Vitest finds)')
  console.log('5. Run: vitest run --project=integration --reporter=verbose')
  console.log()
}

// Run diagnostics
if (require.main === module) {
  diagnostic()
}

module.exports = { diagnostic }
