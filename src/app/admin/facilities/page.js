"use client";

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';

function BuildingForm({ onSubmit, onCancel }) {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    return (
        <form onSubmit={e => { e.preventDefault(); onSubmit({ name, address, totalFloors: 1 }); }} className="space-y-2 mb-4 bg-gray-50 p-4 rounded-xl border">
        <input className="border rounded px-2 py-1 w-full" placeholder="Building Name" value={name} onChange={e => setName(e.target.value)} required />
        <input className="border rounded px-2 py-1 w-full" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} required />
        <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Add Building</button>
            {onCancel && <button type="button" className="bg-gray-300 px-3 py-1 rounded" onClick={onCancel}>Cancel</button>}
        </div>
        </form>
    );
}
function FloorForm({ onSubmit, initial, onCancel }) {
    const [floorName, setFloorName] = useState(initial?.floorName || '');
    const [floorNumber, setFloorNumber] = useState(initial?.floorNumber || '');
    return (
        <form onSubmit={e => { e.preventDefault(); onSubmit({ floorName, floorNumber }); }} className="space-y-2 mb-2">
        <input className="border rounded px-2 py-1 w-full" placeholder="Floor Name" value={floorName} onChange={e => setFloorName(e.target.value)} required />
        <input className="border rounded px-2 py-1 w-full" placeholder="Floor Number" type="number" value={floorNumber} onChange={e => setFloorNumber(e.target.value)} required min={1} />
        <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">{initial ? 'Update' : 'Add'} Floor</button>
            {onCancel && <button type="button" className="bg-gray-300 px-3 py-1 rounded" onClick={onCancel}>Cancel</button>}
        </div>
        </form>
    );
}
function RoomForm({ onSubmit, initial, onCancel }) {
    const [roomName, setRoomName] = useState(initial?.roomname || '');
    return (
        <form onSubmit={e => { e.preventDefault(); onSubmit({ roomName }); }} className="space-y-2 mb-2">
        <input className="border rounded px-2 py-1 w-full" placeholder="Room Name" value={roomName} onChange={e => setRoomName(e.target.value)} required />
        <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">{initial ? 'Update' : 'Add'} Room</button>
            {onCancel && <button type="button" className="bg-gray-300 px-3 py-1 rounded" onClick={onCancel}>Cancel</button>}
        </div>
        </form>
    );
}

