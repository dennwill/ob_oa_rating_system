export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { getAllEmployees, getEmployeeRatings, createRating, updateRating, getRow, query } from '@/lib/database.js';
import { logActivity } from '@/lib/logActivity';

// helper function to authenticate admin without repetition throughout HTTP functions
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

// GET - get all employees with their ratings from the database
export async function GET(request) {
  try {
    await authenticateAdmin(request);

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const building = searchParams.get('building');
    const floor = searchParams.get('floor');

    // Fetch employees from the database
    let employees = await getAllEmployees({ building, floor });
    if (employeeId) {
      employees = employees.filter(emp => emp.id === parseInt(employeeId));
    }

    // For each employee, fetch their ratings
    const employeesWithRatings = await Promise.all(employees.map(async (employee) => {
      const ratings = await getEmployeeRatings(employee.id);
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length
        : 0;
      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        profilePicture: employee.profile_picture,
        dateOfBirth: employee.date_of_birth,
        gender: employee.gender,
        assignedBuilding: employee.assigned_building,
        assignedFloors: employee.assigned_floors,
        createdAt: employee.created_at,
        updatedAt: employee.updated_at,
        ratings: ratings.map(r => ({
          id: r.id,
          buildingName: r.building_name,
          floorNumber: r.floor_name, // Fix: use r.floor_name
          roomNumber: r.room_name,   // Fix: use r.room_name
          rating: r.rating,
          ratedBy: r.rated_by,
          ratedAt: r.rated_at,
          notes: r.notes
        })),
        averageRating: Math.round(averageRating * 10) / 10,
        totalRooms: ratings.length
      };
    }));

    return NextResponse.json({
      employees: employeesWithRatings,
      totalEmployees: employeesWithRatings.length
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Admin access required' ? 403 : 500 }
    );
  }
}

// POST - add a new rating to the database
export async function POST(request) {
  try {
    const authResult = await authenticateAdmin(request);
    if (authResult instanceof NextResponse) return authResult;
    const currentUser = authResult;
    // Fetch full admin user object
    const adminUser = await getRow('SELECT id, name, email, profile_picture FROM users WHERE id = $1', [currentUser.id || currentUser.userId]);

    const { employeeId, roomId, rating, notes } = await request.json();

    // validate input
    if(!employeeId || !roomId || !rating) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // validate range
    if (rating < 1 || rating > 10) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Check if a rating already exists for this employee, room, and today
    const today = new Date().toISOString().slice(0, 10);
    const existing = await getRow(
      `SELECT * FROM ratings WHERE employee_id = $1 AND room_id = $2 AND rated_at::date = $3::date`,
      [employeeId, roomId, today]
    );

    let result;
    if (existing) {
      // Update the existing rating
      result = await updateRating({ rating_id: existing.id, rating, notes });
      // Fetch employee and room info for logging
      const employee = await getRow('SELECT id, name FROM users WHERE id = $1', [employeeId]);
      const room = await getRow('SELECT rm.id, rm.room_name, f.floor_name, b.name as building_name FROM rooms rm JOIN floors f ON rm.floor_id = f.id JOIN buildings b ON f.building_id = b.id WHERE rm.id = $1', [roomId]);
      // Log the update
      await logActivity({
        request,
        user: adminUser,
        action: 'UPDATE_RATING',
        tableName: 'ratings',
        recordId: existing.id,
        oldValues: existing,
        newValues: {
          ...result,
          employeeName: employee?.name,
          roomName: room?.room_name,
          floorName: room?.floor_name,
          buildingName: room?.building_name
        }
      });
      return NextResponse.json({ message: 'Rating updated successfully', rating: result }, { status: 200 });
    } else {
      // Create the new rating in the database
      result = await createRating({
        employee_id: employeeId,
        room_id: roomId,
        rating,
        notes,
        rated_by: currentUser.id || currentUser.userId
      });
      // Fetch employee and room info for logging
      const employee = await getRow('SELECT id, name FROM users WHERE id = $1', [employeeId]);
      const room = await getRow('SELECT rm.id, rm.room_name, f.floor_name, b.name as building_name FROM rooms rm JOIN floors f ON rm.floor_id = f.id JOIN buildings b ON f.building_id = b.id WHERE rm.id = $1', [roomId]);
      // Log the creation
      await logActivity({
        request,
        user: adminUser,
        action: 'ADD_RATING',
        tableName: 'ratings',
        recordId: result.id,
        newValues: {
          ...result,
          employeeName: employee?.name,
          roomName: room?.room_name,
          floorName: room?.floor_name,
          buildingName: room?.building_name
        }
      });
      return NextResponse.json({ message: 'Rating added successfully', rating: result }, { status: 201 });
    }
  } catch (error) {
    console.error('Add rating error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Admin access required' ? 403 : 500 }
    );
  }
}

