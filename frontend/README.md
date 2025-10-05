# NYU-ATLAS — Frontend

Minimal instructions to run the frontend locally.

Prerequisites
- Node.js (recommended v18+)
- npm or pnpm
- Mapbox account to get a Mapbox token

Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a .env file in the project root (or .env.local) and supply your values:
   ```env
   VITE_MAPBOX_TOKEN=pk.your_mapbox_public_token_here
   VITE_API_URL=https://your-backend.example.com/analyze
   ```
   - VITE_MAPBOX_TOKEN is required for Mapbox maps to render.
   - VITE_API_URL should point to the backend analyze endpoint used by the app. If omitted, the app will use the default fallback URL inside the code.

3. Restart the dev server after changing .env.

Run (development)
```bash
npm run dev
```
Open the URL printed by Vite (usually http://localhost:5173).

Build (production)
```bash
npm run build
npm run preview   # optional, to preview the production build locally
```

Notes
- The app reads the Mapbox token from import.meta.env.VITE_MAPBOX_TOKEN.
- The backend analyze endpoint is read from VITE_API_URL (or can be supplied via the Map component props).
- If maps or date-picker behavior appear incorrect, confirm the token and backend URL are valid and that the dev server was restarted after editing .env.
