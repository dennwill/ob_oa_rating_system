"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import Image from 'next/image'
import EyeIcon from "@/components/ui/eye-icon";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
            try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Login failed");
            } else {
                // Handle successful login (e.g., redirect, store token, etc.)
                // For now, just log the user
                
                localStorage.setItem('token', data.token);

                // redirection
                if (data.user.isAdmin) {
                    router.push("/admin/dashboard");
                } else {
                    router.push("/employees/dashboard");
                }
            }
            } catch (err) {
            setError("Something went wrong. Please try again.");
            } finally {
            setLoading(false);
            }
        };

    return (
        <div 
        className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat relative"
        style={{
            backgroundImage: 'url("/ship-bg.jpg")'
        }}>
            {/* Dark overlay to dim the background */}
            <div className="absolute inset-0 bg-black/40"></div>
            <div className="text-center space-y-6 relative z-10">
                <Image 
                    src="/moda.png" 
                        alt="MODA Holdings" 
                        width={150} 
                        height={75} 
                        className="mx-auto"
                />
                <h1 className="text-3xl font-bold text-foreground text-white">Office Assistant Rating System</h1>
                <Card className="w-full max-w-md">
                <CardHeader>
                <CardTitle>Login</CardTitle>
                </CardHeader>
                <CardContent>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                    />
                    </div>
                    <div className="space-y-2 relative">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                        <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="pr-10"
                        />
                        <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                        <EyeIcon open={showPassword} />
                        </button>
                    </div>
                    </div>
                    {error && (
                    <div className="text-destructive text-sm font-medium">{error}</div>
                    )}
                    <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                    </Button>
                </form>
                </CardContent>
            </Card>
            </div>
        </div>
    );
}