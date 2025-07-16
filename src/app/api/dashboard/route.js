export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { 
    getDashboardStats, 
    getTopPerformers, 
    getTodaysRatingTasks,
    getCompletedTasksToday,
    getPendingTasksToday
} from '@/lib/database';

export async function GET(request) {
    try {
        // Get and verify the JWT token from the Authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Access token required' },
                { status: 401 }
            );
        }
        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = verify(token, process.env.JWT_SECRET || 'your-secret-key');
        } catch (error) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            return NextResponse.json(
                { error: 'Token expired' },
                { status: 401 }
            );
        }
        if (!decoded.isAdmin) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Get query parameters for filtering
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period'); // 'week' or 'month'
        const limit = parseInt(searchParams.get('limit')) || 10;

        // Get dashboard data from database
        const [stats, topPerformers, completedTasks, pendingTasks] = await Promise.all([
            getDashboardStats(),
            getTopPerformers(period || 'week', limit),
            getCompletedTasksToday(),
            getPendingTasksToday()
        ]);

        // Format top performers data
        const formattedTopPerformers = topPerformers.map(performer => ({
            id: performer.id,
            name: performer.name,
            email: performer.email,
            profilePicture: performer.profile_picture || '/api/uploads/default.jpg',
            averageRating: parseFloat(performer.average_rating).toFixed(1),
            totalRooms: parseInt(performer.total_rooms),
            period: performer.period
        }));

        // Format tasks data
        const formatTask = (task) => ({
            id: task.id,
            buildingName: task.building_name,
            floorNumber: task.floor_name, // fix: use floor_name
            roomNumber: task.room_name,   // fix: use room_name
            employeeName: task.employee_name,
            employeeId: task.employee_id,
            lastRating: parseFloat(task.last_rating) || 0,
            lastRatingDate: task.last_rating_date,
            status: task.status
        });

        const formattedCompletedTasks = completedTasks.map(formatTask);
        const formattedPendingTasks = pendingTasks.map(formatTask);

        return NextResponse.json({
            topPerformers: formattedTopPerformers,
            todaysRatingTasks: formattedPendingTasks,
            completedTasks: formattedCompletedTasks,
            summary: {
                totalTasksToday: formattedCompletedTasks.length + formattedPendingTasks.length,
                completedTasks: formattedCompletedTasks.length,
                pendingTasksToday: formattedPendingTasks.length,
                averageRating: parseFloat(stats.monthly_avg_rating || 0).toFixed(1),
                totalEmployees: parseInt(stats.total_employees || 0),
                totalBuildings: parseInt(stats.total_buildings || 0)
            },
            currentUser: {
                id: decoded.userId,
                email: decoded.email,
                userType: decoded.userType
            }
        });
    } catch (error) {
        console.error('Dashboard error: ', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}