import { NextResponse } from 'next/server';
import { getRows } from '@/lib/database';
import { verify } from 'jsonwebtoken';

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

// GET - get floor assignments for all employees
export async function GET(request) {
    try {
        await authenticateAdmin(request);
        
        const { searchParams } = new URL(request.url);
        const excludeEmployeeId = searchParams.get('excludeEmployeeId'); // Exclude current employee when editing
        
        // Get all floor assignments with employee information
        let query = `
            SELECT 
                f.id as floor_id,
                f.floor_name,
                b.name as building_name,
                u.id as employee_id,
                u.name as employee_name,
                u.email as employee_email
            FROM floors f
            JOIN buildings b ON f.building_id = b.id
            LEFT JOIN users u ON f.floor_name = ANY(u.assigned_floors) AND b.name = u.assigned_building
            WHERE f.is_active = TRUE 
            AND b.is_active = TRUE
            AND (u.user_type = 'employee' AND u.is_active = TRUE OR u.id IS NULL)
        `;
        
        const params = [];
        if (excludeEmployeeId) {
            query += ` AND u.id != $1`;
            params.push(excludeEmployeeId);
        }
        
        query += ` ORDER BY b.name, f.floor_name`;
        
        const floorAssignments = await getRows(query, params);
        
        // Group by floor to see which floors are assigned
        const floorStatus = {};
        floorAssignments.forEach(assignment => {
            const floorKey = `${assignment.building_name}-${assignment.floor_name}`;
            if (!floorStatus[floorKey]) {
                floorStatus[floorKey] = {
                    floorId: assignment.floor_id,
                    floorName: assignment.floor_name,
                    buildingName: assignment.building_name,
                    isAssigned: false,
                    assignedTo: null
                };
            }
            
            if (assignment.employee_id) {
                floorStatus[floorKey].isAssigned = true;
                floorStatus[floorKey].assignedTo = {
                    id: assignment.employee_id,
                    name: assignment.employee_name,
                    email: assignment.employee_email
                };
            }
        });
        
        return NextResponse.json({
            floorAssignments: Object.values(floorStatus)
        });
    } catch (error) {
        console.error('Get floor assignments error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
} 