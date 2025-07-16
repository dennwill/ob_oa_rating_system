"use client";

import { useState } from 'react';
import Sidebar from './Sidebar';

export default function AdminLayout({ children, userType = 'admin' }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen">
            {/* Sidebar for desktop: always visible, fixed */}
            <div className="hidden md:block">
                <div className="fixed left-0 top-0 h-screen w-64 z-50">
                    <Sidebar userType={userType} open={true} />
                </div>
            </div>
            {/* Sidebar for mobile: overlay, toggled by hamburger */}
            <div className="md:hidden">
                <Sidebar userType={userType} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            </div>
            {/* Hamburger menu for mobile */}
            <button
                className="md:hidden fixed top-4 left-4 z-50 bg-white rounded-full p-2 shadow-lg border border-gray-200"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
            >
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-menu"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            {/* Main content: full width on mobile, margin on desktop */}
            <div className="flex-1 w-full bg-gray-50 min-h-screen p-4 md:ml-64 md:p-8 transition-all">
                {children}
            </div>
        </div>
    );
}