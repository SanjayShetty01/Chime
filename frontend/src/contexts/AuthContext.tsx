import React, { createContext, useContext, useState, ReactNode } from "react";

interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const setCookie = (name: string, value: string, days: number) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
};

const getCookie = (name: string) => {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
};

const deleteCookie = (name: string) => {
  setCookie(name, '', -1);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = getCookie("chime-user");
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return getCookie("chime-token") || null;
  });

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setCookie("chime-token", newToken, 1);
    setCookie("chime-user", JSON.stringify(newUser), 1);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    deleteCookie("chime-token");
    deleteCookie("chime-user");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
