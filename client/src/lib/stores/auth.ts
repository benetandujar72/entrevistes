import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
  id: string;
  email: string;
  nom: string;
  role: 'admin' | 'docent';
  picture?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    
    login: (user: User) => {
      update(state => ({
        ...state,
        user,
        isAuthenticated: true,
        isLoading: false,
      }));
      
      if (browser) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    },
    
    logout: () => {
      update(state => ({
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      }));
      
      if (browser) {
        localStorage.removeItem('user');
      }
    },
    
    initialize: () => {
      if (browser) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            update(state => ({
              ...state,
              user,
              isAuthenticated: true,
              isLoading: false,
            }));
          } catch (error) {
            console.error('Error parsing stored user:', error);
            localStorage.removeItem('user');
            update(state => ({
              ...state,
              isLoading: false,
            }));
          }
        } else {
          update(state => ({
            ...state,
            isLoading: false,
          }));
        }
      }
    },
    
    setLoading: (loading: boolean) => {
      update(state => ({
        ...state,
        isLoading: loading,
      }));
    },
  };
}

export const authStore = createAuthStore();
