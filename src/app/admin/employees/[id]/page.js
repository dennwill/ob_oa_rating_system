"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdminLayout from "@/components/layout/AdminLayout";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit, Trash2, User, Mail, Calendar, MapPin, Building } from "lucide-react";

export default function EmployeeDetail() {
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [formData, setFormData] = useState({});
    const router = useRouter();
    const params = useParams();

    // New state for facilities/buildings/floors
    const [facilities, setFacilities] = useState([]);
    const [loadingFacilities, setLoadingFacilities] = useState(true);
    const [facilitiesError, setFacilitiesError] = useState(null);
    const [availableFloors, setAvailableFloors] = useState([]);
    const [floorAssignments, setFloorAssignments] = useState([]);
    const [loadingFloorAssignments, setLoadingFloorAssignments] = useState(true);

    const fileInputRef = useRef();
    const [profilePreview, setProfilePreview] = useState("");
    const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [successAlertVisible, setSuccessAlertVisible] = useState(false);

    // New state for facilities/buildings/floors
    const [originalAssignment, setOriginalAssignment] = useState({ building: '', floors: [] });

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

    // Fetch floor assignments (excluding current employee)
    useEffect(() => {
        const fetchFloorAssignments = async () => {
            setLoadingFloorAssignments(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/facilities/floor-assignments?excludeEmployeeId=${params.id}`, {
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
        if (params.id) {
            fetchFloorAssignments();
        }
    }, [params.id]);

    // Update available floors when building changes
    useEffect(() => {
        if (!formData.assignedBuilding) {
            setAvailableFloors([]);
            setFormData(prev => ({ ...prev, assignedFloors: [] }));
            return;
        }
        const selected = facilities.find(b => b.name === formData.assignedBuilding);
        setAvailableFloors(selected ? selected.floors : []);
        // If switching to a different building, clear assignedFloors
        // If switching back to the original, restore the original floors
        if (selected) {
            setFormData(prev => {
                if (formData.assignedBuilding === originalAssignment.building) {
                    return { ...prev, assignedFloors: originalAssignment.floors };
                } else {
                    return { ...prev, assignedFloors: [] };
                }
            });
        }
    }, [formData.assignedBuilding, facilities, originalAssignment]);

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                
                if (!token) {
                    throw new Error('No authentication token found');
                }

                const response = await fetch(`/api/employees/${params.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch employee data');
                }

                const data = await response.json();
                setEmployee(data.employee);
                setFormData({
                    name: data.employee.name,
                    email: data.employee.email,
                    dateOfBirth: data.employee.date_of_birth ? data.employee.date_of_birth.split('T')[0] : '',
                    gender: data.employee.gender,
                    assignedBuilding: data.employee.assigned_building || '',
                    assignedFloors: Array.isArray(data.employee.assigned_floors) ? data.employee.assigned_floors : [],
                    profilePicture: data.employee.profile_picture || ''
                });
                setOriginalAssignment({
                    building: data.employee.assigned_building || '',
                    floors: Array.isArray(data.employee.assigned_floors) ? data.employee.assigned_floors : []
                });
                if (data.employee.profile_picture) {
                    setProfilePreview(data.employee.profile_picture);
                }
            } catch (err) {
                setError(err.message);
                console.error('Employee data fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchEmployee();
        }
    }, [params.id]);

    const handleEdit = async () => {
        try {
            // Check if any selected floors are already assigned to other employees
            const conflictingFloors = formData.assignedFloors.filter(floorName => {
                const floorAssignment = floorAssignments.find(
                    fa => fa.buildingName === formData.assignedBuilding && fa.floorName === floorName
                );
                return floorAssignment && floorAssignment.isAssigned;
            });

            if (conflictingFloors.length > 0) {
                setError(`The following floors are already assigned to other employees: ${conflictingFloors.join(', ')}`);
                return;
            }

            const token = localStorage.getItem('token');
            const response = await fetch(`/api/employees/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    assignedFloors: formData.assignedFloors,
                    profilePicture: formData.profilePicture || employee.profilePicture || employee.profile_picture || ""
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update employee');
            }

            const data = await response.json();
            setEmployee(data.employee);
            setIsEditing(false);
            setShowSuccessAlert(true);
            // Small delay to ensure the element is rendered before starting animation
            setTimeout(() => setSuccessAlertVisible(true), 50);
            setTimeout(() => setSuccessAlertVisible(false), 2500); // start slide up before hiding
            setTimeout(() => setShowSuccessAlert(false), 3000);
        } catch (err) {
            setError(err.message);
            console.error('Update employee error:', err);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
            return;
        }

        try {
            setIsDeleting(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/employees/${params.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete employee');
            }

            router.push('/admin/employees');
        } catch (err) {
            setError(err.message);
            console.error('Delete employee error:', err);
            setIsDeleting(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name === "assignedFloors") {
            setFormData(prev => ({
                ...prev,
                assignedFloors: checked
                    ? [...prev.assignedFloors, value]
                    : prev.assignedFloors.filter((f) => f !== value),
            }));
        } else if (type === "radio") {
            setFormData(prev => ({ ...prev, [name]: value }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleProfileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePreview(URL.createObjectURL(file));
            // Upload to /api/upload
            try {
                const token = localStorage.getItem('token');
                const formData = new FormData();
                formData.append('file', file);
                formData.append('employeeId', params.id);
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    body: formData,
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to upload profile picture');
                setFormData(prev => ({ ...prev, profilePicture: data.fileUrl }));
            } catch (err) {
                setError(err.message || 'Failed to upload profile picture');
            }
        }
    };

    const handleRemoveProfile = () => {
        setProfilePreview("");
        setFormData(prev => ({ ...prev, profilePicture: "" }));
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleBack = () => {
        if (isEditing) {
            setShowUnsavedConfirm(true);
        } else {
            router.push('/admin/employees');
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading employee details...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="text-red-600 text-6xl mb-4">⚠️</div>
                        <p className="text-red-600 mb-2">Error loading employee</p>
                        <p className="text-gray-600">{error}</p>
                        <Button 
                            onClick={() => window.location.reload()} 
                            className="mt-4 bg-blue-600 hover:bg-blue-700"
                        >
                            Retry
                        </Button>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (!employee) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="text-gray-600 text-6xl mb-4">👤</div>
                        <p className="text-gray-600 mb-2">Employee not found</p>
                        <Button 
                            onClick={() => router.push('/admin/employees')} 
                            className="mt-4 bg-blue-600 hover:bg-blue-700"
                        >
                            Back to Employees
                        </Button>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="mb-8">
                <div className="flex items-center space-x-4 mb-4">
                    <Button 
                        variant="outline" 
                        onClick={handleBack}
                        className="flex items-center space-x-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Employees
                    </Button>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Details</h1>
                <p className="text-gray-600">View and manage employee information.</p>
            </div>

            {/* Confirmation Modal */}
            {showUnsavedConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full">
                        <h2 className="text-lg font-bold mb-4">Unsaved Changes</h2>
                        <p className="mb-6">You have unsaved changes. Are you sure you want to leave? Any changes will not be saved.</p>
                        <div className="flex justify-end gap-4">
                            <Button variant="outline" onClick={() => setShowUnsavedConfirm(false)}>
                                Cancel
                            </Button>
                            <Button className="bg-red-600 hover:bg-red-700" onClick={() => router.push('/admin/employees')}>
                                Leave Without Saving
                            </Button>
                        </div>
                    </div>
                </div>
            )}

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
                        <span className="font-semibold">Changes saved successfully!</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Employee Profile Card */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <User className="w-5 h-5" />
                            <span>Profile</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center mb-6">
                            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                                {profilePreview || employee.profilePicture || employee.profile_picture ? (
                                    <img 
                                        src={profilePreview || employee.profilePicture || employee.profile_picture} 
                                        alt={formData.name || employee.name}
                                        className="w-24 h-24 rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="text-blue-600 text-2xl font-semibold">
                                        {(formData.name || employee.name || "").charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            {isEditing && (
                                <div className="flex gap-4 justify-center mb-2">
                                    <label className="text-sm cursor-pointer">
                                        <span className="text-black">Change Picture</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleProfileChange}
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        className="text-sm text-red-500 hover:underline"
                                        style={{ alignSelf: 'center' }}
                                        onClick={() => {
                                            setProfilePreview('/uploads/default-avatar.jpg');
                                            setFormData(prev => ({ ...prev, profilePicture: '/uploads/default-avatar.jpg' }));
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                    >
                                        Remove Profile Picture
                                    </button>
                                </div>
                            )}
                            <h2 className="text-xl font-semibold text-gray-900">{formData.name || employee.name}</h2>
                            <p className="text-gray-600">{formData.email || employee.email}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <div>
                                    <p className="text-sm text-gray-500">Date of Birth</p>
                                    <p className="text-gray-900">
                                        {employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <User className="w-4 h-4 text-gray-500" />
                                <div>
                                    <p className="text-sm text-gray-500">Gender</p>
                                    <p className="text-gray-900 capitalize">{employee.gender || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <div>
                                    <p className="text-sm text-gray-500">Joined</p>
                                    <p className="text-gray-900">
                                        {employee.created_at ? new Date(employee.created_at).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Employee Details Card */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Building className="w-5 h-5" />
                            <span>Assignment Details</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isEditing ? (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                                    <Input
                                        id="dateOfBirth"
                                        name="dateOfBirth"
                                        type="date"
                                        value={formData.dateOfBirth}
                                        onChange={handleInputChange}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="gender">Gender</Label>
                                    <select
                                        id="gender"
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        {/* <option value="other">Other</option> */}
                                    </select>
                                </div>
                                <div className="flex gap-4">
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
                                                        name="assignedBuilding"
                                                        value={b.name}
                                                        checked={formData.assignedBuilding === b.name}
                                                        onChange={handleInputChange}
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
                                            {formData.assignedBuilding === "" ? (
                                                <span className="text-gray-500">Pilih gedung terlebih dahulu</span>
                                            ) : availableFloors.length === 0 ? (
                                                <span className="text-gray-500">No floors found for this building</span>
                                            ) : availableFloors.map((f) => {
                                                const floorName = f.floorName;
                                                // Check if this floor is already assigned to another employee
                                                const floorAssignment = floorAssignments.find(
                                                    fa => fa.buildingName === formData.assignedBuilding && fa.floorName === floorName
                                                );
                                                const isAssigned = floorAssignment && floorAssignment.isAssigned;
                                                const isCurrentlyAssigned = formData.assignedFloors.includes(floorName);
                                                
                                                return (
                                                    <label key={f.id} className={`inline-flex items-center mb-1 ${isAssigned && !isCurrentlyAssigned ? 'opacity-50' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            name="assignedFloors"
                                                            value={floorName}
                                                            checked={formData.assignedFloors.includes(floorName)}
                                                            disabled={isAssigned && !isCurrentlyAssigned}
                                                            onChange={handleInputChange}
                                                        />
                                                        <span className="ml-2">
                                                            {floorName}
                                                            {isAssigned && !isCurrentlyAssigned && (
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
                                <div className="flex space-x-3 pt-4">
                                    <Button 
                                        onClick={handleEdit}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        Save Changes
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        onClick={() => setIsEditing(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-sm text-gray-500">Full Name</p>
                                                <p className="text-gray-900 font-medium">{employee.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Email Address</p>
                                                <p className="text-gray-900 font-medium">{employee.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Date of Birth</p>
                                                <p className="text-gray-900 font-medium">
                                                    {employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Gender</p>
                                                <p className="text-gray-900 font-medium capitalize">{employee.gender || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Assignment</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-sm text-gray-500">Assigned Building</p>
                                                <p className="text-gray-900 font-medium">{employee.assigned_building || 'Not assigned'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Assigned Floors</p>
                                                <p className="text-gray-900 font-medium">
                                                    {employee.assigned_floors && Array.isArray(employee.assigned_floors) 
                                                        ? employee.assigned_floors.join(', ') 
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Employee ID</p>
                                                <p className="text-gray-900 font-medium">{employee.id}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Status</p>
                                                <p className="text-gray-900 font-medium">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {employee.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex space-x-3 pt-6 border-t border-gray-200">
                                    <Button 
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Edit className="w-4 h-4" />
                                        <span>Edit Employee</span>
                                    </Button>
                                    <Button 
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>{isDeleting ? 'Deleting...' : 'Delete Employee'}</span>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
} 