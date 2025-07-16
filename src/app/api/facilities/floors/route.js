import { NextResponse } from 'next/server';
import { getRows, query } from '@/lib/database';

// Create a new floor
export async function POST(request) {
  try {
    const { buildingId, floorName, floorNumber } = await request.json();
    if (!buildingId || !floorName || !floorNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await getRows(
      `INSERT INTO floors (building_id, floor_name, floor_number, is_active)
       VALUES ($1, $2, $3, TRUE) RETURNING *`,
      [buildingId, floorName, floorNumber]
    );
    return NextResponse.json({ floor: result[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// Update a floor
export async function PUT(request) {
  try {
    const { id, floorName, floorNumber, isActive } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing floor id' }, { status: 400 });
    }
    const fields = [];
    const values = [];
    let idx = 1;
    if (floorName) { fields.push(`floor_name = $${idx++}`); values.push(floorName); }
    if (floorNumber) { fields.push(`floor_number = $${idx++}`); values.push(floorNumber); }
    if (typeof isActive === 'boolean') { fields.push(`is_active = $${idx++}`); values.push(isActive); }
    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    values.push(id);
    const updateQuery = `UPDATE floors SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
    const updated = await getRows(updateQuery, values);
    if (updated.length === 0) {
      return NextResponse.json({ error: 'Floor not found' }, { status: 404 });
    }
    return NextResponse.json({ floor: updated[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// Delete a floor (soft delete)
export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing floor id' }, { status: 400 });
    }
    await query('DELETE FROM floors WHERE id = $1', [id]);
    return NextResponse.json({ message: 'Floor deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 