"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
    const [ isLoading, setIsLoading ] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkAuthAndRedirect = async () => {
            try {
                // fetch token from localStorage

                const token = localStorage.getItem('token');

                if (!token) {
                    // if token is not found, redirect to login
                    router.push("/login")
                    return;
                }

                // verify token and get user info
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    // Token is invalid, redirect to login
                    localStorage.removeItem('token');
                    router.push('/login');
                    return;
                }

                const userData = await response.json();

                // redirect based on user role
                if (userData.user.isAdmin) {
                    router.push('/admin/dashboard');
                } else {
                    router.push('/employees/dashboard');
                }

            } catch (error) {
                console.error('Auth check error:', error);
                localStorage.removeItem('token');
                router.push('/login');
            } finally {
                setIsLoading(false);
            }
        };
        
        checkAuthAndRedirect();
        
    }, [router]);

    if (!isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }
    // This should never be reached, but just in case
    return null;
}
