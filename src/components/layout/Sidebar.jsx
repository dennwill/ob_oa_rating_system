"use client";

import { useRouter, usePathname } from "next/navigation";
import Image from 'next/image';
import { useEffect } from "react";

export default function Sidebar({ userType = 'admin', open = false, onClose }) {
    const router = useRouter();
    const pathname = usePathname();
    
    // Define menu items based on user type
    const getMenuItems = (type) => {
        switch (type) {
        case 'admin':
            return [
            { name: "Dashboard", path: "/admin/dashboard" },
            { name: "Ratings", path: "/admin/ratings" },
            { name: "Employees", path: "/admin/employees" },
            { name: "Facilities", path: "/admin/facilities" },
            { name: "History", path: "/admin/history" },
            ];
        case 'employee':
            return [
            { name: "Dashboard", path: "/employees/dashboard" },
            { name: "My Ratings", path: "/employees/ratings" },
            { name: "Profile", path: "/employees/profile" },
            ];
        default:
            return [
            { name: "Dashboard", path: "/dashboard" },
            ];
        }
    };

    const menuItems = getMenuItems(userType);
    const panelTitle = userType === 'admin' ? 'Admin Panel' : 'Employee Panel';

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    // Trap scroll when sidebar is open on mobile
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black/40 z-40 transition-opacity md:hidden ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden={!open}
            />
            {/* Sidebar panel */}
            <div
                className={`fixed left-0 top-0 z-50 h-screen w-64 bg-white shadow-lg transition-transform md:translate-x-0 md:static md:block
                    ${open ? 'translate-x-0' : '-translate-x-full'} md:transform-none`}
            >
                {/* Close button for mobile */}
                <button
                    className="md:hidden absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                    onClick={onClose}
                    aria-label="Close sidebar"
                >
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
                <div className="p-6">
                    <div className="flex items-center space-x-3 mb-8">
                        <Image 
                            src="/moda.png" 
                            alt="MODA Holdings" 
                            width={40} 
                            height={20} 
                            className="mx-auto"
                        />
                        <h2 className="text-lg font-semibold">{panelTitle}</h2>
                    </div>
                    <nav className="space-y-2">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.path;
                            return (
                                <button
                                    key={item.name}
                                    onClick={() => { router.push(item.path); if (onClose) onClose(); }}
                                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 cursor-pointer ${isActive ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <span>{item.name}</span>
                                </button>
                            );
                        })}
                    </nav>
                    <div className="mt-auto pt-8">
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 transition-colors flex items-center space-x-3"
                        >
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}