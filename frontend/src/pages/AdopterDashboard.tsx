import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Animal, AdoptionRequest, AdoptionRequestStatus } from '../types/api';

type TabType = 'animals' | 'requests';

const AdopterDashboard = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('animals');

    // Browse Animals state
    const [animals, setAnimals] = useState<Animal[]>([]);
    const [isLoadingAnimals, setIsLoadingAnimals] = useState(false);
    const [animalsError, setAnimalsError] = useState<string | null>(null);
    const [nameFilter, setNameFilter] = useState('');
    const [speciesFilter, setSpeciesFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('Adoptable');
    const [requestingIds, setRequestingIds] = useState<Set<number>>(new Set());
    const [animalErrors, setAnimalErrors] = useState<Map<number, string>>(new Map());
    const [animalSuccess, setAnimalSuccess] = useState<Map<number, string>>(new Map());

    // My Requests state
    const [requests, setRequests] = useState<AdoptionRequest[]>([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);
    const [requestsError, setRequestsError] = useState<string | null>(null);
    const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

    // Fetch animals with filters
    const fetchAnimals = async () => {
        setIsLoadingAnimals(true);
        setAnimalsError(null);
        setAnimalErrors(new Map());
        setAnimalSuccess(new Map());

        try {
            const params = new URLSearchParams();
            if (nameFilter.trim()) params.append('name_contains', nameFilter.trim());
            if (speciesFilter.trim()) params.append('species', speciesFilter.trim());
            if (statusFilter) params.append('status', statusFilter);

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

    // Fetch user's adoption requests
    const fetchRequests = async () => {
        if (!currentUser) return;

        setIsLoadingRequests(true);
        setRequestsError(null);

        try {
            const response = await fetch(`http://localhost:8000/adoption-requests/user/${currentUser.U_USERID}`);
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

    // Auto-load animals when Browse Animals tab is active
    useEffect(() => {
        if (activeTab === 'animals') {
            fetchAnimals();
        }
    }, [activeTab]);

    // Auto-load requests when My Requests tab is active
    useEffect(() => {
        if (activeTab === 'requests') {
            fetchRequests();
        }
    }, [activeTab]);

    // Handle adoption request submission
    const handleRequestAdoption = async (animalId: number) => {
        if (!currentUser) return;

        setRequestingIds(prev => new Set(prev).add(animalId));
        setAnimalErrors(prev => {
            const newMap = new Map(prev);
            newMap.delete(animalId);
            return newMap;
        });
        setAnimalSuccess(prev => {
            const newMap = new Map(prev);
            newMap.delete(animalId);
            return newMap;
        });

        try {
            const response = await fetch('http://localhost:8000/adoption-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    AR_USERID: currentUser.U_USERID,
                    AR_ANIMALID: animalId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to submit adoption request');
            }

            setAnimalSuccess(prev => {
                const newMap = new Map(prev);
                newMap.set(animalId, 'Adoption request submitted successfully!');
                return newMap;
            });

            // Clear success message after 3 seconds
            setTimeout(() => {
                setAnimalSuccess(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(animalId);
                    return newMap;
                });
            }, 3000);
        } catch (err) {
            setAnimalErrors(prev => {
                const newMap = new Map(prev);
                newMap.set(animalId, err instanceof Error ? err.message : 'An error occurred');
                return newMap;
            });
        } finally {
            setRequestingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(animalId);
                return newSet;
            });
        }
    };

    // Handle cancel adoption request
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

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Left Sidebar */}
            <div className="w-56 bg-white shadow-sm border-r border-gray-100">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase">Adopter Dashboard</h2>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{currentUser?.U_NAME}</p>
                </div>

                <nav className="mt-2">
                    <button
                        onClick={() => setActiveTab('animals')}
                        className={`w-full text-left px-4 py-3 transition-colors ${activeTab === 'animals'
                            ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-500'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Browse Animals
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`w-full text-left px-4 py-3 transition-colors ${activeTab === 'requests'
                            ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-500'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        My Requests
                    </button>
                </nav>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 p-6">
                {activeTab === 'animals' && (
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-6">Browse Animals</h1>

                        {/* Filter Bar */}
                        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name Contains
                                    </label>
                                    <input
                                        type="text"
                                        value={nameFilter}
                                        onChange={(e) => setNameFilter(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Search by name..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Species
                                    </label>
                                    <input
                                        type="text"
                                        value={speciesFilter}
                                        onChange={(e) => setSpeciesFilter(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Dog, Cat..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Status
                                    </label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
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

                        {/* Animals Grid */}
                        {isLoadingAnimals ? (
                            <div className="text-center py-12">
                                <div className="text-gray-500">Loading animals...</div>
                            </div>
                        ) : animals.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-gray-500">No animals found matching your filters.</div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {animals.map((animal) => (
                                    <div key={animal.A_ANIMALID} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                        {/* Photo placeholder */}
                                        <div className="h-32 w-full rounded-lg bg-gray-100 mb-3 flex items-center justify-center text-gray-400 text-xs">
                                            Photo
                                        </div>

                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{animal.A_NAME}</h3>

                                        <div className="space-y-1 mb-3">
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Species:</span> {animal.A_SPECIES}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Breed:</span> {animal.A_BREED || 'Unknown'}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Intake Date:</span> {formatDate(animal.A_INTAKEDATE)}
                                            </p>
                                        </div>

                                        <div className="mb-3">
                                            <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-1 rounded">
                                                {animal.A_STATUS}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleRequestAdoption(animal.A_ANIMALID)}
                                            disabled={requestingIds.has(animal.A_ANIMALID)}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {requestingIds.has(animal.A_ANIMALID) ? 'Submitting...' : 'Request Adoption'}
                                        </button>

                                        {/* Error message for this animal */}
                                        {animalErrors.has(animal.A_ANIMALID) && (
                                            <div className="mt-2 text-sm text-red-600">
                                                {animalErrors.get(animal.A_ANIMALID)}
                                            </div>
                                        )}

                                        {/* Success message for this animal */}
                                        {animalSuccess.has(animal.A_ANIMALID) && (
                                            <div className="mt-2 text-sm text-green-600">
                                                {animalSuccess.get(animal.A_ANIMALID)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-6">My Adoption Requests</h1>

                        {/* Error Display */}
                        {requestsError && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                {requestsError}
                            </div>
                        )}

                        {/* Requests Table */}
                        {isLoadingRequests ? (
                            <div className="text-center py-12">
                                <div className="text-gray-500">Loading your requests...</div>
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-gray-500">You haven't submitted any adoption requests yet.</div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
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
                                        {requests.map((request) => {
                                            const requestKey = `${request.AR_USERID}-${request.AR_ANIMALID}`;
                                            const isProcessing = processingRequests.has(requestKey);

                                            return (
                                                <tr key={requestKey}>
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
                                                        {(request.AR_STATUS === 'Submitted' || request.AR_STATUS === 'Under Review') && (
                                                            <button
                                                                onClick={() => handleCancelRequest(request.AR_USERID, request.AR_ANIMALID)}
                                                                disabled={isProcessing}
                                                                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-1 px-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {isProcessing ? 'Processing...' : 'Cancel'}
                                                            </button>
                                                        )}

                                                        {request.AR_STATUS === 'Approved' && (
                                                            <span className="text-gray-400 italic">No actions</span>
                                                        )}
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
            </div>
        </div>
    );
};

export default AdopterDashboard;
