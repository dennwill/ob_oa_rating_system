import { NextResponse } from 'next/server';
import { getRows, query } from '@/lib/database';

// Create a new room
export async function POST(request) {
  try {
    const { floorId, roomName } = await request.json();
    if (!floorId || !roomName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await getRows(
      `INSERT INTO rooms (floor_id, room_name, is_active)
       VALUES ($1, $2, TRUE) RETURNING *`,
      [floorId, roomName]
    );
    return NextResponse.json({ room: result[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// Update a room
export async function PUT(request) {
  try {
    const { id, roomName, isActive } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing room id' }, { status: 400 });
    }
    const fields = [];
    const values = [];
    let idx = 1;
    if (roomName) { fields.push(`room_name = $${idx++}`); values.push(roomName); }
    if (typeof isActive === 'boolean') { fields.push(`is_active = $${idx++}`); values.push(isActive); }
    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    values.push(id);
    const updateQuery = `UPDATE rooms SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
    const updated = await getRows(updateQuery, values);
    if (updated.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    return NextResponse.json({ room: updated[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// Delete a room (soft delete)
export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing room id' }, { status: 400 });
    }
    await query('DELETE FROM rooms WHERE id = $1', [id]);
    return NextResponse.json({ message: 'Room deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 