// PUT - update an existing rating
export async function PUT(request) {
   try {
    const currentUser = await authenticateAdmin(request);

    const { ratingId, rating, notes } = await request.json();

    // validate input
    if (!ratingId || !rating) {
      return NextResponse.json(
        { error: 'Rating ID and rating value are required' },
        { status: 400 }
      )
    }

    // validate rating range
    if (rating < 1 || rating > 10) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 10' },
        { status: 400 }
      );
    }

    // update rating in the database
    const updated = await updateRating({
      rating_id: ratingId,
      rating,
      notes
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Rating not found' },
        { status: 404 }
      );
    }

    // Fetch employee and room info for logging
    const ratingRow = await getRow('SELECT * FROM ratings WHERE id = $1', [ratingId]);
    const employee = await getRow('SELECT id, name FROM users WHERE id = $1', [ratingRow.employee_id]);
    const room = await getRow('SELECT rm.id, rm.room_name, f.floor_name, b.name as building_name FROM rooms rm JOIN floors f ON rm.floor_id = f.id JOIN buildings b ON f.building_id = b.id WHERE rm.id = $1', [ratingRow.room_id]);
    // Log the update
    await logActivity({
      request,
      user: currentUser,
      action: 'UPDATE_RATING',
      tableName: 'ratings',
      recordId: ratingId,
      newValues: {
        ...updated,
        employeeName: employee?.name,
        roomName: room?.room_name,
        floorName: room?.floor_name,
        buildingName: room?.building_name
      }
    });

    return NextResponse.json({
      message: 'Rating updated successfully',
      rating: updated
    });

  } catch (error) {
    console.error('Update rating error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error. message === 'Admin access required' ? 403 : 500}
    );
  }
}

// DELETE - remove a rating for a specific employee, room, and date
export async function DELETE(request) {
  try {
    const authResult = await authenticateAdmin(request);
    if (authResult instanceof NextResponse) return authResult;
    // Fetch full admin user object
    const adminUser = await getRow('SELECT id, name, email, profile_picture FROM users WHERE id = $1', [authResult.id || authResult.userId]);
    const { employeeId, roomId, date } = await request.json();
    if (!employeeId || !roomId || !date) {
      return NextResponse.json(
        { error: 'employeeId, roomId, and date are required' },
        { status: 400 }
      );
    }
    // Find the rating for this employee, room, and date
    const existing = await getRow(
      `SELECT * FROM ratings WHERE employee_id = $1 AND room_id = $2 AND rated_at::date = $3::date`,
      [employeeId, roomId, date]
    );
    if (!existing) {
      return NextResponse.json({ message: 'No rating found to delete' }, { status: 200 });
    }
    await query('DELETE FROM ratings WHERE id = $1', [existing.id]);
    // Fetch employee and room info for logging
    const employee = await getRow('SELECT id, name FROM users WHERE id = $1', [employeeId]);
    const room = await getRow('SELECT rm.id, rm.room_name, f.floor_name, b.name as building_name FROM rooms rm JOIN floors f ON rm.floor_id = f.id JOIN buildings b ON f.building_id = b.id WHERE rm.id = $1', [roomId]);
    // Log the deletion
    await logActivity({
      request,
      user: adminUser,
      action: 'DELETE_RATING',
      tableName: 'ratings',
      recordId: existing.id,
      oldValues: {
        ...existing,
        employeeName: employee?.name,
        roomName: room?.room_name,
        floorName: room?.floor_name,
        buildingName: room?.building_name
      }
    });
    return NextResponse.json({ message: 'Rating cleared successfully' }, { status: 200 });
  } catch (error) {
    console.error('Delete rating error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Admin access required' ? 403 : 500 }
    );
  }
}