import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const profilePath = path.join(__dirname, '..', 'data', 'profile.json');

async function run() {
  try {
    const raw = await fs.readFile(profilePath, 'utf-8');
    console.log('Original profile:');
    console.log(raw);

    const profile = JSON.parse(raw);
    profile.collectorName = profile.collectorName + ' (test)';
    profile.avatar = 'https://placehold.co/80x80?text=IMG';

    await fs.writeFile(profilePath, JSON.stringify(profile, null, 2), 'utf-8');
    console.log('\nWrote updated profile. Reading back...');

    const updatedRaw = await fs.readFile(profilePath, 'utf-8');
    console.log(updatedRaw);

    // restore original by removing the appended test suffix
    const restored = JSON.parse(updatedRaw);
    restored.collectorName = restored.collectorName.replace(/ \(test\)$/, '');
    restored.avatar = null;
    await fs.writeFile(profilePath, JSON.stringify(restored, null, 2), 'utf-8');
    console.log('\nRestored original profile.');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

run();
