// Local integration harness. The editor and player service use separate loopback origins.
import {randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createServer} from 'vite';
import {startPreview} from './server.mjs';

export async function startEditorPreview() {
  const launchKey = randomBytes(24).toString('base64url');
  let editorUrl;
  const {server, base} = await startPreview({editorOrigin: () => editorUrl, launchKey});
  let editor;
  const close = async () => {
    await Promise.all([editor?.close(), new Promise(resolve => server.close(resolve))]);
  };
  try {
    editor = await createServer({
      define: {
        __HEXCRAWL_VTT_PREVIEW_URL__: JSON.stringify(base),
        __HEXCRAWL_VTT_PREVIEW_KEY__: JSON.stringify(launchKey)
      },
      server: {host: '127.0.0.1', port: 0}
    });
    await editor.listen();
    editorUrl = 'http://127.0.0.1:' + editor.httpServer.address().port;
    return {editorUrl, roomUrl: base, close};
  } catch (error) {
    await close();
    throw error;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const preview = await startEditorPreview();
  console.log(preview.editorUrl);
}
