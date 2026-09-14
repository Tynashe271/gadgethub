// app/hooks/useAuth.ts
import { useStore } from '../context/StoreContext';
import type { AuthResponse } from '@/types';

export function useAuth() {
  const { token, user, login, logout, loadUser } = useStore();

  return {
    isAuthenticated: token,
    user,
    login: (data: AuthResponse) => login(data),
    logout,
    loadUser,
  };
}
