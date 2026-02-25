"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    googleAccessToken: string | null;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    googleAccessToken: null,
    signInWithGoogle: async () => { },
    signOut: async () => { },
    getIdToken: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

    useEffect(() => {
        // Hydrate token from sessionStorage on mount
        const savedToken = sessionStorage.getItem('google_access_token');
        if (savedToken) {
            console.log("DEBUG: Hydrating Google Access Token from sessionStorage");
            setGoogleAccessToken(savedToken);
        } else {
            console.log("DEBUG: No Google Access Token found in sessionStorage");
        }

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            console.log("DEBUG: Firebase Auth State Changed. User:", firebaseUser?.email);
            setUser(firebaseUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        console.log("DEBUG: Starting Google Sign-In with scopes/provider...");
        const result = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential) {
            const token = credential.accessToken || null;
            console.log("DEBUG: Google Sign-In Success. Token Present:", !!token);
            setGoogleAccessToken(token);
            if (token) {
                sessionStorage.setItem('google_access_token', token);
            }
        } else {
            console.log("DEBUG: Google Sign-In Success but no credential found");
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        setGoogleAccessToken(null);
        sessionStorage.removeItem('google_access_token');
    };

    const getIdToken = async (): Promise<string | null> => {
        if (!user) return null;
        return user.getIdToken();
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, googleAccessToken, signInWithGoogle, signOut, getIdToken }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
