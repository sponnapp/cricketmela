// Cloudflare Pages Functions - SPA Redirect
// This handles client-side routing for React Router

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Don't redirect API calls or static assets
  if (url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/assets') ||
      url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf)$/)) {
    return context.next();
  }

  // For all other routes, return index.html (SPA routing)
  return context.env.ASSETS.fetch(new URL('/index.html', context.request.url));
}

