"use client";

import { useAuth } from "../../context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, LogIn } from "lucide-react";

export default function LoginPage() {
    const { user, loading, signInWithGoogle } = useAuth();
    const router = useRouter();
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && user) {
            router.push("/");
        }
    }, [user, loading, router]);

    const handleSignIn = async () => {
        setIsSigningIn(true);
        setError(null);
        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message || "Failed to sign in. Please try again.");
        } finally {
            setIsSigningIn(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (user) return null;

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
            {/* Animated background orbs */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl animate-pulse delay-500" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Login card */}
                <div className="glass rounded-3xl p-10 text-center space-y-8">
                    {/* Logo / Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30"
                    >
                        <Mail className="w-10 h-10 text-white" />
                    </motion.div>

                    {/* Title */}
                    <div>
                        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
                            Email Seeder Pro
                        </h1>
                        <p className="text-neutral-500 text-sm">
                            Sign in to automate your outreach
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-neutral-800" />
                        <span className="text-xs text-neutral-600 uppercase tracking-wider">
                            Continue with
                        </span>
                        <div className="flex-1 h-px bg-neutral-800" />
                    </div>

                    {/* Google Sign-In Button */}
                    <button
                        onClick={handleSignIn}
                        disabled={isSigningIn}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-100 text-neutral-900 font-semibold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {isSigningIn ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-neutral-900" />
                        ) : (
                            <>
                                {/* Google Icon SVG */}
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                <span>Sign in with Google</span>
                                <LogIn className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </>
                        )}
                    </button>

                    {/* Error message */}
                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-rose-400 text-sm bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20"
                        >
                            {error}
                        </motion.p>
                    )}

                    {/* Footer */}
                    <p className="text-xs text-neutral-600">
                        Your Google email will be used to access the dashboard
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
