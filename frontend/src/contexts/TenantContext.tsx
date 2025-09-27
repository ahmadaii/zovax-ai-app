import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant, User } from '@/types/tenant.ts';
import { mockDataService } from '@/services/mockDataService.ts';

interface TenantContextType {
  currentTenant: Tenant | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string, companyName: string, whatsappPhone: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!currentUser && !!currentTenant;

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('currentUser');
    const savedTenant = localStorage.getItem('currentTenant');
    
    if (savedUser && savedTenant) {
      setCurrentUser(JSON.parse(savedUser));
      setCurrentTenant(JSON.parse(savedTenant));
    }
    
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Mock authentication - in real app, this would be an API call
      const result = await mockDataService.authenticate(email, password);
      
      if (result.success && result.user && result.tenant) {
        setCurrentUser(result.user);
        setCurrentTenant(result.tenant);
        
        // Save to localStorage for persistence
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        localStorage.setItem('currentTenant', JSON.stringify(result.tenant));
        
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Authentication failed' };
      }
    } catch (error) {
      return { success: false, error: 'Authentication failed' };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    name: string, 
    email: string, 
    password: string, 
    companyName: string, 
    whatsappPhone: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Mock registration - in real app, this would be an API call
      const result = await mockDataService.register(name, email, password, companyName, whatsappPhone);
      
      if (result.success && result.user && result.tenant) {
        setCurrentUser(result.user);
        setCurrentTenant(result.tenant);
        
        // Save to localStorage for persistence
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        localStorage.setItem('currentTenant', JSON.stringify(result.tenant));
        
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, error: 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    setCurrentUser(null);
    setCurrentTenant(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentTenant');
  };

  const value: TenantContextType = {
    currentTenant,
    currentUser,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    loading,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}