
2) index.js
```javascript
const fs = require('fs');
const path = require('path');

const CRITICAL_NAMES = [
  'System32',
  'SysWOW64',
  'Windows',
  'Program Files',
  'Program Files (x86)',
  'etc',
  'bin',
  'sbin',
  'lib',
  'usr',
  'boot',
  'root',
  'home'
];

const CRITICAL_EXTENSIONS = [
  '.exe', '.dll', '.sys', '.bat', '.cmd',
  '.json', '.yml', '.yaml', '.xml', '.conf',
  '.ini', '.key', '.pem'
];

function isSafeToDelete(filePath) {
  const name = path.basename(filePath).toLowerCase();
  const dir = path.dirname(filePath).toLowerCase();

  // skip hidden/system files
  if (name.startsWith('.') || name.startsWith('_')) {
    return false;
  }

  // skip critical folders
  for (const item of CRITICAL_NAMES) {
    if (dir.includes(item.toLowerCase())) {
      return false;
    }
  }

  // skip critical extensions
  const ext = path.extname(name);
  if (CRITICAL_EXTENSIONS.includes(ext.toLowerCase())) {
    return false;
  }

  return true;
}

function getOldFiles(folder, days) {
  const now = Date.now();
  const limitMs = days * 24 * 60 * 60 * 1000;
  const filesToDelete = [];
  const skippedFiles = [];

  function walk(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);

      try {
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // skip very important system folders
          const lowerName = item.toLowerCase();

          if (
            lowerName === 'windows' ||
            lowerName === 'system32' ||
            lowerName === 'syswow64' ||
            lowerName === 'program files' ||
            lowerName === 'program files (x86)' ||
            lowerName === 'etc' ||
            lowerName === 'usr' ||
            lowerName === 'bin' ||
            lowerName === 'lib'
          ) {
            continue;
          }

          walk(fullPath);
        } else {
          const ageMs = now - stat.mtimeMs;

          if (ageMs > limitMs) {
            if (isSafeToDelete(fullPath)) {
              filesToDelete.push(fullPath);
            } else {
              skippedFiles.push(fullPath);
            }
          }
        }
      } catch (error) {
        // ignore unreadable files
      }
    }
  }

  walk(folder);
  return { filesToDelete, skippedFiles };
}

function deleteFiles(list) {
  let deleted = 0;

  for (const file of list) {
    try {
      fs.rmSync(file, { recursive: true, force: true });
      console.log('Deleted:', file);
      deleted++;
    } catch (error) {
      console.log('Failed:', file, error.message);
    }
  }

  return deleted;
}

function main() {
  console.log('=== Old Sys File Cleanup ===');
  console.log('This tool deletes only old temp/cache/log files safely.');
  console.log('');

  const folder = process.argv[2];
  const daysArg = process.argv[3];

  if (!folder) {
    console.log('Usage: node index.js <folder_path> <days>');
    console.log('Example: node index.js C:\\Temp 30');
    console.log('Example: node index.js /tmp 7');
    return;
  }

  const days = Number(daysArg || 30);

  if (!fs.existsSync(folder)) {
    console.log('Folder not found:', folder);
    return;
  }

  const { filesToDelete, skippedFiles } = getOldFiles(folder, days);

  console.log('Files ready to delete:');
  if (filesToDelete.length === 0) {
    console.log('None');
  } else {
    for (const file of filesToDelete) {
      console.log(file);
    }
  }

  console.log('');
  console.log('Skipped important files:');
  if (skippedFiles.length === 0) {
    console.log('None');
  } else {
    for (const file of skippedFiles.slice(0, 20)) {
      console.log(file);
    }
  }

  console.log('');
  if (filesToDelete.length > 0) {
    const answer = prompt('Delete these files? (yes/no): ');

    if (answer && answer.toLowerCase() === 'yes') {
      const count = deleteFiles(filesToDelete);
      console.log('Deleted total:', count);
    } else {
      console.log('Cleanup cancelled.');
    }
  } else {
    console.log('No old files found to delete.');
  }
}

function prompt(message) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    readline.question(message, (answer) => {
      readline.close();
      resolve(answer);
    });
  });
}

(async () => {
  main();
})();