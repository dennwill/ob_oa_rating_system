"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdminLayout from "@/components/layout/AdminLayout";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

// Custom hook for fetching employees data
function useEmployeesData() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                
                if (!token) {
                    throw new Error('No authentication token found');
                }

                const response = await fetch('/api/employees', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch employees data');
                }

                const data = await response.json();
                setEmployees(data.employees || []);
            } catch (err) {
                setError(err.message);
                console.error('Employees data fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, []);

    return { employees, loading, error };
}

export default function AdminEmployees() {
    const [searchTerm, setSearchTerm] = useState("");
    const { employees, loading, error } = useEmployeesData();
    const router = useRouter();

    const filteredEmployees = employees.filter(employee =>
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.assigned_building?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employee.assigned_floors && Array.isArray(employee.assigned_floors) && 
         employee.assigned_floors.some(floor => 
             floor.toLowerCase().includes(searchTerm.toLowerCase())
         ))
    );

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading employees...</p>
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
                        <p className="text-red-600 mb-2">Error loading employees</p>
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

    return (
        <AdminLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Employees</h1>
                <p className="text-gray-600">Manage and view all employees in the system.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <span className="text-2xl">👥</span>
                        <span>Employee List</span>
                    </CardTitle>
                    <div className="flex items-center space-x-4 mt-4">
                        <div className="flex-1">
                            <Label htmlFor="search" className="sr-only">Search employees</Label>
                            <Input
                                id="search"
                                placeholder="Search employees by name, email, or building..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                        <Button className="bg-blue-600 hover:bg-blue-700 hover:cursor-pointer" onClick={() => router.push("/admin/employees/add")}> 
                            Add Employee
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Email</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Building</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Floor</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Joined</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map((employee) => (
                                        <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                                                        {(employee.profilePicture || employee.profile_picture) ? (
                                                            <img
                                                                src={employee.profilePicture || employee.profile_picture}
                                                                alt={employee.name}
                                                                className="w-10 h-10 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-blue-600 font-semibold">
                                                                {employee.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <button 
                                                            onClick={() => router.push(`/admin/employees/${employee.id}`)}
                                                            className="font-semibold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer text-left"
                                                        >
                                                            {employee.name}
                                                        </button>
                                                        <p className="text-sm text-gray-500">
                                                            {employee.gender} • {employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">{employee.email}</td>
                                            <td className="py-3 px-4 text-gray-600">{employee.assigned_building || 'Not assigned'}</td>
                                            <td className="py-3 px-4 text-gray-600">
                                                {employee.assigned_floors && Array.isArray(employee.assigned_floors) 
                                                    ? employee.assigned_floors.join(', ') 
                                                    : 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">
                                                {employee.created_at ? new Date(employee.created_at).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex space-x-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="text-blue-600 border-blue-600 hover:bg-blue-50 hover:cursor-pointer"
                                                        onClick={() => router.push(`/admin/employees/${employee.id}`)}
                                                    >
                                                        View
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="py-8 text-center text-gray-500">
                                            {searchTerm ? 'No employees found matching your search' : 'No employees found'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {filteredEmployees.length > 0 && (
                        <div className="mt-4 text-sm text-gray-600">
                            Showing {filteredEmployees.length} of {employees.length} employees
                        </div>
                    )}
                </CardContent>
            </Card>
        </AdminLayout>
    );
}