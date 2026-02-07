# Production Topology

## Current endpoints (example)
- Controller: `https://<controller-host>` -> `<controller-host-or-ip>:8080`
- Frontend: local Next dev server on the developer machine (`http://localhost:3000`), not public

## Expected request path
- Browser -> Next (`/api/proxy`) -> Controller

## Local dev with remote controller
- Set the backend URL in `/configs` and click Save.
- Run Next with `VLLM_STUDIO_DATA_DIR=<path-to-repo>/data` to persist `api-settings.json`.
- Optionally set `NEXT_PUBLIC_API_URL` (client) or `BACKEND_URL` (server) to prefill the backend URL.

## Optional public frontend
- If you expose the UI from the controller host, route a hostname (e.g. `studio.example.com`) to port `3000`.
- Keep `/api/proxy` on the frontend host and set `BACKEND_URL=https://<controller-host>`.
