import React, { createContext, useContext, useState, ReactNode } from "react";

interface User {
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cookieMatch = document.cookie.split('; ').find(row => row.startsWith('chime-user-name='));
    if (cookieMatch) {
      const name = decodeURIComponent(cookieMatch.split('=')[1]);
      if (name) {
        return { name };
      }
    }
    return null;
  });

  const login = (name: string) => {
    setUser({ name });
    const maxAge = 4 * 60 * 60; // 4 hours in seconds
    document.cookie = `chime-user-name=${encodeURIComponent(name)}; max-age=${maxAge}; path=/; SameSite=Lax`;
  };

  const logout = () => {
    setUser(null);
    document.cookie = "chime-user-name=; max-age=0; path=/;";
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
