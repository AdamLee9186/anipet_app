const fs = require('fs');
const path = require('path');

// Remove console.log statements from production build
function removeConsoleLogs(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove console.time, console.timeEnd, console.log - more carefully
    content = content.replace(/console\.(time|timeEnd|log|warn|error)\([^)]*\);?\s*/g, ';');
    
    // Remove performance monitoring calls - more carefully
    content = content.replace(/if\s*\(\s*process\.env\.NODE_ENV\s*===\s*['"]development['"]\s*\)\s*\{[^}]*\}/g, '');
    
    // Fix any double semicolons
    content = content.replace(/;;+/g, ';');
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Cleaned: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error cleaning ${filePath}:`, error.message);
  }
}

// Clean all JS files in build directory
function cleanBuildDirectory(buildPath) {
  if (!fs.existsSync(buildPath)) {
    console.log('Build directory not found, skipping cleanup');
    return;
  }

  const files = fs.readdirSync(buildPath, { recursive: true });
  
  files.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const filePath = path.join(buildPath, file);
      removeConsoleLogs(filePath);
    }
  });
}

// Main execution
if (require.main === module) {
  const buildPath = path.join(__dirname, '..', 'build');
  console.log('🧹 Cleaning production build...');
  cleanBuildDirectory(buildPath);
  console.log('✅ Production build cleaned!');
}

module.exports = { removeConsoleLogs, cleanBuildDirectory }; 