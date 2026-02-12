<!-- CRITICAL -->
# frontend

Next.js web UI for vLLM Studio.

## Local Development

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

By default, browser requests go through `/api/proxy`, which forwards to the controller backend using `/api/settings`.

## Validation

```bash
cd frontend
npm run build
npm run lint
npm test
```

## Runtime Notes

- Production start command: `npm run start` (standalone server).
- Backend URL/API key can be configured in the app `Configs` page.
- Proxy route: `src/app/api/proxy/[...path]/route.ts`.

