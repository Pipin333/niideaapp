import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { LocalPartyHub } from './src/server/room-hub';

export default defineConfig({
  integrations: [tailwind()],
  server: {
    port: 4321,
    host: true
  },
  vite: {
    plugins: [
      {
        name: 'ni-idea-partykit-local-hub',
        configureServer(server) {
          const partyHub = new LocalPartyHub();
          server.httpServer?.on('upgrade', (req, socket, head) => {
            partyHub.handleUpgrade(req, socket, head);
          });
        }
      }
    ]
  }
});
