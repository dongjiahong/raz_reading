# ZenRead PDF - Deployment Guide

ZenRead PDF is a local-first React application that processes PDFs entirely in the browser using IndexedDB. It uses the Gemini API for AI capabilities.

## Prerequisites

*   **Node.js & npm/yarn/pnpm**: If you are building locally.
*   **Gemini API Key**: You need an API key from Google AI Studio.

## Environment Variables

The application requires the following environment variable to function correctly for AI features:

```
API_KEY=your_google_gemini_api_key_here
```

**Security Note:** Since this is a client-side application, the API key will be embedded in the build. It is recommended to restrict your API key in the Google Cloud Console to specific domains (websites) where you deploy this app to prevent unauthorized usage.

## Deployment Options

### 1. Static Hosting (Vercel, Netlify, GitHub Pages)

Since this is a Single Page Application (SPA) using Vite, it can be deployed to any static host.

**Vercel (Recommended)**

1.  Push your code to a GitHub/GitLab repository.
2.  Log in to Vercel and "Add New Project".
3.  Select your repository.
4.  Vercel automatically detects Vite.
5.  **Important:** In the "Environment Variables" section, add `API_KEY` with your Gemini API key value.
6.  Click **Deploy**.

**Netlify**

1.  Push code to Git.
2.  "New site from Git" in Netlify.
3.  Build command: `npm run build` (or `vite build`).
4.  Publish directory: `dist`.
5.  Add `API_KEY` in "Site settings" > "Build & deploy" > "Environment variables".

### 2. Local Development

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Create a `.env` file in the root directory:
    ```
    API_KEY=your_actual_api_key
    ```
3.  Start the server:
    ```bash
    npm run dev
    ```

## Technical Notes for Deployment

*   **PDF Worker**: The application is configured (`constants.ts`) to load the PDF.js worker from a CDN (`unpkg.com`) to ensure compatibility with various build systems without complex Webpack/Vite worker configuration.
*   **Cross-Origin Isolation**: If you plan to use advanced features like `SharedArrayBuffer` (not currently used but common in high-perf web apps), you might need specific headers (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`). For standard deployment, this is not required.
*   **IndexedDB**: All PDF files are stored in the user's browser (IndexedDB). If the user clears their browser cache/data, their library will be lost.

## Troubleshooting

*   **"Failed to fetch dynamically imported module"**: This usually happens if the PDF worker file path is incorrect. Ensure `constants.ts` points to a valid `.mjs` file on a CDN.
*   **AI features not working**: Check the browser console. If you see 401 or 403 errors, your `API_KEY` is missing or invalid.
