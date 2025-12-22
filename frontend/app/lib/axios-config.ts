import axios from 'axios';

// Auto-detect API URL based on current hostname
// Returns { baseURL, shouldRemoveApiPrefix }
const getApiConfig = () => {
  const isServer = typeof window === 'undefined';
  
  if (isServer) {
    // Server-side: use environment variable or default to localhost backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    console.log('[AXIOS CONFIG] Server-side API URL:', apiUrl);
    return { baseURL: apiUrl, shouldRemoveApiPrefix: true };
  }
  
  // Client-side: detect from browser
  const hostname = window.location.hostname;
  const protocol = window.location.protocol; // http: or https:
  const port = window.location.port;
  
  // If accessing via domain (cards.sybota.space or sybota.space), use same domain for API
  // Nginx will handle /api prefix removal
  if (hostname === 'cards.sybota.space' || hostname === 'sybota.space' || hostname === 'www.sybota.space') {
    const apiUrl = `${protocol}//${hostname}`;
    console.log('[AXIOS CONFIG] Client-side API URL (domain):', apiUrl);
    return { baseURL: apiUrl, shouldRemoveApiPrefix: false }; // Nginx handles it
  }
  
  // If accessing via external IP, use same IP for API
  if (hostname === '46.191.230.86') {
    const apiUrl = `http://46.191.230.86:3002`;
    console.log('[AXIOS CONFIG] Client-side API URL (external IP):', apiUrl);
    return { baseURL: apiUrl, shouldRemoveApiPrefix: true }; // Direct to backend, no /api
  }
  
  // If accessing via IP address (local network), use same IP for API
  if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
    const apiUrl = `http://${hostname}:3002`;
    console.log('[AXIOS CONFIG] Client-side API URL (local network):', apiUrl);
    return { baseURL: apiUrl, shouldRemoveApiPrefix: true }; // Direct to backend, no /api
  }
  
  // If accessing via localhost, use localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    console.log('[AXIOS CONFIG] Client-side API URL (localhost):', apiUrl);
    return { baseURL: apiUrl, shouldRemoveApiPrefix: true }; // Direct to backend, no /api
  }
  
  // Fallback to env variable or default
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  console.log('[AXIOS CONFIG] Client-side API URL (fallback):', apiUrl);
  return { baseURL: apiUrl, shouldRemoveApiPrefix: true }; // Direct to backend, no /api
};

const apiConfig = getApiConfig();
const API_URL = apiConfig.baseURL;
const SHOULD_REMOVE_API_PREFIX = apiConfig.shouldRemoveApiPrefix;

// Create axios instance with interceptors for logging
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout for faster error handling
});

// Request interceptor - log outgoing requests and handle /api prefix
apiClient.interceptors.request.use(
  (config) => {
    const isServer = typeof window === 'undefined';
    const token = !isServer ? localStorage.getItem('token') : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Remove /api prefix for localhost/direct backend access
    // On domain, nginx handles /api prefix removal
    if (!isServer && SHOULD_REMOVE_API_PREFIX && config.url?.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api/, '');
      console.log('[AXIOS CONFIG] Removed /api prefix, new URL:', config.url);
    }

    // Log request with server/client indicator
    const logData = {
      environment: isServer ? 'SERVER' : 'CLIENT',
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: {
        ...config.headers,
        Authorization: config.headers.Authorization ? 'Bearer ***' : undefined,
      },
      data: config.data,
      params: config.params,
    };
    
    if (isServer) {
      // Server-side logging (will appear in Docker logs)
      console.log('[AXIOS REQUEST SERVER]', JSON.stringify(logData, null, 2));
    } else {
      // Client-side logging (will appear in browser console)
      console.log('[AXIOS REQUEST CLIENT]', logData);
    }

    return config;
  },
  (error) => {
    const isServer = typeof window === 'undefined';
    const prefix = isServer ? '[AXIOS REQUEST ERROR SERVER]' : '[AXIOS REQUEST ERROR CLIENT]';
    console.error(prefix, error);
    return Promise.reject(error);
  }
);

// Response interceptor - log incoming responses
apiClient.interceptors.response.use(
  (response) => {
    const isServer = typeof window === 'undefined';
    const logData = {
      environment: isServer ? 'SERVER' : 'CLIENT',
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      data: response.data,
    };
    
    if (isServer) {
      console.log('[AXIOS RESPONSE SERVER]', JSON.stringify(logData, null, 2));
    } else {
      console.log('[AXIOS RESPONSE CLIENT]', logData);
    }
    return response;
  },
  (error) => {
    const isServer = typeof window === 'undefined';
    const logData = {
      environment: isServer ? 'SERVER' : 'CLIENT',
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      data: error.response?.data,
      headers: error.response?.headers,
    };
    
    if (isServer) {
      console.error('[AXIOS RESPONSE ERROR SERVER]', JSON.stringify(logData, null, 2));
    } else {
      console.error('[AXIOS RESPONSE ERROR CLIENT]', logData);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
