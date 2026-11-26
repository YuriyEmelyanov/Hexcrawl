// Local integration harness. The editor and player service use separate loopback origins.
import {randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createServer} from 'vite';
import {startPreview} from './server.mjs';

export async function startEditorPreview({storagePath, roomPort = 0, editorPort = 0} = {}) {
  const launchKey = randomBytes(24).toString('base64url');
  let editorUrl;
  const options = {port: roomPort, storagePath, editorOrigin: () => editorUrl, launchKey};
  let service = await startPreview(options);
  options.port = service.server.address().port;
  const base = service.base;
  let editor;
  const closeRoom = () => service.close();
  const close = async () => {
    await Promise.all([editor?.close(), closeRoom()]);
  };
  try {
    editor = await createServer({
      define: {
        __HEXCRAWL_VTT_PREVIEW_URL__: JSON.stringify(base),
        __HEXCRAWL_VTT_PREVIEW_KEY__: JSON.stringify(launchKey)
      },
      server: {host: '127.0.0.1', port: editorPort, strictPort: true}
    });
    await editor.listen();
    editorUrl = 'http://127.0.0.1:' + editor.httpServer.address().port;
    return {editorUrl, roomUrl: base, close, async restartRoom() {
      await closeRoom();
      service = await startPreview(options);
    }};
  } catch (error) {
    await close();
    throw error;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  // Use the same editor and room origins to recover browser maps and player links.
  const storagePath = process.env.VTT_PREVIEW_STORAGE_PATH;
  const roomPort = Number(process.env.VTT_PREVIEW_PORT ?? (storagePath ? 4175 : 0));
  const editorPort = Number(process.env.VTT_PREVIEW_EDITOR_PORT ?? (storagePath ? 4174 : 0));
  const preview = await startEditorPreview({storagePath, roomPort, editorPort});
  console.log(preview.editorUrl);
}
