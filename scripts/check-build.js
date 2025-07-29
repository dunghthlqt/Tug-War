#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking build configuration...');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'src/App.tsx',
  'src/main.tsx',
  'index.html',
  'vercel.json'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json scripts
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['dev', 'build', 'preview'];
requiredScripts.forEach(script => {
  if (packageJson.scripts[script]) {
    console.log(`✅ Script: ${script}`);
  } else {
    console.log(`❌ Script: ${script} - MISSING`);
    allFilesExist = false;
  }
});

// Check environment variables in App.tsx
const appContent = fs.readFileSync('src/App.tsx', 'utf8');
if (appContent.includes('import.meta.env.VITE_MULTISYNQ_API_KEY')) {
  console.log('✅ Environment variable configured in App.tsx');
} else {
  console.log('❌ Environment variable not configured in App.tsx');
  allFilesExist = false;
}

if (allFilesExist) {
  console.log('\n🎉 All checks passed! Ready for deployment.');
  console.log('\n📋 Next steps:');
  console.log('1. git add .');
  console.log('2. git commit -m "Prepare for deployment"');
  console.log('3. git push origin main');
  console.log('4. Deploy to Vercel');
  console.log('5. Set VITE_MULTISYNQ_API_KEY in Vercel environment variables');
} else {
  console.log('\n❌ Some checks failed. Please fix the issues above.');
  process.exit(1);
} 