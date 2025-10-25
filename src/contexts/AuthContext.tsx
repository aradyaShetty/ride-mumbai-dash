// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '@/config'; // Import base URL

// Define User type based on backend User entity
interface User {
  userId: number;
  username: string; // Corresponds to 'name' field from frontend Register form
  email: string;
  role: 'ROLE_COMMUTER' | 'ROLE_ADMIN';
  // Add Commuter/Admin specific fields if needed after fetching
  walletBalance?: number; // Example for Commuter
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean; // To track loading state during API calls
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (details: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>; // <-- ADD THIS
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken')); // <-- Ensure this line is correct
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true until initial check done

  // --- Helper: Fetch user details using a token ---
  const fetchUserDetails = async (authToken: string) => {
    setIsLoading(true); // Start loading when fetching details
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (!response.ok) {
        // If token is invalid/expired, backend will likely return 401 or 403
        throw new Error(`Failed to fetch user details (Status: ${response.status})`);
      }
      const userData: User = await response.json();
      setUser(userData);
      setToken(authToken); // Ensure token state matches valid user
      localStorage.setItem('authToken', authToken); // Refresh token in storage if needed
      console.log("User details fetched:", userData);
    } catch (error) {
      console.error("Error fetching user details:", error);
      // Clear auth state if token is invalid
      setUser(null);
      setToken(null);
      localStorage.removeItem('authToken');
    } finally {
      setIsLoading(false); // Stop loading after fetch attempt
    }
  };

  // --- NEW FUNCTION ---
  const refreshUser = async () => {
    const currentToken = token || localStorage.getItem('authToken');
    if (currentToken) {
      console.log("Refreshing user details...");
      await fetchUserDetails(currentToken);
    } else {
      console.log("No token, cannot refresh user.");
    }
  };

  // --- Effect: Check for stored token on initial load ---
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      console.log("Found token in storage, fetching user details...");
      fetchUserDetails(storedToken); // Fetch user details if token exists
    } else {
      console.log("No token found in storage.");
      setIsLoading(false); // No token, stop loading
    }
  }, []); // Run only once on component mount

  // --- Login Function ---
  const login = async (credentials: { username: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        let errorMsg = `Login failed (Status: ${response.status})`;
        try { // Try to parse backend error message if available
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (_) {} // Ignore if error body isn't JSON
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      const data: { token: string } = await response.json();
      await fetchUserDetails(data.token); // Fetch details using the new token
      console.log("Login successful.");

    } catch (error) {
      console.error('Login error:', error);
      setUser(null); // Clear state on error
      setToken(null);
      localStorage.removeItem('authToken');
      throw error; // Re-throw for component to handle (e.g., show toast)
    } finally {
      setIsLoading(false);
    }
  };

  // --- Register Function ---
  const register = async (details: { name: string; email: string; password: string }) => {
     setIsLoading(true);
     try {
       const response = await fetch(`${API_BASE_URL}/auth/register`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(details), // Backend expects 'name' now
       });

       if (!response.ok) {
         let errorMsg = `Registration failed (Status: ${response.status})`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
          } catch (_) {}
         console.error(errorMsg);
         throw new Error(errorMsg);
       }

       const data: { token: string } = await response.json();
       await fetchUserDetails(data.token); // Fetch details using the new token
       console.log("Registration successful.");

     } catch (error) {
       console.error('Registration error:', error);
       setUser(null); // Clear state on error
       setToken(null);
       localStorage.removeItem('authToken');
       throw error; // Re-throw
     } finally {
        setIsLoading(false);
     }
  };

  // --- Logout Function ---
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    console.log("User logged out.");
    // Consider redirecting to login page using navigate() from react-router-dom if needed
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        token, 
        isAuthenticated: !!user && !!token, 
        isLoading, 
        login, 
        register, 
        logout,
        refreshUser // <-- ADD THIS
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Custom Hook: useAuth ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};