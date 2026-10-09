const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Generating third-party licenses...');

try {
  // Run license-checker to get JSON of production dependencies
  const rawJson = execSync('npx --yes license-checker --production --json', {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });

  const packages = JSON.parse(rawJson);
  let output = '================================================================================\n';
  output += 'MOVIEALBUM - THIRD-PARTY SOFTWARE LICENSES AND NOTICES\n';
  output += '================================================================================\n\n';
  output += 'This software includes third-party open-source components.\n';
  output += 'The following list provides details about their licenses, copyrights, and notices.\n\n';

  for (const [pkgName, info] of Object.entries(packages)) {
    // Skip self
    if (pkgName.startsWith('movie-album@')) continue;

    output += '--------------------------------------------------------------------------------\n';
    output += `Package:    ${pkgName}\n`;
    output += `License:    ${info.licenses || 'Unknown'}\n`;
    if (info.repository) output += `Repository: ${info.repository}\n`;
    if (info.publisher) output += `Publisher:  ${info.publisher}\n`;
    output += '--------------------------------------------------------------------------------\n';

    if (info.licenseFile && fs.existsSync(info.licenseFile)) {
      try {
        const text = fs.readFileSync(info.licenseFile, 'utf-8').trim();
        output += `${text}\n\n`;
      } catch (e) {
        output += `License text could not be read (${info.licenseFile})\n\n`;
      }
    } else {
      output += `(License: ${info.licenses})\n\n`;
    }
  }

  const outDir = path.resolve(__dirname, '../licenses');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'THIRD_PARTY_LICENSES.txt');
  fs.writeFileSync(outFile, output, 'utf-8');
  console.log(`Successfully generated licenses at: ${outFile}`);
} catch (err) {
  console.error('Error generating licenses:', err);
  process.exit(1);
}
