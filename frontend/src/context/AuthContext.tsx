import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../types/auth';
import { UserRole } from '../types/auth';

interface AuthContextType {
    currentUser: User | null;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:8000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (response.status === 401) {
                setError('Invalid email or password');
                setCurrentUser(null);
                return;
            }

            if (!response.ok) {
                setError('Failed to login');
                setCurrentUser(null);
                return;
            }

            const user: User = await response.json();
            setCurrentUser(user);
        } catch (err) {
            console.error(err);
            setError('An error occurred during login');
            setCurrentUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (name: string, email: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:8000/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    U_NAME: name,
                    U_EMAIL: email,
                    U_PASSWORD: password,
                    // sign-ups are adopters by default
                    U_ROLE: UserRole.Adopter,
                }),
            });

            if (response.status === 400) {
                const data = await response.json().catch(() => null);
                const msg =
                    data && typeof data.detail === 'string'
                        ? data.detail
                        : 'Unable to sign up with those details';
                setError(msg);
                setCurrentUser(null);
                return;
            }

            if (!response.ok) {
                setError('Failed to sign up');
                setCurrentUser(null);
                return;
            }

            const user: User = await response.json();
            // auto-login after successful sign-up
            setCurrentUser(user);
        } catch (err) {
            console.error(err);
            setError('An error occurred during sign up');
            setCurrentUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setCurrentUser(null);
    };

    return (
        <AuthContext.Provider
            value={{ currentUser, login, register, logout, isLoading, error }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};