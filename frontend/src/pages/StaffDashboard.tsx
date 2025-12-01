import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { AdoptionRequest, AdoptionRequestStatus, AppUser, Animal, MedicalRecord, IntakeRecord } from '../types/api';

type TabType = 'requests' | 'users' | 'animals';
type AnimalsViewMode = 'list' | 'medical' | 'intake';

const StaffDashboard = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('requests');

    // Requests tab state
    const [requests, setRequests] = useState<AdoptionRequest[]>([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);
    const [requestsError, setRequestsError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [userIdFilter, setUserIdFilter] = useState('');
    const [animalIdFilter, setAnimalIdFilter] = useState('');
    const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
    const [editingStatus, setEditingStatus] = useState<Map<string, AdoptionRequestStatus>>(new Map());

    // Users tab state
    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [usersError, setUsersError] = useState<string | null>(null);
    const [nameEmailFilter, setNameEmailFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('All');

    // Animals tab state
    const [animals, setAnimals] = useState<Animal[]>([]);
    const [isLoadingAnimals, setIsLoadingAnimals] = useState(false);
    const [animalsError, setAnimalsError] = useState<string | null>(null);
    const [animalSpeciesFilter, setAnimalSpeciesFilter] = useState('');
    const [animalStatusFilter, setAnimalStatusFilter] = useState('');
    const [animalNameFilter, setAnimalNameFilter] = useState('');
    const [animalsViewMode, setAnimalsViewMode] = useState<AnimalsViewMode>('list');

    // Medical records state
    const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
    const [selectedAnimalName, setSelectedAnimalName] = useState<string | null>(null);
    const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
    const [isLoadingMedical, setIsLoadingMedical] = useState(false);
    const [medicalError, setMedicalError] = useState<string | null>(null);
    const [medicalFilter, setMedicalFilter] = useState('');

    // Intake records state
    const [intakeRecords, setIntakeRecords] = useState<IntakeRecord[]>([]);
    const [isLoadingIntake, setIsLoadingIntake] = useState(false);
    const [intakeError, setIntakeError] = useState<string | null>(null);
    const [intakeFilter, setIntakeFilter] = useState('');

    // Fetch all adoption requests
    const fetchRequests = async () => {
        setIsLoadingRequests(true);
        setRequestsError(null);

        try {
            const response = await fetch('http://localhost:8000/adoption-requests');
            if (!response.ok) {
                throw new Error('Failed to fetch adoption requests');
            }

            const data: AdoptionRequest[] = await response.json();
            setRequests(data);
        } catch (err) {
            setRequestsError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoadingRequests(false);
        }
    };

    // Fetch all users
    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        setUsersError(null);

        try {
            const response = await fetch('http://localhost:8000/users');
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data: AppUser[] = await response.json();
            setUsers(data);
        } catch (err) {
            setUsersError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoadingUsers(false);
        }
    };

    // Fetch animals
    const fetchAnimals = async () => {
        setIsLoadingAnimals(true);
        setAnimalsError(null);

        try {
            const params = new URLSearchParams();
            if (animalSpeciesFilter.trim()) params.append('species', animalSpeciesFilter.trim());
            if (animalStatusFilter) params.append('status', animalStatusFilter);
            if (animalNameFilter.trim()) params.append('name_contains', animalNameFilter.trim());

            const queryString = params.toString();
            const url = `http://localhost:8000/animals/search${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch animals');
            }

            const data: Animal[] = await response.json();
            setAnimals(data);
        } catch (err) {
            setAnimalsError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoadingAnimals(false);
        }
    };

    // Fetch medical records for a specific animal
    const fetchMedicalRecords = async (animalId: number, animalName: string) => {
        setIsLoadingMedical(true);
        setMedicalError(null);
        setSelectedAnimalId(animalId);
        setSelectedAnimalName(animalName);
        setAnimalsViewMode('medical');

        try {
            const response = await fetch(`http://localhost:8000/animals/${animalId}/medical-records`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || 'Failed to fetch medical records');
            }
            const data: MedicalRecord[] = await response.json();
            setMedicalRecords(data);
        } catch (err) {
            setMedicalError(err instanceof Error ? err.message : 'An error occurred');
            setMedicalRecords([]);
        } finally {
            setIsLoadingMedical(false);
        }
    };

    // Fetch intake records for a specific animal
    const fetchIntakeRecords = async (animalId: number, animalName: string) => {
        setIsLoadingIntake(true);
        setIntakeError(null);
        setSelectedAnimalId(animalId);
        setSelectedAnimalName(animalName);
        setAnimalsViewMode('intake');

        try {
            const response = await fetch(`http://localhost:8000/animals/${animalId}/intake-records`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || 'Failed to fetch intake records');
            }
            const data: IntakeRecord[] = await response.json();
            setIntakeRecords(data);
        } catch (err) {
            setIntakeError(err instanceof Error ? err.message : 'An error occurred');
            setIntakeRecords([]);
        } finally {
            setIsLoadingIntake(false);
        }
    };

    // Auto-load data when switching tabs
    useEffect(() => {
        if (activeTab === 'requests') {
            fetchRequests();
        } else if (activeTab === 'users') {
            fetchUsers();
        } else if (activeTab === 'animals') {
            fetchAnimals();
        }
    }, [activeTab]);

    // Handle change status
    const handleChangeStatus = async (userId: number, animalId: number, newStatus: AdoptionRequestStatus) => {
        if (!currentUser) return;

        const key = `${userId}-${animalId}`;
        setProcessingRequests(prev => new Set(prev).add(key));
        setRequestsError(null);

        try {
            const response = await fetch(
                `http://localhost:8000/adoption-requests/${userId}/${animalId}/status?staff_user_id=${currentUser.U_USERID}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        AR_STATUS: newStatus,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to update status');
            }

            // Refresh the requests list
            await fetchRequests();

            // Clear editing status
            setEditingStatus(prev => {
                const newMap = new Map(prev);
                newMap.delete(key);
                return newMap;
            });
        } catch (err) {
            setRequestsError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setProcessingRequests(prev => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
            });
        }
    };

    // Handle cancel request
    const handleCancelRequest = async (userId: number, animalId: number) => {
        const key = `${userId}-${animalId}`;
        setProcessingRequests(prev => new Set(prev).add(key));
        setRequestsError(null);

        try {
            const response = await fetch(`http://localhost:8000/adoption-requests/${userId}/${animalId}/cancel`, {
                method: 'PATCH',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to cancel request');
            }

            // Refresh the requests list
            await fetchRequests();
        } catch (err) {
            setRequestsError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setProcessingRequests(prev => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
            });
        }
    };

    // Handle delete request (staff-only)
    const handleDeleteRequest = async (userId: number, animalId: number) => {
        if (!currentUser) return;

        const key = `${userId}-${animalId}`;
        setProcessingRequests(prev => new Set(prev).add(key));
        setRequestsError(null);

        try {
            const response = await fetch(
                `http://localhost:8000/adoption-requests/${userId}/${animalId}?staff_user_id=${currentUser.U_USERID}`,
                {
                    method: 'DELETE',
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to delete request');
            }

            // Refresh the requests list
            await fetchRequests();
        } catch (err) {
            setRequestsError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setProcessingRequests(prev => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
            });
        }
    };

    // Format date helper
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Get status badge color
    const getStatusBadgeColor = (status: AdoptionRequestStatus) => {
        switch (status) {
            case 'Submitted':
                return 'bg-sky-50 text-sky-700';
            case 'Under Review':
                return 'bg-amber-50 text-amber-700';
            case 'Approved':
                return 'bg-emerald-50 text-emerald-700';
            case 'Rejected':
                return 'bg-rose-50 text-rose-700';
            case 'Cancelled':
                return 'bg-gray-50 text-gray-600';
            default:
                return 'bg-gray-50 text-gray-600';
        }
    };

    // Filter requests
    const filteredRequests = requests.filter(request => {
        if (statusFilter !== 'All' && request.AR_STATUS !== statusFilter) return false;
        if (userIdFilter && request.AR_USERID.toString() !== userIdFilter) return false;
        if (animalIdFilter && request.AR_ANIMALID.toString() !== animalIdFilter) return false;
        return true;
    });

    // Filter users
    const filteredUsers = users.filter(user => {
        if (roleFilter !== 'All' && user.U_ROLE !== roleFilter) return false;
        if (nameEmailFilter) {
            const search = nameEmailFilter.toLowerCase();
            return (
                user.U_NAME.toLowerCase().includes(search) ||
                user.U_EMAIL.toLowerCase().includes(search)
            );
        }
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Left Sidebar */}
            <div className="w-56 bg-white shadow-sm border-r border-gray-100">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase">Staff Dashboard</h2>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{currentUser?.U_NAME}</p>
                </div>

                <nav className="mt-2">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`w-full text-left px-4 py-3 transition-colors ${activeTab === 'requests'
                            ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-500'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Requests
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`w-full text-left px-4 py-3 transition-colors ${activeTab === 'users'
                            ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-500'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Users
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('animals');
                            setAnimalsViewMode('list');
                        }}
                        className={`w-full text-left px-4 py-3 transition-colors ${activeTab === 'animals'
                            ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-500'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Animals
                    </button>
                </nav>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 p-6">
                {activeTab === 'requests' && (
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Adoption Requests</h1>

                        {/* Filters */}
                        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="All">All</option>
                                        <option value="Submitted">Submitted</option>
                                        <option value="Under Review">Under Review</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Rejected">Rejected</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                                    <input
                                        type="text"
                                        value={userIdFilter}
                                        onChange={(e) => setUserIdFilter(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Filter by user ID..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Animal ID</label>
                                    <input
                                        type="text"
                                        value={animalIdFilter}
                                        onChange={(e) => setAnimalIdFilter(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Filter by animal ID..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Error Display */}
                        {requestsError && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                {requestsError}
                            </div>
                        )}

                        {/* Requests Table */}
                        {isLoadingRequests ? (
                            <div className="text-center py-12">
                                <div className="text-gray-500">Loading requests...</div>
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-gray-500">No adoption requests found.</div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                User ID
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Animal ID
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Created At
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Updated At
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredRequests.map((request) => {
                                            const requestKey = `${request.AR_USERID}-${request.AR_ANIMALID}`;
                                            const isProcessing = processingRequests.has(requestKey);
                                            const editStatus = editingStatus.get(requestKey);

                                            return (
                                                <tr key={requestKey}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {request.AR_USERID}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {request.AR_ANIMALID}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getStatusBadgeColor(request.AR_STATUS)}`}>
                                                            {request.AR_STATUS}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDate(request.AR_CREATEDAT)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDate(request.AR_UPDATEDAT)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <div className="flex flex-col gap-2">
                                                            {/* Change Status */}
                                                            <div className="flex gap-2">
                                                                <select
                                                                    value={editStatus || request.AR_STATUS}
                                                                    onChange={(e) => {
                                                                        const newMap = new Map(editingStatus);
                                                                        newMap.set(requestKey, e.target.value as AdoptionRequestStatus);
                                                                        setEditingStatus(newMap);
                                                                    }}
                                                                    disabled={isProcessing || request.AR_STATUS === 'Approved'}
                                                                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                                                >
                                                                    <option value="Submitted">Submitted</option>
                                                                    <option value="Under Review">Under Review</option>
                                                                    <option value="Approved">Approved</option>
                                                                    <option value="Rejected">Rejected</option>
                                                                    <option value="Cancelled">Cancelled</option>
                                                                </select>
                                                                <button
                                                                    onClick={() => {
                                                                        const newStatus = editStatus || request.AR_STATUS;
                                                                        if (newStatus !== request.AR_STATUS) {
                                                                            handleChangeStatus(request.AR_USERID, request.AR_ANIMALID, newStatus);
                                                                        }
                                                                    }}
                                                                    disabled={isProcessing || !editStatus || editStatus === request.AR_STATUS || request.AR_STATUS === 'Approved'}
                                                                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-1 px-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    Update
                                                                </button>
                                                            </div>

                                                            {/* Cancel */}
                                                            {(request.AR_STATUS === 'Submitted' || request.AR_STATUS === 'Under Review') && (
                                                                <button
                                                                    onClick={() => handleCancelRequest(request.AR_USERID, request.AR_ANIMALID)}
                                                                    disabled={isProcessing}
                                                                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold py-1 px-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {isProcessing ? 'Processing...' : 'Cancel Request'}
                                                                </button>
                                                            )}

                                                            {/* Delete (staff-only, closed requests) */}
                                                            {(request.AR_STATUS === 'Cancelled' || request.AR_STATUS === 'Rejected') && (
                                                                <button
                                                                    onClick={() => handleDeleteRequest(request.AR_USERID, request.AR_ANIMALID)}
                                                                    disabled={isProcessing}
                                                                    className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-1 px-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {isProcessing ? 'Deleting...' : 'Delete'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Users</h1>

                        {/* Filters */}
                        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Search by Name/Email
                                    </label>
                                    <input
                                        type="text"
                                        value={nameEmailFilter}
                                        onChange={(e) => setNameEmailFilter(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Search..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        value={roleFilter}
                                        onChange={(e) => setRoleFilter(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="All">All</option>
                                        <option value="Adopter">Adopter</option>
                                        <option value="Staff">Staff</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Error Display */}
                        {usersError && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                {usersError}
                            </div>
                        )}

                        {/* Users Table */}
                        {isLoadingUsers ? (
                            <div className="text-center py-12">
                                <div className="text-gray-500">Loading users...</div>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-gray-500">No users found.</div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                ID
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Email
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Role
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredUsers.map((user) => (
                                            <tr key={user.U_USERID}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {user.U_USERID}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {user.U_NAME}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {user.U_EMAIL}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-block px-2 py-1 text-xs font-semibold rounded ${user.U_ROLE === 'Staff'
                                                            ? 'bg-purple-50 text-purple-700'
                                                            : 'bg-emerald-50 text-emerald-700'
                                                            }`}
                                                    >
                                                        {user.U_ROLE}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'animals' && (
                    <div>
                        {animalsViewMode === 'list' && (
                            <>
                                <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Animals</h1>

                                {/* Filters */}
                                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Name Contains
                                            </label>
                                            <input
                                                type="text"
                                                value={animalNameFilter}
                                                onChange={(e) => setAnimalNameFilter(e.target.value)}
                                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Search by name..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
                                            <input
                                                type="text"
                                                value={animalSpeciesFilter}
                                                onChange={(e) => setAnimalSpeciesFilter(e.target.value)}
                                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="e.g., Dog, Cat..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                            <select
                                                value={animalStatusFilter}
                                                onChange={(e) => setAnimalStatusFilter(e.target.value)}
                                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">All</option>
                                                <option value="Adoptable">Adoptable</option>
                                                <option value="Foster">Foster</option>
                                                <option value="Adopted">Adopted</option>
                                                <option value="Hold">Hold</option>
                                                <option value="Pending">Pending</option>
                                            </select>
                                        </div>

                                        <div className="flex items-end">
                                            <button
                                                onClick={fetchAnimals}
                                                disabled={isLoadingAnimals}
                                                className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isLoadingAnimals ? 'Loading...' : 'Apply Filters'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Error Display */}
                                {animalsError && (
                                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                        {animalsError}
                                    </div>
                                )}

                                {/* Animals Table */}
                                {isLoadingAnimals ? (
                                    <div className="text-center py-12">
                                        <div className="text-gray-500">Loading animals...</div>
                                    </div>
                                ) : animals.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="text-gray-500">No animals found.</div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        ID
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Name
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Species
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Breed
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Intake Date
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {animals.map((animal) => (
                                                    <tr key={animal.A_ANIMALID}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {animal.A_ANIMALID}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {animal.A_NAME}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {animal.A_SPECIES}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {animal.A_BREED || 'Unknown'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                                                                {animal.A_STATUS}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatDate(animal.A_INTAKEDATE)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => fetchMedicalRecords(animal.A_ANIMALID, animal.A_NAME)}
                                                                    className="text-xs font-semibold px-3 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                                >
                                                                    View medical
                                                                </button>
                                                                <button
                                                                    onClick={() => fetchIntakeRecords(animal.A_ANIMALID, animal.A_NAME)}
                                                                    className="text-xs font-semibold px-3 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                                                >
                                                                    View intake
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}

                        {animalsViewMode === 'medical' && (
                            <>
                                <div className="flex justify-between items-center mb-6">
                                    <h1 className="text-3xl font-bold text-gray-800">
                                        Medical records for {selectedAnimalName ?? `Animal #${selectedAnimalId}`}
                                    </h1>
                                    <button
                                        onClick={() => {
                                            setAnimalsViewMode('list');
                                            setMedicalFilter('');
                                        }}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                                    >
                                        ← Back to animals list
                                    </button>
                                </div>

                                <div className="flex justify-end mb-4">
                                    <input
                                        type="text"
                                        value={medicalFilter}
                                        onChange={(e) => setMedicalFilter(e.target.value)}
                                        placeholder="Filter by treatment..."
                                        className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {isLoadingMedical && (
                                    <div className="text-center py-12">
                                        <div className="text-gray-500">Loading medical records...</div>
                                    </div>
                                )}

                                {medicalError && (
                                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                        {medicalError}
                                    </div>
                                )}

                                {!isLoadingMedical && !medicalError && medicalRecords.length === 0 && (
                                    <div className="text-center py-12">
                                        <div className="text-gray-500">No medical records found for this animal.</div>
                                    </div>
                                )}

                                {!isLoadingMedical && !medicalError && medicalRecords.length > 0 && (
                                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Date
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Treatment
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {medicalRecords
                                                    .filter(record =>
                                                        !medicalFilter ||
                                                        record.MR_TREATMENTTYPE.toLowerCase().includes(medicalFilter.toLowerCase())
                                                    )
                                                    .map((record) => (
                                                        <tr key={record.MR_RECORDID}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                {new Date(record.MR_TREATMENTDATE).toLocaleDateString('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                })}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-700">
                                                                {record.MR_TREATMENTTYPE}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}

                        {animalsViewMode === 'intake' && (
                            <>
                                <div className="flex justify-between items-center mb-6">
                                    <h1 className="text-3xl font-bold text-gray-800">
                                        Intake records for {selectedAnimalName ?? `Animal #${selectedAnimalId}`}
                                    </h1>
                                    <button
                                        onClick={() => {
                                            setAnimalsViewMode('list');
                                            setIntakeFilter('');
                                        }}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                                    >
                                        ← Back to animals list
                                    </button>
                                </div>

                                <div className="flex justify-end mb-4">
                                    <input
                                        type="text"
                                        value={intakeFilter}
                                        onChange={(e) => setIntakeFilter(e.target.value)}
                                        placeholder="Filter by type or condition..."
                                        className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {isLoadingIntake && (
                                    <div className="text-center py-12">
                                        <div className="text-gray-500">Loading intake records...</div>
                                    </div>
                                )}

                                {intakeError && (
                                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                        {intakeError}
                                    </div>
                                )}

                                {!isLoadingIntake && !intakeError && intakeRecords.length === 0 && (
                                    <div className="text-center py-12">
                                        <div className="text-gray-500">No intake records found for this animal.</div>
                                    </div>
                                )}

                                {!isLoadingIntake && !intakeError && intakeRecords.length > 0 && (
                                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Intake Date
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Intake Type
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Condition
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {intakeRecords
                                                    .filter(record =>
                                                        !intakeFilter ||
                                                        record.IR_INTAKETYPE.toLowerCase().includes(intakeFilter.toLowerCase()) ||
                                                        record.IR_CONDITION.toLowerCase().includes(intakeFilter.toLowerCase())
                                                    )
                                                    .map((record) => (
                                                        <tr key={record.IR_INTAKEID}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                {new Date(record.IR_INTAKEDATE).toLocaleDateString('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                })}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-700">
                                                                {record.IR_INTAKETYPE}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-700">
                                                                {record.IR_CONDITION}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffDashboard;
