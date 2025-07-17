"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdminLayout from "@/components/layout/AdminLayout";



// Custom hook for fetching dashboard data
function useDashboardData() {
    const [data, setData] = useState({
        topPerformers: { week: [], month: [] },
        todaysRatingTasks: [],
        summary: {}
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            if (!token) {
            throw new Error('No authentication token found');
            }

            // Fetch data for both week and month periods
            const [weekData, monthData, tasksData] = await Promise.all([
            fetch('/api/dashboard?period=week&limit=5', {
                headers: {
                'Authorization': `Bearer ${token}`
                }
            }),
            fetch('/api/dashboard?period=month&limit=5', {
                headers: {
                'Authorization': `Bearer ${token}`
                }
            }),
            fetch('/api/dashboard?period=week&limit=10', {
                headers: {
                'Authorization': `Bearer ${token}`
                }
            })
            ]);

            if (!weekData.ok || !monthData.ok || !tasksData.ok) {
            throw new Error('Failed to fetch dashboard data');
            }

            const weekResult = await weekData.json();
            const monthResult = await monthData.json();
            const tasksResult = await tasksData.json();

            setData({
            topPerformers: {
                week: weekResult.topPerformers || [],
                month: monthResult.topPerformers || []
            },
            todaysRatingTasks: tasksResult.todaysRatingTasks || [],
            summary: tasksResult.summary || {}
            });
        } catch (err) {
            setError(err.message);
            console.error('Dashboard data fetch error:', err);
        } finally {
            setLoading(false);
        }
        };

        fetchDashboardData();
    }, []);

    return { data, loading, error };
}

export default function AdminDashboard() {
    const [searchTerm, setSearchTerm] = useState("");
    const { data, loading, error } = useDashboardData();

    const filteredToRate = data.todaysRatingTasks.filter(task =>
        task.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.buildingName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading dashboard data...</p>
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
                        <p className="text-red-600 mb-2">Error loading dashboard</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here&apos;s what&apos;s happening today.</p>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <Card>
                <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{data.summary.totalTasksToday || 0}</div>
                    <p className="text-sm text-gray-600">Total Tasks Today</p>
                </CardContent>
                </Card>
                <Card>
                <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{data.summary.completedTasks || 0}</div>
                    <p className="text-sm text-gray-600">Completed Today</p>
                </CardContent>
                </Card>
                <Card>
                <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">{data.summary.pendingTasksToday || 0}</div>
                    <p className="text-sm text-gray-600">Pending Today</p>
                </CardContent>
                </Card>
                <Card>
                <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">{data.summary.averageRating || '0.0'}</div>
                    <p className="text-sm text-gray-600">Avg Rating (Month)</p>
                </CardContent>
                </Card>
            </div>
            </div>

            {/* Top Employees Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top 5 This Month */}
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <span className="text-2xl">🏆</span>
                    <span>Top 5 This Month</span>
                </CardTitle>
                </CardHeader>
                <CardContent>
                <div className="space-y-3">
                    {data.topPerformers.month.length > 0 ? (
                    data.topPerformers.month.map((employee, index) => (
                        <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                            </div>
                            <div>
                            <p className="font-semibold text-gray-900">{employee.name}</p>
                            <p className="text-sm text-gray-600">{employee.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-blue-600">{employee.averageRating}⭐</p>
                            <p className="text-sm text-gray-600">{employee.totalRooms} rooms</p>
                        </div>
                        </div>
                    ))
                    ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>No data available for this month</p>
                    </div>
                    )}
                </div>
                </CardContent>
            </Card>

            {/* Top 5 This Week */}
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <span className="text-2xl">⚡</span>
                    <span>Top 5 This Week</span>
                </CardTitle>
                </CardHeader>
                <CardContent>
                <div className="space-y-3">
                    {data.topPerformers.week.length > 0 ? (
                    data.topPerformers.week.map((employee, index) => (
                        <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                            </div>
                            <div>
                            <p className="font-semibold text-gray-900">{employee.name}</p>
                            <p className="text-sm text-gray-600">{employee.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-green-600">{employee.averageRating}⭐</p>
                            <p className="text-sm text-gray-600">{employee.totalRooms} rooms</p>
                        </div>
                        </div>
                    ))
                    ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>No data available for this week</p>
                    </div>
                    )}
                </div>
                </CardContent>
            </Card>
            </div>

            {/* To Rate Today Section */}
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span className="text-2xl">📝</span>
                  <span>To Rate Today</span>
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-sm" style={{ width: 32, height: 32 }}>
                    {filteredToRate.length}
                  </span>
                </CardTitle>
                <div className="flex items-center space-x-4 mt-4">
                <div className="flex-1">
                    <Label htmlFor="search" className="sr-only">Search employees</Label>
                    <Input
                    id="search"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                    />
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => window.location.href = '/admin/ratings'}>
                    Go to Ratings
                </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                    <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Employee</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Building</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Floor</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Room</th>
                        {/* Removed Last Rating and Actions columns */}
                    </tr>
                    </thead>
                    <tbody>
                    {filteredToRate.length > 0 ? (
                        filteredToRate.map((task) => (
                        <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                            <p className="font-semibold text-gray-900">{task.employeeName}</p>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{task.buildingName}</td>
                            <td className="py-3 px-4 text-gray-600">{task.floorNumber}</td>
                            <td className="py-3 px-4 text-gray-600">{task.roomNumber}</td>
                            {/* Removed Last Rating and Actions columns */}
                        </tr>
                        ))
                    ) : (
                        <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500">
                            {searchTerm ? 'No employees found matching your search' : 'No tasks to rate today'}
                        </td>
                        </tr>
                    )}
                    </tbody>
                </table>
                </div>
            </CardContent>
            </Card>
        </AdminLayout>
    );
}
