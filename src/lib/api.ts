// src/lib/api.ts
import { API_BASE_URL } from '@/config';

export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('authToken');

  // Prepare headers
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  // Ensure Content-Type is set for POST/PUT if body exists
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Combine options
  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, fetchOptions);

    // Basic error handling for common auth issues
    if (response.status === 401 || response.status === 403) {
      console.error('Authentication error:', response.status);
      localStorage.removeItem('authToken');
      // Simple redirect - Consider a more robust solution via AuthContext later
      window.location.href = '/login';
      throw new Error('Authentication required or forbidden.');
    }

    return response; // Return the raw response

  } catch (error) {
    console.error('API call failed:', error);
    throw error; // Re-throw error
  }
};