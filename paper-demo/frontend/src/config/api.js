// API Configuration
// React will replace process.env.REACT_APP_* variables at build time
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

export { API_BASE_URL };

// Helper function for API calls with consistent base URL
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Helper function for fetch with default options
export const apiFetch = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  return fetch(url, { ...defaultOptions, ...options });
};
