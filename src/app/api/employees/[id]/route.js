import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getUserById, updateUser, getRow, query } from '@/lib/database';
import { logActivity } from '@/lib/logActivity';

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

// GET - get specific employee
export async function GET(request, { params }) {
    try {
        const currentUser = await authenticateAdmin(request);
        //if (currentUser instanceof NextResponse) return currentUser;
        const { id } = params;
        const employee = await getUserById(id);

        if (!employee) {
            return NextResponse.json(
                { error: 'Employee not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            employee,
            currentUser: {
                id: currentUser.id,
                email: currentUser.email,
                userType: currentUser.userType
            }
        });
    } catch (error) {
        console.error('Get employee error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Admin access required' ? 403 : 500 }
        );
    }
}

// PUT - update employee
export async function PUT(request, { params }) {
    try {
        const currentUser = await authenticateAdmin(request);
        //if (currentUser instanceof NextResponse) return currentUser;
        const { id } = params;
        const { name, email, dateOfBirth, gender, assignedBuilding, assignedFloors, profilePicture } = await request.json();

        if (!name || !email || !dateOfBirth || !gender || !assignedBuilding || !assignedFloors) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        if (!['male', 'female', 'other'].includes(gender)) {
            return NextResponse.json(
                { error: 'Invalid gender value' },
                { status: 400 }
            );
        }

        // check if email already exists for another user
        const existing = await getRow('SELECT id FROM users WHERE email = $1 AND id != $2 AND is_active = TRUE', [email, id]);
        if (existing) {
            return NextResponse.json(
                { error: 'Employee with this email already exists.' },
                { status: 409 }
            );
        }

        // update employee
        const updated = await updateUser(id, {
            name,
            email, // Pass email to updateUser
            date_of_birth: dateOfBirth,
            gender,
            assigned_building: assignedBuilding,
            assigned_floors: assignedFloors,
            profile_picture: profilePicture,
        });

        if (!updated) {
            return NextResponse.json(
                { error: 'Employee not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'Employee added or edited successfully', employee: updated
        });

    } catch (error) {
        console.error('Update employee error:', error);
        return NextResponse.json(
            { error: error.message ||  'Internal server error' },
            { status: error.message === 'Admin access required' ? 403 : 500 }
        );
    }
}

// DELETE - delete employee (soft delete)
export async function DELETE(request, { params }) {
    try {
        const currentUser = await authenticateAdmin(request);
        //if (currentUser instanceof NextResponse) return currentUser;
        const { id } = params;
        // Soft delete: set is_active = FALSE
        const result = await query('UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
        if (!result.rows[0]) {
            return NextResponse.json(
                { error: 'Employee not found' },
                { status: 404 }
            );
        }
        // Fetch full admin user object
        const adminUser = await getUserById(currentUser.id || currentUser.userId);
        // Log the deletion
        await logActivity({
            request,
            user: adminUser,
            action: 'DELETE_EMPLOYEE',
            tableName: 'users',
            recordId: id,
            oldValues: {
                name: result.rows[0].name,
                email: result.rows[0].email,
                assignedBuilding: result.rows[0].assigned_building,
                assignedFloors: result.rows[0].assigned_floors,
                profilePicture: result.rows[0].profile_picture
            }
        });
        return NextResponse.json({
            message: 'Employee deleted successfully', employee: result.rows[0]
        });
    } catch (error) {
        console.error('Delete employee error:' , error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Admin access required' ? 403 : 500 }
        );
    }
}
