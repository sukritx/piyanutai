import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true
});

// Function to fetch CSRF token
const fetchCSRFToken = async () => {
    try {
        const response = await api.get('/api/v1/auth/csrf-token');
        api.defaults.headers.common['X-CSRF-Token'] = response.data.csrfToken;
        return response.data.csrfToken;
    } catch (error) {
        console.error('Error fetching CSRF token:', error);
        throw error;
    }
};

// Add request interceptor
api.interceptors.request.use(
    async config => {
        // Don't modify the CSRF token for the csrf-token endpoint
        if (config.url === '/api/v1/auth/csrf-token') {
            return config;
        }

        // Ensure we have a CSRF token
        if (!api.defaults.headers.common['X-CSRF-Token']) {
            await fetchCSRFToken();
        }

        // For multipart form data, we need to set the content type properly
        if (config.data instanceof FormData) {
            config.headers['Content-Type'] = 'multipart/form-data';
        }

        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// Add response interceptor
api.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.status === 403 && error.response?.data?.message === 'Invalid CSRF token') {
            // Refresh token and retry request
            await fetchCSRFToken();
            return api(error.config);
        }
        return Promise.reject(error);
    }
);

// Initial CSRF token fetch
fetchCSRFToken().catch(console.error);

export default api;