// Chevron SVG for dropdowns
function Chevron({ open }) {
    return (
        <svg
        className={`w-5 h-5 ml-2 transform transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    );
}

export default function FacilitiesPage() {
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedBuildingId, setExpandedBuildingId] = useState(null);
    const [expandedFloorId, setExpandedFloorId] = useState(null);
    // Add state for CRUD modals/forms
    const [addingBuilding, setAddingBuilding] = useState(false);
    const [editingBuilding, setEditingBuilding] = useState(null);
    const [addingFloor, setAddingFloor] = useState(null); // buildingId
    const [editingFloor, setEditingFloor] = useState(null); // {floor, buildingId}
    const [addingRoom, setAddingRoom] = useState(null); // floorId
    const [editingRoom, setEditingRoom] = useState(null); // {room, floorId}

    // Move fetchFacilities outside useEffect so it can be reused
    async function fetchFacilities() {
        setLoading(true);
        setError(null);
        try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch('/api/facilities', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Failed to fetch facilities');
        const data = await res.json();
        setFacilities(data.facilities || []);
        } catch (err) {
        setError(err.message || 'Unknown error');
        } finally {
        setLoading(false);
        }
    }

    useEffect(() => {
        fetchFacilities();
    }, []);

    const toggleBuilding = (id) => {
        setExpandedBuildingId(expandedBuildingId === id ? null : id);
        setExpandedFloorId(null); // Collapse any open floor when switching building
    };

    const toggleFloor = (id) => {
        setExpandedFloorId(expandedFloorId === id ? null : id);
    };

    // Add, Edit, Delete handlers for buildings
    async function handleAddBuilding(data) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch('/api/facilities', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data)
        });
        if (!res.ok) {
        const err = await res.json();
        alert('Failed to add building: ' + (err.error || res.status));
        console.error('Add building error:', err);
        return;
        }
        setAddingBuilding(false); fetchFacilities();
    }
    async function handleEditBuilding(id, data) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        await fetch('/api/facilities', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ buildingId: id, ...data })
        });
        setEditingBuilding(null); fetchFacilities();
    }
    async function handleDeleteBuilding(id) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (window.confirm('Delete this building?')) {
        await fetch('/api/facilities', {
            method: 'DELETE',
            headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ buildingId: id })
        });
        fetchFacilities();
        }
    }
    // Add, Edit, Delete handlers for floors
    async function handleAddFloor(buildingId, data) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch('/api/facilities/floors', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ buildingId, ...data })
        });
        if (!res.ok) {
        const err = await res.json();
        alert('Failed to add floor: ' + (err.error || res.status));
        console.error('Add floor error:', err);
        return;
        }
        setAddingFloor(null); fetchFacilities();
    }
    async function handleEditFloor(floor, data) {
        await fetch('/api/facilities/floors', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: floor.id, ...data }) });
        setEditingFloor(null); fetchFacilities();
    }
    async function handleDeleteFloor(id) {
        if (window.confirm('Delete this floor?')) {
        await fetch('/api/facilities/floors', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        fetchFacilities();
        }
    }
    // Add, Edit, Delete handlers for rooms
    async function handleAddRoom(floorId, data) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch('/api/facilities/rooms', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ floorId, ...data })
        });
        if (!res.ok) {
        const err = await res.json();
        alert('Failed to add room: ' + (err.error || res.status));
        console.error('Add room error:', err);
        return;
        }
        setAddingRoom(null); fetchFacilities();
    }
    async function handleEditRoom(room, data) {
        await fetch('/api/facilities/rooms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: room.id, ...data }) });
        setEditingRoom(null); fetchFacilities();
    }
    async function handleDeleteRoom(id) {
        if (window.confirm('Delete this room?')) {
        await fetch('/api/facilities/rooms', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        fetchFacilities();
        }
    }

    return (
        <AdminLayout>
        <div className="px-4 py-8 md:p-8 max-w-2xl mx-auto">
            <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <h1 className="text-2xl font-bold text-center md:text-left">Facilities</h1>
                <button className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition w-full md:w-auto" onClick={() => setAddingBuilding(true)}>Add Building</button>
            </div>
            {addingBuilding && <BuildingForm onSubmit={handleAddBuilding} onCancel={() => setAddingBuilding(false)} />}
            {editingBuilding && !addingBuilding && null}
            {loading ? (
                <div className="text-center py-8">Loading facilities...</div>
            ) : error ? (
                <div className="text-red-500 text-center py-8">{error}</div>
            ) : facilities.length === 0 ? (
                <div className="text-gray-500 text-center py-8">No facilities found.</div>
            ) : (
                <div className="flex flex-col gap-6">
                    {facilities.map((building) => {
                        const isEditingBuilding = editingBuilding && editingBuilding.id === building.id;
                        const isOpen = expandedBuildingId === building.id;
                        return (
                            <div key={building.id} className="bg-white rounded-xl shadow border flex flex-col max-w-full w-full mx-auto">
                                <div
                                    className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-gray-50 focus:bg-gray-100 rounded-t-xl transition-colors ${isOpen ? 'bg-gray-50' : ''}`}
                                    tabIndex={0}
                                    role="button"
                                    aria-expanded={isOpen}
                                    onClick={() => toggleBuilding(building.id)}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleBuilding(building.id); }}
                                >
                                    {isEditingBuilding ? (
                                        <form
                                            className="flex-1 flex items-center gap-2"
                                            onClick={e => e.stopPropagation()}
                                            onSubmit={e => { e.preventDefault(); handleEditBuilding(building.id, { name: editingBuilding.name }); }}
                                        >
                                            <input
                                                className="border rounded px-2 py-1 flex-1"
                                                value={editingBuilding.name}
                                                autoFocus
                                                onChange={e => setEditingBuilding({ ...editingBuilding, name: e.target.value })}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleEditBuilding(building.id, { name: editingBuilding.name }); } }}
                                                placeholder="Building Name"
                                            />
                                            <button type="button" className="text-green-600 text-xl px-2" title="Save" onClick={() => handleEditBuilding(building.id, { name: editingBuilding.name })}>✓</button>
                                            <button type="button" className="text-gray-400 text-xl px-2" title="Cancel" onClick={() => setEditingBuilding(null)}>×</button>
                                        </form>
                                    ) : (
                                        <>
                                            <span className="font-semibold text-lg flex-1 text-left">{building.name}</span>
                                            <Chevron open={isOpen} />
                                            <div className="flex gap-2 ml-4">
                                                <button className="bg-blue-500 text-white px-2 py-1 rounded text-xs" onClick={e => { e.stopPropagation(); setEditingBuilding(building); }}>Edit</button>
                                                <button className="bg-red-500 text-white px-2 py-1 rounded text-xs" onClick={e => { e.stopPropagation(); handleDeleteBuilding(building.id); }}>Delete</button>
                                                <button className="bg-green-500 text-white px-2 py-1 rounded text-xs" onClick={e => { e.stopPropagation(); setAddingFloor(building.id); }}>Add Floor</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className={`transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="px-4 pb-4">
                                        <div className="text-gray-500 text-sm mb-2">{building.address}</div>
                                        {addingFloor === building.id && <FloorForm onSubmit={data => handleAddFloor(building.id, data)} onCancel={() => setAddingFloor(null)} />}
                                        <ul className="bg-gray-50 rounded-lg border divide-y">
                                            {building.floors.length === 0 ? (
                                                <li className="px-4 py-2 text-gray-500">No floors</li>
                                            ) : building.floors.map((floor) => {
                                                const isEditingFloor = editingFloor && editingFloor.id === floor.id;
                                                const isFloorOpen = expandedFloorId === floor.id;
                                                return (
                                                    <li key={floor.id} className="">
                                                        <div
                                                            className={`flex items-center justify-between px-4 py-2 cursor-pointer select-none hover:bg-gray-100 focus:bg-gray-200 rounded transition-colors ${isFloorOpen ? 'bg-gray-100' : ''}`}
                                                            tabIndex={0}
                                                            role="button"
                                                            aria-expanded={isFloorOpen}
                                                            onClick={() => toggleFloor(floor.id)}
                                                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleFloor(floor.id); }}
                                                        >
                                                            {isEditingFloor ? (
                                                                <form
                                                                    className="flex-1 flex items-center gap-2"
                                                                    onClick={e => e.stopPropagation()}
                                                                    onSubmit={e => { e.preventDefault(); handleEditFloor(floor, { floorName: editingFloor.floorName }); }}
                                                                >
                                                                    <input
                                                                        className="border rounded px-2 py-1 flex-1"
                                                                        value={editingFloor.floorName}
                                                                        autoFocus
                                                                        onChange={e => setEditingFloor({ ...editingFloor, floorName: e.target.value })}
                                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleEditFloor(floor, { floorName: editingFloor.floorName }); } }}
                                                                        placeholder="Floor Name"
                                                                    />
                                                                    <button type="button" className="text-green-600 text-xl px-2" title="Save" onClick={() => handleEditFloor(floor, { floorName: editingFloor.floorName })}>✓</button>
                                                                    <button type="button" className="text-gray-400 text-xl px-2" title="Cancel" onClick={() => setEditingFloor(null)}>×</button>
                                                                </form>
                                                            ) : (
                                                                <>
                                                                    <span className="flex-1 text-left font-semibold">{floor.floorName}</span>
                                                                    <Chevron open={isFloorOpen} />
                                                                    <div className="flex gap-2 ml-4">
                                                                        <button className="bg-blue-500 text-white px-2 py-1 rounded text-xs" onClick={e => { e.stopPropagation(); setEditingFloor({ ...floor, buildingId: building.id }); }}>Edit</button>
                                                                        <button className="bg-red-500 text-white px-2 py-1 rounded text-xs" onClick={e => { e.stopPropagation(); handleDeleteFloor(floor.id); }}>Delete</button>
                                                                        <button className="bg-green-500 text-white px-2 py-1 rounded text-xs" onClick={e => { e.stopPropagation(); setAddingRoom(floor.id); }}>Add Room</button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className={`transition-all duration-300 overflow-hidden ${isFloorOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                            {addingRoom === floor.id && <RoomForm onSubmit={data => handleAddRoom(floor.id, data)} onCancel={() => setAddingRoom(null)} />}
                                                            <ul className="bg-gray-100 rounded-lg border divide-y">
                                                                {floor.rooms.length === 0 ? (
                                                                    <li className="px-4 py-2 text-gray-500">No rooms</li>
                                                                ) : floor.rooms.map((room) => {
                                                                    const isEditing = editingRoom && editingRoom.id === room.id;
                                                                    return (
                                                                        <li key={room.id} className="px-4 py-2 flex items-center border-b last:border-b-0">
                                                                            {isEditing ? (
                                                                                <form
                                                                                    className="flex-1 flex items-center gap-2"
                                                                                    onClick={e => e.stopPropagation()}
                                                                                    onSubmit={e => {
                                                                                        e.preventDefault();
                                                                                        handleEditRoom(room, { roomName: editingRoom.roomname });
                                                                                    }}
                                                                                >
                                                                                    <input
                                                                                        className="border rounded px-2 py-1 flex-1"
                                                                                        value={editingRoom.roomname}
                                                                                        autoFocus
                                                                                        onChange={e => setEditingRoom({ ...editingRoom, roomname: e.target.value })}
                                                                                        onKeyDown={e => {
                                                                                            if (e.key === 'Enter') {
                                                                                                e.preventDefault();
                                                                                                handleEditRoom(room, { roomName: editingRoom.roomname });
                                                                                            }               
                                                                                        }}
                                                                                        placeholder="Room Name"
                                                                                    />
                                                                                    <button type="button" className="text-green-600 text-xl px-2" title="Save" onClick={() => handleEditRoom(room, { roomName: editingRoom.roomname })}>✓</button>
                                                                                    <button type="button" className="text-gray-400 text-xl px-2" title="Cancel" onClick={() => setEditingRoom(null)}>×</button>
                                                                                </form>
                                                                            ) : (
                                                                                <>
                                                                                    <span className="flex-1">{room.roomname}</span>
                                                                                    <div className="flex gap-2 ml-auto">
                                                                                        <button className="bg-blue-500 text-white px-2 py-1 rounded text-xs" onClick={e => { e.stopPropagation(); setEditingRoom({ ...room, floorId: floor.id }); }}>Edit</button>
                                                                                        <button className="bg-red-500 text-white px-2 py-1 rounded text-xs" onClick={e => { e.stopPropagation(); handleDeleteRoom(room.id); }}>Delete</button>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
        </AdminLayout>
    );
}
