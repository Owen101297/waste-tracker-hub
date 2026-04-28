import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  User 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

type Role = 'admin' | 'client' | null;

interface AuthContextType {
  user: User | null;
  role: Role;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Auth] Initializing auth state listener');
    
    if (!auth || !db) {
      console.error('[Auth] Firebase not configured');
      setError('Firebase no configurado');
      setLoading(false);
      return;
    }

    console.log('[Auth] Listening for auth changes');

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] Auth state changed:', firebaseUser?.email);
      setUser(firebaseUser);
      
      if (firebaseUser) {
        console.log('[Auth] Fetching role for:', firebaseUser.uid);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          console.log('[Auth] User doc exists:', userDoc.exists());
          if (userDoc.exists()) {
            const userRole = userDoc.data().role || 'client';
            console.log('[Auth] Role from doc:', userRole);
            setRole(userRole);
          } else {
            console.log('[Auth] No user doc, defaulting to client');
            setRole('client');
          }
        } catch (err) {
          console.error('[Auth] Error fetching role:', err);
          setRole('client');
        }
      } else {
        setRole(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[Auth] Signing in:', email);
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (err: unknown) {
      console.error('[Auth] Sign in error:', err);
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      return { error: message };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error de Configuración</h1>
          <p className="text-red-500">{error}</p>
          <p className="text-sm text-gray-500 mt-4">Por favor contacta al administrador</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}