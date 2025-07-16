"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import AdminLayout from "@/components/layout/AdminLayout";

export default function AddEmployeePage() {
    const router = useRouter();
    const [form, setForm] = useState({
        name: "",
        email: "",
        dob: "",
        gender: "",
        building: "",
        floors: [],
        profilePic: null,
    });
    const [profilePreview, setProfilePreview] = useState(null);
    const fileInputRef = useRef();
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // New state for facilities/buildings/floors
    const [facilities, setFacilities] = useState([]);
    const [loadingFacilities, setLoadingFacilities] = useState(true);
    const [facilitiesError, setFacilitiesError] = useState(null);
    const [availableFloors, setAvailableFloors] = useState([]);
    const [floorAssignments, setFloorAssignments] = useState([]);
    const [loadingFloorAssignments, setLoadingFloorAssignments] = useState(true);

    // Fetch facilities (buildings and floors) on mount
    useEffect(() => {
        const fetchFacilities = async () => {
            setLoadingFacilities(true);
            setFacilitiesError(null);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/facilities', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                });
                if (!res.ok) throw new Error('Failed to fetch buildings/floors');
                const data = await res.json();
                setFacilities(data.facilities || []);
            } catch (err) {
                setFacilitiesError(err.message || 'Unknown error');
            } finally {
                setLoadingFacilities(false);
            }
        };
        fetchFacilities();
    }, []);

    // Fetch floor assignments
    useEffect(() => {
        const fetchFloorAssignments = async () => {
            setLoadingFloorAssignments(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/facilities/floor-assignments', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                });
                if (!res.ok) throw new Error('Failed to fetch floor assignments');
                const data = await res.json();
                setFloorAssignments(data.floorAssignments || []);
            } catch (err) {
                console.error('Floor assignments fetch error:', err);
            } finally {
                setLoadingFloorAssignments(false);
            }
        };
        fetchFloorAssignments();
    }, []);

    // Update available floors when building changes
    useEffect(() => {
        if (!form.building) {
            setAvailableFloors([]);
            return;
        }
        const selected = facilities.find(b => b.name === form.building);
        setAvailableFloors(selected ? selected.floors : []);
        // Reset floors if building changes
        setForm(prev => ({ ...prev, floors: [] }));
    }, [form.building, facilities]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === "floors") {
            setForm((prev) => ({
                ...prev,
                floors: checked
                    ? [...prev.floors, value]
                    : prev.floors.filter((f) => f !== value),
            }));
        } else if (type === "radio") {
            setForm((prev) => ({ ...prev, [name]: value }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleProfileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePreview(URL.createObjectURL(file));
            // Upload to /api/upload
            try {
                const token = localStorage.getItem('token');
                const formDataUpload = new FormData();
                formDataUpload.append('file', file);
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    body: formDataUpload,
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to upload profile picture');
                setForm((prev) => ({ ...prev, profilePic: file, profilePicture: data.fileUrl }));
            } catch (err) {
                setSubmitError(err.message || 'Failed to upload profile picture');
            }
        }
    };
    const handleRemoveProfile = () => {
        setForm((prev) => ({ ...prev, profilePic: null, profilePicture: "" }));
        setProfilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleBack = () => router.push("/admin/employees");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError(null);
        try {
            const token = localStorage.getItem('token');
            let profilePictureUrl = null;
            // 1. Upload profile picture if present
            if (form.profilePic) {
                const formData = new FormData();
                formData.append('file', form.profilePic);
                // Optionally, you can append employeeId if you have it
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    body: formData,
                });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload profile picture');
                profilePictureUrl = uploadData.fileUrl;
            }

            // 2. Prepare employee data
            // Gender mapping
            let gender = form.gender;
            if (gender === 'Laki-laki') gender = 'male';
            else if (gender === 'Perempuan') gender = 'female';
            else gender = 'other';

            // assignedFloors: array of selected floor names
            const assignedFloors = form.floors;

            // Prompt for a password (or generate a default one)
            let password = prompt('Enter a password for the new employee:');
            if (!password) throw new Error('Password is required');

            // Pre-submit check for required fields
            if (!form.name || !form.email || !form.dob || !gender || !form.building || assignedFloors.length === 0 || !password) {
                setSubmitError('All fields are required. Please fill in all fields and select at least one floor.');
                setSubmitting(false);
                return;
            }

            // Check if any selected floors are already assigned to other employees
            const conflictingFloors = assignedFloors.filter(floorName => {
                const floorAssignment = floorAssignments.find(
                    fa => fa.buildingName === form.building && fa.floorName === floorName
                );
                return floorAssignment && floorAssignment.isAssigned;
            });

            if (conflictingFloors.length > 0) {
                setSubmitError(`The following floors are already assigned to other employees: ${conflictingFloors.join(', ')}`);
                setSubmitting(false);
                return;
            }

            const payload = {
                name: form.name,
                email: form.email,
                dateOfBirth: form.dob,
                gender,
                assignedBuilding: form.building,
                assignedFloors,
                password,
                ...(profilePictureUrl ? { profilePicture: profilePictureUrl } : {}),
            };
            console.log('Submitting employee:', payload);

            // 3. Send employee data to API
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add employee');
            alert('Employee saved!');
            handleBack();
        } catch (err) {
            setSubmitError(err.message || 'Unknown error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AdminLayout>
        <div className="max-w-5xl mx-auto py-8 px-2 sm:px-4">
            <button
            className="flex items-center mb-6 text-lg font-semibold text-gray-700 hover:underline"
            onClick={handleBack}
            >
            <span className="mr-2">&#8592;</span> Back
            </button>
            <h1 className="text-3xl font-bold text-center mb-8">Add Employee Details</h1>
            <form onSubmit={handleSubmit} className="flex flex-col-reverse md:flex-row gap-8">
            <div className="flex-1 min-w-0 max-w-lg w-full">
                <div className="mb-4">
                <Label htmlFor="name">Nama</Label>
                <Input
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full"
                />
                </div>
                <div className="mb-4">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john.doe@moda-holding.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full"
                />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                    <Label htmlFor="dob">Tanggal Lahir</Label>
                    <div className="relative">
                    <Input
                        id="dob"
                        name="dob"
                        type="date"
                        value={form.dob}
                        onChange={handleChange}
                        required
                        className="mt-1 pr-10 w-full"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"/></svg>
                    </span>
                    </div>
                </div>
                <div className="flex-1">
                    <Label>Jenis Kelamin</Label>
                    <div className="flex flex-col mt-1">
                    <label className="inline-flex items-center mb-1">
                        <input
                        type="radio"
                        name="gender"
                        value="Laki-laki"
                        checked={form.gender === "Laki-laki"}
                        onChange={handleChange}
                        required
                        />
                        <span className="ml-2">Laki-laki</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                        type="radio"
                        name="gender"
                        value="Perempuan"
                        checked={form.gender === "Perempuan"}
                        onChange={handleChange}
                        required
                        />
                        <span className="ml-2">Perempuan</span>
                    </label>
                    </div>
                </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                    <Label>Gedung</Label>
                    <div className="flex flex-col mt-1">
                        {loadingFacilities ? (
                            <span className="text-gray-500">Loading buildings...</span>
                        ) : facilitiesError ? (
                            <span className="text-red-500">{facilitiesError}</span>
                        ) : facilities.length === 0 ? (
                            <span className="text-gray-500">No buildings found</span>
                        ) : facilities.map((b) => (
                            <label key={b.id} className="inline-flex items-center mb-1">
                                <input
                                    type="radio"
                                    name="building"
                                    value={b.name}
                                    checked={form.building === b.name}
                                    onChange={handleChange}
                                    required
                                />
                                <span className="ml-2">{b.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex-1">
                    <Label>Lantai</Label>
                    <div className="flex flex-col mt-1">
                        {form.building === "" ? (
                            <span className="text-gray-500">Pilih gedung terlebih dahulu</span>
                        ) : availableFloors.length === 0 ? (
                            <span className="text-gray-500">No floors found for this building</span>
                        ) : availableFloors.map((f) => {
                            const floorName = f.floorName;
                            const floorAssignment = floorAssignments.find(
                                fa => fa.buildingName === form.building && fa.floorName === floorName
                            );
                            const isAssigned = floorAssignment && floorAssignment.isAssigned;
                            return (
                                <label key={f.id} className={`inline-flex items-center mb-1 ${isAssigned ? 'opacity-50' : ''}`}>
                                    <input
                                        type="checkbox"
                                        name="floors"
                                        value={floorName}
                                        checked={form.floors.includes(floorName)}
                                        disabled={isAssigned}
                                        onChange={(e) => {
                                            const { checked } = e.target;
                                            setForm((prev) => ({
                                                ...prev,
                                                floors: checked
                                                    ? [...prev.floors, floorName]
                                                    : prev.floors.filter((fl) => fl !== floorName),
                                            }));
                                        }}
                                    />
                                    <span className="ml-2">
                                        {floorName}
                                        {isAssigned && (
                                            <span className="text-red-500 text-xs ml-1">
                                                (Assigned to {floorAssignment.assignedTo.name})
                                            </span>
                                        )}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
                </div>
                <Button
                type="submit"
                className="mt-6 px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full flex items-center shadow-md w-full sm:w-auto"
                disabled={submitting}
                >
                <span className="mr-2 text-xl">✔</span> {submitting ? 'Saving...' : 'Save'}
                </Button>
                {submitError && <div className="text-red-500 mt-2">{submitError}</div>}
            </div>
            <div className="flex-1 flex flex-col items-center justify-start min-w-0 w-full max-w-xs mx-auto">
                <div className="w-48 h-48 sm:w-64 sm:h-64 bg-gray-200 rounded flex items-center justify-center mb-4 overflow-hidden">
                {profilePreview ? (
                    <img src={profilePreview} alt="Profile Preview" className="object-cover w-full h-full" />
                ) : (
                    <svg width="120" height="120" fill="none" viewBox="0 0 120 120">
                    <circle cx="60" cy="48" r="28" fill="#A3A8AA" />
                    <ellipse cx="60" cy="92" rx="40" ry="22" fill="#A3A8AA" />
                    </svg>
                )}
                </div>
                <div className="flex gap-6">
                <label className="text-sm cursor-pointer">
                    <span className="text-black">Ubah Gambar</span>
                    <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleProfileChange}
                    />
                </label>
                {profilePreview && (
                    <button
                    type="button"
                    className="text-sm text-red-500 hover:underline"
                    onClick={handleRemoveProfile}
                    >
                    Hapus Gambar
                    </button>
                )}
                </div>
            </div>
            </form>
        </div>
        </AdminLayout>
    );
} 