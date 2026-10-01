import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { User, UserRole } from "@/types";
import { authService } from "@/services/auth.service";
import { agentService } from '@/services/agent.service';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void; // Keeping for demo compatibility, but should be managed by API
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      console.log("AuthProvider: Initializing auth state, token found:", !!token);
      if (token) {
        try {
          const userData = await authService.getMe();
          console.log("AuthProvider: User data fetched successfully:", userData);
          setUser(userData);
        } catch (error) {
          console.error("AuthProvider: Failed to restore session", error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    console.log("AuthProvider: Attempting login for:", email);
    try {
      const tokens = await authService.login({ username: email, password });
      console.log("AuthProvider: Tokens received successfully");
      
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
      
      const userData = await authService.getMe();
      console.log("AuthProvider: User data after login:", userData);
      setUser(userData);
    } catch (error) {
      console.error("AuthProvider: Login or fetching user data failed", error);
      throw error;
    }
  };

  const logout = async () => {
    // End the assistant's conversation for this sign-in; the next one starts fresh.
    try {
      await agentService.endConversation();
    } catch {
      // best effort: an unended conversation also expires after 12 idle hours
    }
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch (error) {
        console.error("AuthProvider: Logout failed at backend", error);
      }
    }
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    console.log("AuthProvider: Switching role to:", role);
    // For demo purposes, we'll create a dummy user if none exists
    if (user) {
      setUser({ ...user, role });
    } else {
      setUser({
        id: "demo-user",
        name: "Demo " + role.charAt(0).toUpperCase() + role.slice(1),
        email: `demo.${role}@fincriss.com`,
        role: role
      });
    }
  };

  useEffect(() => {
    console.log("AuthProvider: Auth state updated, user:", user?.email, "isAuthenticated:", !!user);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchRole,
      }}
    >
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
