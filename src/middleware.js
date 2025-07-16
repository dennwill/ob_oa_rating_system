import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// define protected routes
const protectedRoutes = {
    // admin-only routes
    admin: [
        '/api/dashboard',
        '/api/ratings',
        '/api/employees',
        '/api/facilities',
        '/api/history',
        '/api/upload',
        '/api/admin'
    ],

    // employee routes
    employee: [
        '/api/employee/profile',
        '/api/employee/ratings'
    ],

    both: [
        '/api/auth/profile',
        '/api/auth/logout',
        '/api/auth/me'
    ]
};

function matchesRoute(path, routes) {
    return routes.some(route => {
        if (route === path) return true;

        // pattern match for dynamic routes like /api/employees/{id}
        if (route.includes('[') && route.includes(']')) {
            const routePattern = route.replace(/\[.*?\]/g, '[^/]+');
            const regex = new RegExp(`^${routePattern}$`);
            return regex.test(path);
        }

        // prefix match for admin routes

        if (route === '/api/admin' && path.startsWith('/api/admin')) {
            return true;
        }

        return false;
    });
}

// helper function to get required role for a path
function getRequiredRole(path) {
    if (matchesRoute(path, protectedRoutes.admin)) return 'admin';
    if (matchesRoute(path, protectedRoutes.employee)) return 'employee';
    if (matchesRoute(path, protectedRoutes.both)) return 'both';
    return null;
}

export async function middleware (request) {
    const { pathname } = request.nextUrl;

    // skip middleware for public routes
    if (pathname === '/api/auth/login' ||
        pathname.startsWith('/_next_/') ||
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/uploads/')) {
        
        return NextResponse.next();
    }

    // check if route requires authentication
    const requiredRole = getRequiredRole(pathname);

    if (!requiredRole) {
        // route that does not require auth
        return NextResponse.next();
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
            { error: 'Access token required' },
            { status: 401 }
        );
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify the JWT token
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
        const { payload } = await jwtVerify(token, secret);

        // Check if token is expired
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            return NextResponse.json(
                { error: 'Token expired' },
                { status: 401 }
            );
        }

        // Check role requirements
        if (requiredRole === 'admin' && !payload.isAdmin) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        if (requiredRole === 'employee' && payload.isAdmin) {
            return NextResponse.json(
                { error: 'Employee access required' },
                { status: 403 }
            );
        }

        // Set user information in headers for API routes to use
        const response = NextResponse.next();
        response.headers.set('x-user-id', (payload.userId || payload.id)?.toString() || '');
        response.headers.set('x-user-email', payload.email || '');
        response.headers.set('x-user-type', payload.userType || '');
        response.headers.set('x-is-admin', payload.isAdmin?.toString() || 'false');

        return response;

    } catch (error) {
        console.error('JWT verification error:', error);
        return NextResponse.json(
            { error: 'Invalid token' },
            { status: 401 }
        );
    }
}

// configure which paths the middleware should run on
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|public/).*)',
    ],
};