import {randomUUID} from 'node:crypto';
import {open, readFile, realpath, rename, rm} from 'node:fs/promises';
import {basename, dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

// One room service owns the file. Keep it outside the editor and player asset roots.
export async function roomStorage(path) {
  const requested = resolve(path);
  const editorRoot = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
  const parent = await realpath(dirname(requested));
  const fromRoot = relative(editorRoot, parent);
  if (fromRoot !== '..' && !fromRoot.startsWith('..' + sep) && !isAbsolute(fromRoot)) {
    throw new Error('Keep the VTT snapshot outside the editor repository');
  }
  const target = join(parent, basename(requested));
  return {
    async load() {
      let contents;
      try {
        contents = await readFile(target, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
      }
      const snapshot = JSON.parse(contents);
      if (snapshot?.version !== 1) throw new Error('Unsupported VTT room snapshot');
      return snapshot;
    },
    async save(room) {
      const temporary = target + '.' + randomUUID() + '.tmp';
      const file = await open(temporary, 'wx', 0o600);
      try {
        try {
          await file.writeFile(JSON.stringify({
            version: 1, ...room, cells: [...room.cells.values()],
            pois: [...room.pois.values()].flat()
          }));
          await file.sync();
        } finally {
          await file.close();
        }
        // Readers see the last complete snapshot even if the service stops during a write.
        await rename(temporary, target);
      } catch (error) {
        await rm(temporary, {force: true}).catch(() => {});
        throw error;
      }
    }
  };
}
