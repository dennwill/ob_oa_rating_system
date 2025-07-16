import { getHistory, logHistory } from '@/lib/database.js';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

// Mock data
// let activityLogs = [
//     {
//         id: 1,
//         action: 'LOGIN',
//         description: 'Admin logged in successfully',
//         userId: 1,
//         userName: 'Admin User',
//         userEmail: 'admin@company.com',
//         targetType: 'auth',
//         targetId: null,
//         targetName: null,
//         details: {
//         ipAddress: '192.168.1.100',
//         userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//         },
//         timestamp: '2024-01-15T10:00:00Z'
//     },
//     {
//         id: 2,
//         action: 'CREATE_EMPLOYEE',
//         description: 'New employee created',
//         userId: 1,
//         userName: 'Admin User',
//         userEmail: 'admin@company.com',
//         targetType: 'employee',
//         targetId: 3,
//         targetName: 'Mike Johnson',
//         details: {
//             employeeEmail: 'mike@company.com',
//             assignedBuilding: 'Building A',
//             assignedFloor: 2
//         },
//         timestamp: '2024-01-15T09:30:00Z'
//     },
//     {
//         id: 3,
//         action: 'UPDATE_RATING',
//         description: 'Rating updated for room A101',
//         userId: 1,
//         userName: 'Admin User',
//         userEmail: 'admin@company.com',
//         targetType: 'rating',
//         targetId: 1,
//         targetName: 'Room A101',
//         details: {
//             employeeId: 1,
//             employeeName: 'John Doe',
//             oldRating: 8,
//             newRating: 9,
//             notes: 'Excellent improvement in cleaning quality'
//         },
//         timestamp: '2024-01-15T09:15:00Z'
//     },
//     {
//         id: 4,
//         action: 'DELETE_EMPLOYEE',
//         description: 'Employee deleted',
//         userId: 1,
//         userName: 'Admin User',
//         userEmail: 'admin@company.com',
//         targetType: 'employee',
//         targetId: 4,
//         targetName: 'Sarah Wilson',
//         details: {
//             employeeEmail: 'sarah@company.com',
//             reason: 'Resigned from position'
//         },
//         timestamp: '2024-01-15T08:45:00Z'
//     },
//     {
//         id: 5,
//         action: 'ADD_RATING',
//         description: 'New rating added for room B201',
//         userId: 1,
//         userName: 'Admin User',
//         userEmail: 'admin@company.com',
//         targetType: 'rating',
//         targetId: 2,
//         targetName: 'Room B201',
//         details: {
//             employeeId: 2,
//             employeeName: 'Jane Smith',
//             rating: 8,
//             notes: 'Good cleaning service'
//         },
//         timestamp: '2024-01-15T08:30:00Z'
//     },
//     {
//         id: 6,
//         action: 'UPDATE_EMPLOYEE',
//         description: 'Employee information updated',
//         userId: 1,
//         userName: 'Admin User',
//         userEmail: 'admin@company.com',
//         targetType: 'employee',
//         targetId: 1,
//         targetName: 'John Doe',
//         details: {
//             field: 'assignedFloor',
//             oldValue: 1,
//             newValue: 2
//         },
//         timestamp: '2024-01-15T08:00:00Z'
//     },
//     {
//         id: 7,
//         action: 'CREATE_BUILDING',
//         description: 'New building added to system',
//         userId: 1,
//         userName: 'Admin User',
//         userEmail: 'admin@company.com',
//         targetType: 'building',
//         targetId: 3,
//         targetName: 'Building C',
//         details: {
//             address: '789 Pine Street',
//             totalFloors: 4
//         },
//         timestamp: '2024-01-14T16:30:00Z'
//     },
//     {
//         id: 8,
//         action: 'LOGOUT',
//         description: 'Admin logged out',
//         userId: 1,
//         userName: 'Admin User',
//         userEmail: 'admin@company.com',
//         targetType: 'auth',
//         targetId: null,
//         targetName: null,
//         details: {
//             sessionDuration: '8 hours 30 minutes'
//         },
//         timestamp: '2024-01-14T16:00:00Z'
//     }
// ];

async function authenticateAdmin(request) {
    const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return NextResponse.json(
              { error: 'Access token required' },
              { status: 401 }
            );
    }
      const token = authHeader.split(' ')[1];
      let currentUser;
      try {
          currentUser = verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
          return NextResponse.json(
              { error: 'Invalid token' },
              { status: 401 }
            );
    }
      if (currentUser.exp && Date.now() >= currentUser.exp * 1000) {
          return NextResponse.json(
              { error: 'Token expired' },
              { status: 401 }
            );
    }
      if (!currentUser.isAdmin) {
          return NextResponse.json(
              { error: 'Admin access required' },
              { status: 403 }
            );
    }
      
    return currentUser;
}

// GET - get activity logs with filtering and pagination
export async function GET(request) {
    try {
        const currentUser = await authenticateAdmin(request);

        const { searchParams } = new URL(request.url);
        const filters = {};
        if (searchParams.get('action')) filters.action = searchParams.get('action');
        if (searchParams.get('userId')) filters.user_id = searchParams.get('userId');
        if (searchParams.get('tableName')) filters.table_name = searchParams.get('tableName');
        if (searchParams.get('limit')) filters.limit = parseInt(searchParams.get('limit'));
        if (searchParams.get('from')) filters.from = searchParams.get('from');
        if (searchParams.get('to')) filters.to = searchParams.get('to');

        // You can add more filters as needed

        const logs = await getHistory(filters);

        return NextResponse.json({
            logs,
            currentUser: {
                id: currentUser.id || currentUser.userId,
                email: currentUser.email,
                userType: currentUser.userType
            }
        });
    } catch (error) {
        console.error('Get history error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Admin access required' ? 403 : 500 }
        );
    }
}

// POST - add new activity log (for internal use)
export async function POST(request) {
    try {
        const currentUser = await authenticateAdmin(request);

        const { action, tableName, recordId, oldValues, newValues, ipAddress, userAgent } = await request.json();

        // validate required fields
        if (!action) {
            return NextResponse.json(
                { error: 'Action is required' },
                { status: 400 }
            );
        }

        // create new log entry in the database
        await logHistory({
            user_id: currentUser.id || currentUser.userId,
            action,
            table_name: tableName,
            record_id: recordId,
            old_values: oldValues,
            new_values: newValues,
            ip_address: ipAddress,
            user_agent: userAgent
        });

        return NextResponse.json({
            message: 'Activity log created successfully'
        }, { status: 201 });
    } catch (error) {
        console.error('Add activity log error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Admin access required' ? 403 : 500 }
        );
    }
}