import { NextResponse } from 'next/server';
import { getAllBuildings, getBuildingWithFloors, createBuilding, query, getRows } from '@/lib/database';

// Helper to fetch rooms for a given floor
async function getRoomsForFloor(floorId) {
    return await getRows(
        'SELECT id, room_name AS roomName, floor_id AS floorId, last_rated AS lastRated FROM rooms WHERE floor_id = $1 AND is_active = TRUE ORDER BY room_name',
        [floorId]
    );
}

export async function GET(request) {
    try {
        // fetch all buildings
        const buildings = await getAllBuildings();
        let totalFloors = 0;
        let totalRooms = 0;

        // for each building, fetch its floors and for each floor, fetch its rooms
        const facilities = await Promise.all(
            buildings.map(async (building) => {
                // fetch floors for this building
                const floors = await getRows(
                    'SELECT id, floor_name, building_id, is_active, floor_number FROM floors WHERE building_id = $1 AND is_active = TRUE ORDER BY floor_number DESC',
                    [building.id]
                );
                totalFloors += floors.length;

                // Map to camelCase for frontend
                const mappedFloors = floors.map(f => ({
                    id: f.id,
                    floorName: f.floor_name,
                    buildingId: f.building_id,
                    isActive: f.is_active,
                    floorNumber: f.floor_number
                }));

                // for each floor, fetch rooms
                const floorsWithRooms = await Promise.all(
                    mappedFloors.map(async (floor) => {
                        const rooms = await getRoomsForFloor(floor.id);
                        totalRooms += rooms.length;
                        return {
                            ...floor,
                            totalRooms: rooms.length,
                            rooms,
                        };
                    })
                );

                return {
                    id: building.id,
                    name: building.name,
                    address: building.address,
                    totalFloors: building.total_floors,
                    totalRooms: floorsWithRooms.reduce((sum, f) => sum + f.totalRooms, 0),
                    floors: floorsWithRooms,
                };
            })
        );

        return NextResponse.json({
            facilities,
            totalBuildings: facilities.length,
            totalFloors,
            totalRooms,
        });
    } catch (error) {
        console.error('Get facilities error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error'},
            { status: 500 }
        );
    }
}

// Add new building
export async function POST(request) {
    try {
        const { name, address, totalFloors } = await request.json();

        // validate required fields
        if (!name || !address || !totalFloors) {
            return NextResponse.json(
                { error: 'Building name, address, and total floors are required'},
                { status: 400 }
            );
        }

        // check if the building already exists
        const existing = await getRows('SELECT id FROM buildings WHERE name = $1 AND is_active = TRUE', [name]);
        if (existing.length > 0) {
            return NextResponse.json(
                { error: 'Building with this name already exists' },
                { status: 409 }
            );
        }

        // create new building
        const newBuilding = await createBuilding({ name, address, total_floors: parseInt(totalFloors) });

        return NextResponse.json({
            message: 'Building added successfully',
            building: newBuilding
        }, { status: 201 });
    } catch (error) {
        console.error('Add building error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// Update building
export async function PUT(request) {
    try {
        const { buildingId, name, address, totalFloors } = await request.json();
        if (!buildingId) {
            return NextResponse.json(
                { error: 'buildingId is required' },
                { status: 400 }
            );
        }
        // Only update provided fields
        const fields = [];
        const values = [];
        let idx = 1;
        if (name) {
            fields.push(`name = $${idx++}`);
            values.push(name);
        }
        if (address) {
            fields.push(`address = $${idx++}`);
            values.push(address);
        }
        if (totalFloors) {
            fields.push(`total_floors = $${idx++}`);
            values.push(parseInt(totalFloors));
        }
        if (fields.length === 0) {
            return NextResponse.json(
                { error: 'No fields to update' },
                { status: 400 }
            );
        }
        values.push(buildingId);
        const updateQuery = `UPDATE buildings SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} AND is_active = TRUE RETURNING *`;
        const updated = await getRows(updateQuery, values);
        if (updated.length === 0) {
            return NextResponse.json(
                { error: 'Building not found or not active' },
                { status: 404 }
            );
        }
        return NextResponse.json({
            message: 'Building updated successfully',
            building: updated[0]
        });
    } catch (error) {
        console.error('Update building error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// Delete building (hard delete)
export async function DELETE(request) {
  try {
    const { buildingId } = await request.json();
    if (!buildingId) {
      return NextResponse.json({ error: 'Missing buildingId' }, { status: 400 });
    }
    await query('DELETE FROM buildings WHERE id = $1', [buildingId]);
    return NextResponse.json({ message: 'Building and all related floors and rooms deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}