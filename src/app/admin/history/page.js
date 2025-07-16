"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { differenceInDays, format } from "date-fns";
import { UserCircle, PlusCircle, Edit2, Trash2, Star, Clock } from "lucide-react";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB");
}

function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatActivity(log) {
    // Debug output for ADD_RATING and DELETE_RATING
    if (log.action === "ADD_RATING" || log.action === "DELETE_RATING") {
        console.log("DEBUG LOG:", log);
    }
    // You can expand this for more detailed formatting per action/table
    let desc = "";
    if (log.action === "CREATE_EMPLOYEE") {
        desc = (
        <span>
            <b>{log.user_name || "Admin"}</b> membuat employee baru <b>{log.new_values?.name || log.target_name}</b>
            {log.new_values?.email && (
            <> dengan email <a href={`mailto:${log.new_values.email}`}>{log.new_values.email}</a></>
            )}
        </span>
        );
    } else if (log.action === "ADD_RATING") {
        desc = (
        <span>
            <b>{log.user_name || "Admin"}</b> memberi rating <b>{log.new_values?.rating || log.new_values?.newRating}</b> kepada <b>{log.new_values?.employeeName || log.target_name}</b>
            {log.new_values?.roomName && <> untuk {log.new_values.roomName}</>}
            {log.new_values?.floorName && <> <b>lantai {log.new_values.floorName}</b></>}
            {log.new_values?.buildingName && <> di <b>{log.new_values.buildingName}</b></>}
            .
        </span>
        );
    } else if (log.action === "UPDATE_RATING") {
        desc = (
        <span>
            <b>{log.user_name || "Admin"}</b> mengubah rating <b>{log.new_values?.rating || log.new_values?.newRating}</b> kepada <b>{log.new_values?.employeeName || log.target_name}</b>
            {log.new_values?.roomName && <> untuk {log.new_values.roomName}</>}
            {log.new_values?.floorName && <> <b>lantai {log.new_values.floorName}</b></>}
            {log.new_values?.buildingName && <> di <b>{log.new_values.buildingName}</b></>}
            {log.old_values?.oldRating && <> (dari {log.old_values.oldRating})</>}
            .
        </span>
        );
    } else if (log.action === "DELETE_RATING") {
        desc = (
        <span>
            <b>{log.user_name || "Admin"}</b> menghapus rating <b>{log.old_values?.rating}</b> kepada <b>{log.old_values?.employeeName}</b>
            {log.old_values?.roomName && <> untuk {log.old_values.roomName}</>}
            {log.old_values?.floorName && <> <b>lantai {log.old_values.floorName}</b></>}
            {log.old_values?.buildingName && <> di <b>{log.old_values.buildingName}</b></>}
            .
        </span>
        );
    } else if (log.action === "DELETE_EMPLOYEE") {
        desc = (
        <span>
            <b>{log.user_name || "Admin"}</b> menghapus employee <b>{log.old_values?.name || log.target_name}</b> dari database.
        </span>
        );
    } else {
        desc = (
        <span>
            <b>{log.user_name || "Admin"}</b> melakukan aksi <b>{log.action}</b> pada <b>{log.table_name}</b>.
        </span>
        );
    }
    return desc;
}

function groupLogsByDate(logs) {
    const grouped = {};
    logs.forEach((log) => {
        const date = formatDate(log.created_at);
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(log);
    });
    // Sort by date descending
    return Object.entries(grouped)
        .sort((a, b) => new Date(b[0].split("-").reverse().join("-")) - new Date(a[0].split("-").reverse().join("-")))
        .map(([date, logs]) => ({ date, activities: logs }));
}

function ActionIcon({ action }) {
  if (action === "CREATE_EMPLOYEE") return <PlusCircle className="text-green-600" size={20} />;
  if (action === "ADD_RATING") return <Star className="text-yellow-500" size={20} />;
  if (action === "UPDATE_RATING") return <Edit2 className="text-blue-600" size={20} />;
  if (action === "DELETE_RATING" || action === "DELETE_EMPLOYEE") return <Trash2 className="text-red-600" size={20} />;
  return <Clock className="text-gray-400" size={20} />;
}

function UserAvatar({ name, profilePicture }) {
  const brokenDefaults = [
    "/api/uploads/default-avatar.jpg",
    "/profile-placeholder.png"
  ];

  const valid =
    typeof profilePicture === 'string' &&
    profilePicture.trim() !== '' &&
    profilePicture.trim().toLowerCase() !== 'null' &&
    profilePicture.trim().toLowerCase() !== 'undefined' &&
    !brokenDefaults.includes(profilePicture.trim());

  if (valid) {
    return (
      <Image
        src={profilePicture}
        alt={name}
        width={32}
        height={32}
        className="rounded-full object-cover"
        unoptimized
      />
    );
  }
  // Fallback to UserCircle icon
  return (
    <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
      <UserCircle className="text-blue-600" size={24} />
    </span>
  );
}

