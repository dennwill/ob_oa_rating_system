import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
    try {
        // get current user from request headers (set by middleware)
        const user = getCurrentUser(request);

        // Return user profile without sensitive information
        const userProfile = {
            id: user.id,
            email: user.email,
            userType: user.userType,
            isAdmin: user.isAdmin
        };

        return NextResponse.json({
            user: userProfile
        });
    } catch (error) {
        console.error('Get current user error:', error);
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 } 
        );
    }
}