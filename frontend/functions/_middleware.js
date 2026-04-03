// Cloudflare Pages Functions - SPA Redirect
// This handles client-side routing for React Router

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Don't redirect API calls, auth calls, or static assets
  if (url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/auth') ||
      url.pathname.startsWith('/assets') ||
      url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf|webmanifest)$/)) {
    return context.next();
  }

  // For all other routes, return index.html (SPA routing)
  // Preserve query string so /?page=matches&season=2 survives the rewrite
  const indexUrl = new URL('/index.html', context.request.url);
  indexUrl.search = url.search;
  return context.env.ASSETS.fetch(indexUrl);
}

