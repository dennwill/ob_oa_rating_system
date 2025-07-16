import { NextResponse } from 'next/server';
//import { requireAdmin } from '@/lib/auth';
import { getAllEmployees, getUserByEmail, createUser, getUserById } from '@/lib/database.js';
import bcrypt from 'bcryptjs';
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

// GET - get all employees from the database
export async function GET(request) {
    try {
        // Require admin authentication
        authenticateAdmin(request);

        const { searchParams } = new URL(request.url);
        const building = searchParams.get('building');
        const floor = searchParams.get('floor');
        const search = searchParams.get('search');

        // fetch employees from the database
        const employees = await getAllEmployees({ building, floor, search });

        // map DB fields to API response fields
        const mappedEmployees = employees.map(emp => ({
            id: emp.id,
            name: emp.name,
            email: emp.email,
            profilePicture: emp.profile_picture,
            dateOfBirth: emp.date_of_birth,
            gender: emp.gender,
            assigned_building: emp.assigned_building,
            assigned_floors: emp.assigned_floors,
            createdAt: emp.created_at,
            updatedAt: emp.updated_at
        }));

        return NextResponse.json({
            employees: mappedEmployees,
            totalEmployees: mappedEmployees.length
        });
    } catch (error) {
        console.error('Get employees error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Admin access required' ? 403 : 500 }
        );
    }
}

// POST - add a new employee to the database
export async function POST(request) {
    try {
        const currentUser = await authenticateAdmin(request);
        // Fetch full admin user object
        const adminUser = await getUserById(currentUser.id || currentUser.userId);

        const { name, email, dateOfBirth, gender, assignedBuilding, assignedFloors, password, profilePicture } = await request.json();
        // validate required fields
        if (!name || !email || !dateOfBirth || !gender || !assignedBuilding || !assignedFloors || !password) {
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

        // check if email already exists in the database
        const existingEmployee = await getUserByEmail(email);
        if (existingEmployee) {
            return NextResponse.json(
                { error: 'Employee with this email already exists'},
                { status: 409 }
            );
        }

        // validate gender
        if (!['male', 'female', 'other'].includes(gender)) {
            return NextResponse.json(
                { error: 'Invalid gender value' },
                { status: 400 }
            );
        }

        // Hash the password
        const password_hash = await bcrypt.hash(password, 10);

        // Create the new employee in the database
        const newEmployee = await createUser({
            email,
            password_hash,
            name,
            is_admin: false,
            user_type: 'employee',
            date_of_birth: dateOfBirth,
            gender,
            assigned_building: assignedBuilding,
            assigned_floors: assignedFloors,
            profile_picture: profilePicture
        });

        // Map DB fields to API response fields
        const mappedEmployee = {
            id: newEmployee.id,
            name: newEmployee.name,
            email: newEmployee.email,
            profilePicture: newEmployee.profile_picture,
            dateOfBirth: newEmployee.date_of_birth,
            gender: newEmployee.gender,
            assigned_building: newEmployee.assigned_building,
            assigned_floors: newEmployee.assigned_floors,
            createdAt: newEmployee.created_at,
            updatedAt: newEmployee.updated_at
        };

        // Log the creation
        await logActivity({
          request,
          user: adminUser,
          action: 'CREATE_EMPLOYEE',
          tableName: 'users',
          recordId: newEmployee.id,
          newValues: mappedEmployee
        });

        return NextResponse.json({ message: 'Employee added successfully', employee: mappedEmployee }, { status: 201 });

    } catch (error) {
        console.error('Add employee error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Admin access required' ? 403 : 500 }
        );
    }
}