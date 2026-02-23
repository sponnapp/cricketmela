// API Configuration
// Automatically uses the correct API URL based on environment

const getApiUrl = () => {
  // In production, use the environment variable set by Cloudflare Pages
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // In development, use localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:4000';
  }

  // Fallback to relative path (same domain)
  return '';
};

export const API_URL = getApiUrl();
export const API_BASE = `${API_URL}/api`;

console.log('API Configuration:', { API_URL, API_BASE, env: import.meta.env.MODE });

