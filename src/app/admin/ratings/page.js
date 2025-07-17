"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import * as XLSX from 'xlsx';
import Image from 'next/image';
import { Pencil, Trash2 } from 'lucide-react';

function Modal({ open, onClose, children }) {
    if (!open) return null;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.15)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 16px rgba(0,0,0,0.15)', padding: 32, minWidth: 400, position: 'relative' }}>
            <button onClick={onClose} style={{ position: 'absolute', left: 16, top: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&larr; Back</button>
            {children}
        </div>
        </div>
    );
}

const AdminRatingsPage = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedFloor, setSelectedFloor] = useState('');
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [rating, setRating] = useState(0);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [facilities, setFacilities] = useState([]);
    const [pendingRoomId, setPendingRoomId] = useState(null);
    const [showSavedPopup, setShowSavedPopup] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [successAlertVisible, setSuccessAlertVisible] = useState(false);
    const [showUpdateAlert, setShowUpdateAlert] = useState(false);
    const [updateAlertVisible, setUpdateAlertVisible] = useState(false);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);

    const fetchRatingsAndFacilities = async () => {
        setLoading(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        try {
        const [ratingsRes, facilitiesRes] = await Promise.all([
            fetch('/api/ratings', { headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) } }),
            fetch('/api/facilities', { headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) } }),
        ]);
        const ratingsData = await ratingsRes.json();
        const facilitiesData = await facilitiesRes.json();
        setEmployees(ratingsData.employees || []);
        setFacilities(facilitiesData.facilities || []);
        } catch (err) {
        setError('Failed to load data');
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        fetchRatingsAndFacilities();
    }, []);

    // Fetch rooms when floor changes
    useEffect(() => {
        if (!selectedEmployee || !selectedFloor) {
            setRooms([]);
            setSelectedRoom('');
            setPendingRoomId(null);
            return;
        }
        const fetchRooms = async () => {
            setRooms([]);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/facilities', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
                const data = await res.json();
                const building = data.facilities.find(b => b.name === selectedEmployee.assignedBuilding);
                if (!building) return;
                const floor = building.floors.find(f => f.floorName === selectedFloor);
                if (!floor) return;
                setRooms(floor.rooms);
                // Only set selectedRoom if pendingRoomId is present and valid
                if (pendingRoomId && floor.rooms.some(r => r.id === pendingRoomId || r.id === Number(pendingRoomId))) {
                    setSelectedRoom(pendingRoomId);
                    setPendingRoomId(null);
                }
            } catch (e) {
                setRooms([]);
                setPendingRoomId(null);
            }
        };
        fetchRooms();
    }, [selectedEmployee, selectedFloor, pendingRoomId]);

    // When selectedRoom changes, set the rating if it exists for today
    useEffect(() => {
        if (!selectedEmployee || !selectedFloor || !selectedRoom) {
        setRating(0);
        return;
        }
        const today = new Date().toISOString().slice(0, 10);
        const emp = selectedEmployee;
        const roomObj = rooms.find(r => r.id === selectedRoom || r.id === Number(selectedRoom));
        if (!roomObj) {
        setRating(0);
        return;
        }
        const roomRating = (emp.ratings || []).find(r => r.floorNumber === selectedFloor && r.roomNumber === roomObj.roomname && r.ratedAt && r.ratedAt.slice(0, 10) === today);
        setRating(roomRating ? roomRating.rating : 0);
    }, [selectedRoom, selectedEmployee, selectedFloor, rooms]);

    const openModal = (emp, floor = null, room = null) => {
        setSelectedEmployee(emp);
        setSelectedFloor(floor || emp.assignedFloors[0] || '');
        setRooms([]);
        setSelectedRoom(room || '');
        setPendingRoomId(room || null);
        setRating(0);
        setSuccess(false);
        setErrorMsg('');
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedEmployee(null);
        setSelectedFloor('');
        setRooms([]);
        setSelectedRoom('');
        setRating(0);
        setSuccess(false);
        setErrorMsg('');
    };

    const handleSave = async () => {
        setSaving(true);
        setErrorMsg('');
        try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/ratings', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
            employeeId: selectedEmployee.id,
            roomId: selectedRoom,
            rating,
            notes: '',
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save rating');
        setSuccess(true);
        closeModal(); // Close modal immediately
        // Check if this is an update or a new rating
        const emp = selectedEmployee;
        const today = new Date().toISOString().slice(0, 10);
        const roomObj = rooms.find(r => r.id === selectedRoom || r.id === Number(selectedRoom));
        const existingRating = emp && roomObj && (emp.ratings || []).find(r => r.floorNumber === selectedFloor && r.roomNumber === roomObj.roomname && r.ratedAt && r.ratedAt.slice(0, 10) === today);
        if (existingRating) {
            setShowUpdateAlert(true);
            setTimeout(() => setUpdateAlertVisible(true), 50);
            setTimeout(() => setUpdateAlertVisible(false), 2500);
            setTimeout(() => setShowUpdateAlert(false), 3000);
        } else {
            setShowSuccessAlert(true);
            setTimeout(() => setSuccessAlertVisible(true), 50);
            setTimeout(() => setSuccessAlertVisible(false), 2500);
            setTimeout(() => setShowSuccessAlert(false), 3000);
        }
        await fetchRatingsAndFacilities();
        } catch (e) {
        setErrorMsg(e.message);
        } finally {
        setSaving(false);
        }
    };

    const handleClear = async () => {
        setSaving(true);
        setErrorMsg('');
        try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/ratings', {
            method: 'DELETE',
            headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
            employeeId: selectedEmployee.id,
            roomId: selectedRoom,
            date: new Date().toISOString().slice(0, 10),
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to clear rating');
        setSuccess(true);
        closeModal();
        setShowDeleteAlert(true);
        setTimeout(() => setDeleteAlertVisible(true), 50);
        setTimeout(() => setDeleteAlertVisible(false), 2500);
        setTimeout(() => setShowDeleteAlert(false), 3000);
        await fetchRatingsAndFacilities();
        } catch (e) {
        setErrorMsg(e.message);
        } finally {
        setSaving(false);
        }
    };

    if (loading) return (
        <AdminLayout>
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading ratings data...</p>
            </div>
        </div>
        </AdminLayout>
    );
    if (error) return <AdminLayout><div>{error}</div></AdminLayout>;

    // Dynamically get building names from facilities
    // Only include buildings with at least one assigned employee
    const buildingGroups = facilities
        .map(facility => facility.name)
        .filter(buildingName => employees.some(e => e.assignedBuilding === buildingName));

    // Export to XLSX logic
    const handleExportXLSX = () => {
        const today = new Date().toISOString().slice(0, 10);
        const rows = [];
        buildingGroups.forEach((buildingName, idx) => {
            // Building header row
            rows.push([`Building: ${buildingName}`]);
            // Column headers
            rows.push(['Floor', 'Room', 'Employee Name', 'Rating (Today)']);
            const building = facilities.find(f => f.name === buildingName);
            if (!building) return;
            (building.floors || []).forEach(floor => {
                (floor.rooms || []).forEach(room => {
                    employees.filter(e => e.assignedBuilding === buildingName && (e.assignedFloors || []).includes(floor.floorName)).forEach(emp => {
                        const ratingObj = (emp.ratings || []).find(r =>
                            r.floorNumber === floor.floorName &&
                            r.roomNumber === room.roomname &&
                            r.ratedAt && r.ratedAt.slice(0, 10) === today
                        );
                        rows.push([
                            floor.floorName,
                            room.roomname,
                            emp.name,
                            ratingObj ? ratingObj.rating : '',
                        ]);
                    });
                });
            });
            // Add an empty row between buildings for clarity, except after the last one
            if (idx < buildingGroups.length - 1) {
                rows.push([]);
            }
        });
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ratings');
        XLSX.writeFile(wb, `ratings_${today}.xlsx`);
    };

    // Export past week with floor averages (one sheet per employee-floor, formatted like the sample)
    const handleExportWeekXLSX = () => {
        const today = new Date();
        // Indonesian days
        const daysIndo = ['Senen', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
        // Get array of past 5 days (Mon-Fri, most recent week)
        const days = Array.from({ length: 5 }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - (4 - i));
            return d.toISOString().slice(0, 10);
        });
        const wb = XLSX.utils.book_new();
        employees.forEach(emp => {
            (emp.assignedFloors || []).forEach(floorName => {
                // Find building and floor object
                const building = facilities.find(b => b.name === emp.assignedBuilding);
                if (!building) return;
                const floor = (building.floors || []).find(f => f.floorName === floorName);
                if (!floor) return;
                // Room names
                const roomNames = (floor.rooms || []).map(r => r.roomname);
                // Table rows: each room, then Total Score Harian
                const table = [];
                // Header rows (info)
                const infoRows = [
                    ['Scorecard OB / OG', '', '', '', '', '', '', ''],
                    ['Nama', ':', emp.name, '', '', '', '', ''],
                    ['Lantai', ':', floorName, '', '', '', '', ''],
                    ['Periode', ':', 'W1', '', '', '', '', ''],
                    ['Bulan', ':', '', '', '', '', '', ''],
                    [],
                ];
                // Table header
                const header = ['KETERANGAN', ...daysIndo, 'Total Score 1 Minggu'];
                table.push(header);
                // Room rows
                const roomRows = roomNames.map(room => {
                    // For each day, get the rating
                    const ratings = days.map((date, idx) => {
                        const ratingObj = (emp.ratings || []).find(r =>
                            r.floorNumber === floorName &&
                            r.roomNumber === room &&
                            r.ratedAt && new Date(r.ratedAt).getDay() === (idx + 1) // 1=Mon, 5=Fri
                        );
                        return ratingObj ? ratingObj.rating : '';
                    });
                    // Weekly average for this room
                    const validRatings = ratings.filter(x => typeof x === 'number' && !isNaN(x));
                    const weeklyAvg = validRatings.length > 0 ? (validRatings.reduce((a, b) => a + b, 0) / validRatings.length).toFixed(2) : '';
                    return [room, ...ratings, weeklyAvg];
                });
                table.push(...roomRows);
                // Total Score Harian (daily average)
                const dailyAverages = days.map((date, idx) => {
                    const dayRatings = roomNames.map(room => {
                        const ratingObj = (emp.ratings || []).find(r =>
                            r.floorNumber === floorName &&
                            r.roomNumber === room &&
                            r.ratedAt && new Date(r.ratedAt).getDay() === (idx + 1)
                        );
                        return ratingObj ? ratingObj.rating : null;
                    }).filter(x => typeof x === 'number' && !isNaN(x));
                    return dayRatings.length > 0 ? (dayRatings.reduce((a, b) => a + b, 0) / dayRatings.length).toFixed(2) : '';
                });
                // Weekly average (all rooms, all days)
                const allRatings = roomNames.flatMap(room => days.map((date, idx) => {
                    const ratingObj = (emp.ratings || []).find(r =>
                        r.floorNumber === floorName &&
                        r.roomNumber === room &&
                        r.ratedAt && new Date(r.ratedAt).getDay() === (idx + 1)
                    );
                    return ratingObj ? ratingObj.rating : null;
                })).filter(x => typeof x === 'number' && !isNaN(x));
                const weekAvg = allRatings.length > 0 ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2) : '';
                table.push(['Total Score Harian', ...dailyAverages, weekAvg]);
                // Combine info and table
                const wsData = [...infoRows, ...table];
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                // Sheet name: Employee - Floor
                let sheetName = `${emp.name} - ${floorName}`;
                if (sheetName.length > 31) sheetName = sheetName.slice(0, 31); // Excel limit
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });
        });
        XLSX.writeFile(wb, `scorecards_week_${today.toISOString().slice(0,10)}.xlsx`);
    };

    // Export this month (5 weeks, 1 sheet per employee-floor, 5 tables per sheet, bold headers, outlined table)
    const handleExportMonthXLSX = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth(); // 0-based
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        // Indonesian days
        const daysIndo = ['Senen', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
        // Week ranges: [startDay, endDay]
        const weekRanges = [
            [1, 7],
            [8, 14],
            [15, 21],
            [22, 28],
            [29, daysInMonth],
        ];
        const wb = XLSX.utils.book_new();
        employees.forEach(emp => {
            (emp.assignedFloors || []).forEach(floorName => {
                // Find building and floor object
                const building = facilities.find(b => b.name === emp.assignedBuilding);
                if (!building) return;
                const floor = (building.floors || []).find(f => f.floorName === floorName);
                if (!floor) return;
                // Room names
                const roomNames = (floor.rooms || []).map(r => r.roomname);
                // Sheet data
                let wsData = [
                    ['Scorecard OB / OG', '', '', '', '', '', '', ''],
                    ['Nama', ':', emp.name, '', '', '', '', ''],
                    ['Lantai', ':', floorName, '', '', '', '', ''],
                    ['Periode', ':', 'BULAN INI', '', '', '', '', ''],
                    ['Bulan', ':', today.toLocaleString('default', { month: 'long', year: 'numeric' }), '', '', '', '', ''],
                    [],
                ];
                let tableStartRows = [];
                weekRanges.forEach((range, wIdx) => {
                    // Get all dates for this week (Mon-Fri only)
                    const weekDates = [];
                    for (let d = range[0]; d <= range[1]; d++) {
                        const date = new Date(year, month, d);
                        const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
                        if (day >= 1 && day <= 5) weekDates.push({ date, idx: day - 1 }); // idx: 0=Mon, 4=Fri
                    }
                    // Fill up to 5 days (Mon-Fri)
                    const weekDays = Array(5).fill('');
                    weekDates.forEach(({ date, idx }) => {
                        weekDays[idx] = date.toISOString().slice(0, 10);
                    });
                    // Table header
                    tableStartRows.push(wsData.length); // Save header row index for styling
                    wsData.push([`Keterangan`, ...daysIndo, `Total Score 1 Minggu`, '', `W${wIdx + 1}`]);
                    // Room rows
                    roomNames.forEach(room => {
                        const ratings = weekDays.map((date, idx) => {
                            if (!date) return '';
                            const ratingObj = (emp.ratings || []).find(r =>
                                r.floorNumber === floorName &&
                                r.roomNumber === room &&
                                r.ratedAt && r.ratedAt.slice(0, 10) === date
                            );
                            return ratingObj ? ratingObj.rating : '';
                        });
                        const validRatings = ratings.filter(x => typeof x === 'number' && !isNaN(x));
                        const weeklyAvg = validRatings.length > 0 ? (validRatings.reduce((a, b) => a + b, 0) / validRatings.length).toFixed(2) : '';
                        wsData.push([room, ...ratings, weeklyAvg]);
                    });
                    // Total Score Harian (daily average)
                    const dailyAverages = weekDays.map((date, idx) => {
                        if (!date) return '';
                        const dayRatings = roomNames.map(room => {
                            const ratingObj = (emp.ratings || []).find(r =>
                                r.floorNumber === floorName &&
                                r.roomNumber === room &&
                                r.ratedAt && r.ratedAt.slice(0, 10) === date
                            );
                            return ratingObj ? ratingObj.rating : null;
                        }).filter(x => typeof x === 'number' && !isNaN(x));
                        return dayRatings.length > 0 ? (dayRatings.reduce((a, b) => a + b, 0) / dayRatings.length).toFixed(2) : '';
                    });
                    // Weekly average (all rooms, all days)
                    const allRatings = roomNames.flatMap(room => weekDays.map((date, idx) => {
                        if (!date) return null;
                        const ratingObj = (emp.ratings || []).find(r =>
                            r.floorNumber === floorName &&
                            r.roomNumber === room &&
                            r.ratedAt && r.ratedAt.slice(0, 10) === date
                        );
                        return ratingObj ? ratingObj.rating : null;
                    })).filter(x => typeof x === 'number' && !isNaN(x));
                    const weekAvg = allRatings.length > 0 ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2) : '';
                    wsData.push(['Total Score Harian', ...dailyAverages, weekAvg]);
                    wsData.push([]); // Empty row between weeks
                });
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                // Style: bold headers and borders
                tableStartRows.forEach(headerRowIdx => {
                    const ref = XLSX.utils.encode_range({ s: { r: headerRowIdx, c: 0 }, e: { r: headerRowIdx, c: 7 } });
                    for (let c = 0; c <= 7; c++) {
                        const cell = ws[XLSX.utils.encode_cell({ r: headerRowIdx, c })];
                        if (cell) {
                            cell.s = cell.s || {};
                            cell.s.font = { bold: true };
                            cell.s.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
                        }
                    }
                });
                // Add borders to all table cells
                ws['!rows'] = ws['!rows'] || [];
                for (let r = 0; r < wsData.length; r++) {
                    for (let c = 0; c < wsData[r].length; c++) {
                        const cell = ws[XLSX.utils.encode_cell({ r, c })];
                        if (cell) {
                            cell.s = cell.s || {};
                            cell.s.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
                        }
                    }
                }
                let sheetName = `${emp.name} - ${floorName}`;
                if (sheetName.length > 31) sheetName = sheetName.slice(0, 31);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });
        });
        XLSX.writeFile(wb, `scorecards_month_${today.toISOString().slice(0,7)}.xlsx`);
    };

    return (
        <AdminLayout>
        {showSuccessAlert && (
            <div 
                className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
                    successAlertVisible 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 -translate-y-full'
                }`}
            >
                <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span className="font-semibold">Ratings saved!</span>
                </div>
            </div>
        )}
        {showUpdateAlert && (
            <div 
                className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
                    updateAlertVisible 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 -translate-y-full'
                }`}
            >
                <div className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                    <Pencil className="w-6 h-6 text-white" />
                    <span className="font-semibold">Ratings updated!</span>
                </div>
            </div>
        )}
        {showDeleteAlert && (
            <div 
                className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
                    deleteAlertVisible 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 -translate-y-full'
                }`}
            >
                <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                    <Trash2 className="w-6 h-6 text-white" />
                    <span className="font-semibold">Ratings deleted!</span>
                </div>
            </div>
        )}
        <div className="px-4 py-8 md:p-8">
            <div className="flex justify-end mb-4 gap-2">
                <button
                    onClick={handleExportXLSX}
                    style={{ background: '#2563eb', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
                >
                    Export (Hari ini)
                </button>
                <button
                    onClick={handleExportWeekXLSX}
                    style={{ background: '#059669', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
                >
                    Export (Minggu ini)
                </button>
                <button
                    onClick={handleExportMonthXLSX}
                    style={{ background: '#f59e42', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
                >
                    Export (Bulan ini)
                </button>
            </div>
            <h2 className="text-center font-bold text-2xl">Today&apos;s Rating</h2>
            <p className="text-center mb-8 text-xs">Klik profil untuk menambah rating</p>
            <div className="flex flex-col md:flex-row md:justify-center md:gap-20 gap-6">
            {/* Group employees by company/building */}
            {buildingGroups.map(company => (
                <div key={company} className="flex flex-col items-stretch min-w-0 max-w-full md:min-w-[320px] md:max-w-[400px] w-full">
                <div className="text-center mb-4">
                    <span className="inline-block text-2xl font-extrabold tracking-wide text-gray-900 uppercase mb-1" style={{ fontFamily: 'inherit' }}>{company}</span>
                    <div className="w-12 h-1.5 bg-gradient-to-r from-green-400 via-green-400 to-blue-400 rounded mt-2 mx-auto" />
                </div>
                {employees.filter(e => e.assignedBuilding === company).map(emp => (
                    <div
                    key={emp.id}
                    className="flex items-center mb-6 border border-gray-200 rounded-lg p-2 bg-gray-50"
                    >
                    <div
                        className="w-16 h-16 min-w-16 min-h-16 max-w-16 max-h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-blue-700 mr-4 overflow-hidden flex-shrink-0"
                    >
                        {emp.profilePicture ? (
                            <Image
                            src={emp.profilePicture}
                            alt={emp.name}
                            width={64}
                            height={64}
                            className="w-full h-full rounded-full object-cover block"
                            onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
                            />
                        ) : (
                            <span className="w-full text-center leading-[64px] block">
                            {(emp.name || "").split(" ").map(word => word.charAt(0).toUpperCase()).join("")}
                            </span>
                        )}
                    </div>
                    <div className="flex-1">
                        <div><b>Nama:</b> {emp.name}</div>
                        <div className="font-bold text-sm">Rating per Ruang:</div>
                        {(emp.assignedFloors || []).map(floor => {
                        const today = new Date().toISOString().slice(0, 10);
                        const building = facilities.find(b => b.name === emp.assignedBuilding);
                        const floorObj = building ? (building.floors || []).find(f => f.floorName === floor) : null;
                        const allRooms = floorObj ? floorObj.rooms : [];
                        return (
                            <div key={floor} className="ml-2 mb-3 bg-gray-100 rounded-lg p-2 shadow-sm">
                            <div className="inline-block font-bold text-base text-blue-700 bg-blue-50 rounded-full px-6 mb-2 uppercase tracking-wide shadow border border-blue-200">
                                {floor}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {allRooms.length > 0 ? (
                                allRooms.map(room => {
                                    const roomRating = (emp.ratings || []).find(r => r.floorNumber === floor && r.roomNumber === room.roomname && r.ratedAt && r.ratedAt.slice(0, 10) === today);
                                    const isRated = !!roomRating;
                                    return (
                                    <div
                                        key={room.id}
                                        className={`px-4 py-2 rounded-xl font-semibold text-base min-w-16 min-h-12 flex items-center justify-center mb-1 transition cursor-pointer ${isRated ? 'bg-green-100 text-green-800 border border-green-400 shadow' : 'bg-gray-200 text-gray-700 border border-gray-300'}`}
                                        style={{ boxShadow: isRated ? '0 1px 4px #a7f3d0' : 'none' }}
                                        onClick={e => { e.stopPropagation(); openModal(emp, floor, room.id); }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'scale(1.06)';
                                            e.currentTarget.style.boxShadow = isRated ? '0 4px 16px #a7f3d0' : '0 4px 16px #bbb';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                            e.currentTarget.style.boxShadow = isRated ? '0 1px 4px #a7f3d0' : 'none';
                                        }}
                                    >
                                        {room.roomname}: {isRated ? roomRating.rating : '-'}
                                    </div>
                                    );
                                })
                                ) : (
                                <div className="text-gray-400">-</div>
                                )}
                            </div>
                            </div>
                        );
                        })}
                    </div>
                    </div>
                ))}
                </div>
            ))}
            </div>
            <Modal open={modalOpen} onClose={closeModal}>
            <div style={{ textAlign: 'center', marginBottom: 16, fontWeight: 'bold', fontSize: 22 }}>Add Rating</div>
            {selectedEmployee && (
                <>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Lantai</label>
                    <select value={selectedFloor} onChange={e => setSelectedFloor(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
                    {(selectedEmployee.assignedFloors || []).map(floor => (
                        <option key={floor} value={floor}>{floor}</option>
                    ))}
                    </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Ruang</label>
                    <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
                    <option value="">Pilih Ruang</option>
                    {rooms.map(room => (
                        <option key={room.id} value={room.id}>{room.roomname}</option>
                    ))}
                    </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Rating</label>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(num => (
                        <button key={num} type="button" onClick={() => setRating(num)} style={{ border: rating === num ? '2px solid #00d084' : '1px solid #ccc', background: rating === num ? '#eafff3' : '#fff', borderRadius: 6, width: 32, height: 32, fontWeight: 600, cursor: 'pointer' }}>{num}</button>
                    ))}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>{rating === 1 ? 'Sangat Tidak Puas' : rating === 10 ? 'Sangat Puas' : ''}</div>
                </div>
                {errorMsg && <div style={{ color: 'red', marginBottom: 8 }}>{errorMsg}</div>}
                {success && <div style={{ color: 'green', marginBottom: 8 }}>Rating saved!</div>}
                <button
                    onClick={handleSave}
                    disabled={!selectedRoom || !rating || saving}
                    style={{ background: '#00ff90', color: '#222', fontWeight: 600, border: 'none', borderRadius: 8, padding: '10px 32px', fontSize: 18, marginTop: 8, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
                >
                    {saving ? 'Saving...' : '✓ Save'}
                </button>
                <button
                    onClick={handleClear}
                    disabled={!selectedRoom || saving}
                    style={{ background: '#ffdddd', color: '#b91c1c', fontWeight: 600, border: 'none', borderRadius: 8, padding: '10px 32px', fontSize: 16, marginTop: 8, marginLeft: 12, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
                >
                    {saving ? 'Clearing...' : '🗑️ Clear Rating'}
                </button>
                </>
            )}
            </Modal>
        </div>
        </AdminLayout>
    );
};

export default AdminRatingsPage;