function ActionBadge({ action }) {
  const map = {
    CREATE_EMPLOYEE: "bg-green-100 text-green-700 border-green-300",
    ADD_RATING: "bg-yellow-100 text-yellow-700 border-yellow-300",
    UPDATE_RATING: "bg-blue-100 text-blue-700 border-blue-300",
    DELETE_RATING: "bg-red-100 text-red-700 border-red-300",
    DELETE_EMPLOYEE: "bg-red-100 text-red-700 border-red-300",
  };
  return (
    <span className={clsx("px-2 py-0.5 rounded text-xs font-semibold border", map[action] || "bg-gray-100 text-gray-700 border-gray-300")}>{action.replace(/_/g, " ")}</span>
  );
}

export default function HistoryPage() {
    const [from, setFrom] = useState(null);
    const [to, setTo] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchLogs = async () => {
        setLoading(true);
        setError("");
        try {
        const token = localStorage.getItem("token");
        let url = "/api/history";
        // Add date filters if selected
        const params = [];
        if (from) params.push(`from=${format(from, "yyyy-MM-dd")}`);
        if (to) {
          const nextDay = new Date(to);
          nextDay.setDate(nextDay.getDate() + 1);
          params.push(`to=${format(nextDay, "yyyy-MM-dd")}`);
        }
        if (params.length) url += `?${params.join("&")}`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch history");
        const data = await res.json();
        setLogs(data.logs || []);
        } catch (err) {
        setError(err.message || "Failed to fetch history");
        } finally {
        setLoading(false);
        }
    };

    const fetchAllLogs = async () => {
        setLoading(true);
        setError("");
        try {
        const token = localStorage.getItem("token");
        const url = "/api/history";
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch history");
        const data = await res.json();
        setLogs(data.logs || []);
        } catch (err) {
        setError(err.message || "Failed to fetch history");
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllLogs();
        // eslint-disable-next-line
    }, []);

    const grouped = groupLogsByDate(logs);

    // Calculate duration
    let duration = null;
    if (from && to) {
        const days = differenceInDays(to, from) + 1;
        if (days > 0) duration = `${days} day${days > 1 ? "s" : ""}`;
    }

    return (
        <AdminLayout>
            <div className="max-w-3xl mx-auto px-2 py-8">
                {/* Filter Bar */}
                <div className="flex flex-wrap items-end gap-4 mb-6 bg-white rounded-xl shadow p-4 border">
                    <div>
                        <label className="block font-medium mb-1">From</label>
                        <DatePicker
                            selected={from}
                            onChange={date => {
                                setFrom(date);
                                if (to && date && to < date) setTo(date);
                            }}
                            selectsStart
                            startDate={from}
                            endDate={to}
                            maxDate={to || undefined}
                            dateFormat="yyyy-MM-dd"
                            placeholderText="Start date"
                            className="border rounded px-2 py-1 w-36"
                            isClearable
                        />
                    </div>
                    <div>
                        <label className="block font-medium mb-1">To</label>
                        <DatePicker
                            selected={to}
                            onChange={date => setTo(date)}
                            selectsEnd
                            startDate={from}
                            endDate={to}
                            minDate={from || undefined}
                            dateFormat="yyyy-MM-dd"
                            placeholderText="End date"
                            className="border rounded px-2 py-1 w-36"
                            isClearable
                        />
                    </div>
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-60"
                        onClick={fetchLogs}
                        disabled={loading || !from || !to}
                        aria-label="Apply date filter"
                    >
                        {loading ? "Loading..." : "Apply"}
                    </button>
                    <button
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded font-semibold border border-gray-300"
                        onClick={() => {
                            setFrom(null);
                            setTo(null);
                            fetchAllLogs();
                        }}
                        disabled={loading || (!from && !to)}
                        aria-label="Reset date filter"
                    >
                        Reset
                    </button>
                    {duration && (
                        <span className="ml-2 font-medium text-gray-600">{duration}</span>
                    )}
                </div>
                {error && <div className="text-red-600 mb-4">{error}</div>}
                {/* Loading Skeleton */}
                {loading && (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-20" />
                        ))}
                    </div>
                )}
                {/* No Data */}
                {!loading && grouped.length === 0 && (
                    <div className="text-center text-gray-500 py-12">No history found</div>
                )}
                {/* History Cards */}
                <div className="space-y-8">
                    {grouped.map(day => (
                        <div key={day.date}>
                            <div className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                                <Clock className="text-blue-500" size={18} /> {day.date}
                            </div>
                            <div className="space-y-3">
                                {day.activities.map(log => (
                                    <div key={log.id} className="bg-white rounded-xl shadow flex flex-col md:flex-row md:items-center gap-4 p-4 border border-gray-200 hover:shadow-lg transition-shadow">
                                        <div className="flex items-center gap-3 min-w-[120px]">
                                            <ActionIcon action={log.action} />
                                            <ActionBadge action={log.action} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <UserAvatar name={log.user_name} profilePicture={log.user_profile_picture} />
                                                <span className="font-semibold text-gray-900 truncate">{log.user_name || "Admin"}</span>
                                                <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                                            </div>
                                            <div className="text-gray-700 text-sm leading-relaxed">{formatActivity(log)}</div>
                                        </div>
                                        <div className="flex flex-col items-end min-w-[90px]">
                                            <span className="text-xs text-gray-500">{formatTime(log.created_at)}</span>
                                            <span className="text-xs text-gray-400" title={log.created_at}>{log.created_at}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}