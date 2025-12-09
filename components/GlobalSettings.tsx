import React, { useState, useEffect } from 'react';
import { Users, Search, Shield, Edit2, Loader2, AlertCircle, RefreshCw, UserCog } from 'lucide-react';
import UserPermissionsModal from './UserPermissionsModal';

const GlobalSettings: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    const fetchUsers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            console.log('Fetching users from /api/users...');
            const response = await fetch('/api/users');

            if (response.ok) {
                const data = await response.json();
                console.log('Fetched users:', data.length || 0);
                setUsers(Array.isArray(data) ? data : []);
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                const errorMsg = errorData.details || errorData.error || 'Failed to fetch users';
                console.error("Failed to fetch users:", response.status, errorMsg);
                setError(`Failed to load users (${response.status}): ${errorMsg}`);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check if it's a network error (server not running)
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
                setError('Cannot connect to server. Please make sure the backend server is running (npm run server).');
            } else {
                setError(`Error loading users: ${errorMessage}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(user => {
        const searchLower = searchQuery.toLowerCase();
        const name = `${user.first_name} ${user.last_name}`.toLowerCase();
        const email = user.email_addresses[0]?.email_address.toLowerCase() || '';
        return name.includes(searchLower) || email.includes(searchLower);
    });

    return (
        <div className="h-full flex flex-col relative overflow-hidden">
            {/* WebM Video Background */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'brightness(0.2) blur(3px)' }}
            >
                <source src="/Whisk_eznyugozewolrjmj1sm1ctytimzzqtlyutny0sm.webm" type="video/webm" />
            </video>

            {/* Dark Overlay with Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/70 to-black/80"></div>

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col p-6 md:p-8 lg:p-10">

                {/* Header Card */}
                <div className="bg-[#0A0A0F]/50 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 md:p-7 mb-6 shadow-2xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
                                <UserCog className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">User Management</h1>
                                <p className="text-sm text-text-subtle">Manage user access and permissions across the platform</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium shadow-sm">
                            <Shield className="w-4 h-4" />
                            <span>Admin Area</span>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-subtle pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-text-subtle focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
                        />
                    </div>
                </div>

                {/* Users List Container */}
                <div className="flex-1 bg-[#0A0A0F]/50 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-0">

                    {/* List Header */}
                    <div className="p-6 border-b border-white/10 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-secondary" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">All Users</h3>
                                    <p className="text-xs text-text-subtle/70">
                                        {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Users List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                <p className="text-text-subtle font-medium">Loading users...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-5">
                                <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-lg">
                                    <AlertCircle className="w-10 h-10 text-red-500" />
                                </div>
                                <div className="text-center max-w-md">
                                    <h3 className="text-xl font-semibold text-white mb-3">Failed to Load Users</h3>
                                    <p className="text-text-subtle text-sm mb-5 leading-relaxed">{error}</p>
                                    <button
                                        onClick={fetchUsers}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all duration-200 font-medium shadow-sm hover:shadow-lg hover:shadow-primary/20"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Retry
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {filteredUsers.map(user => {
                                    const metadata = user.publicMetadata || user.public_metadata || {};
                                    const isAdmin = metadata?.role === 'admin';
                                    const notebookCount = metadata?.allowed_notebooks?.length || 0;
                                    const pageCount = metadata?.allowed_pages?.length || 0;

                                    return (
                                        <div
                                            key={user.id}
                                            className="group flex items-center justify-between p-4 md:p-5 rounded-xl bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all duration-200"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                {/* Avatar */}
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/25 to-secondary/25 flex items-center justify-center text-white font-bold text-base border border-white/10 flex-shrink-0 shadow-sm">
                                                    {user.first_name?.[0]}{user.last_name?.[0]}
                                                </div>

                                                {/* User Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-white font-semibold text-base truncate">
                                                            {user.first_name} {user.last_name}
                                                        </h3>
                                                        {isAdmin && (
                                                            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-accent/15 text-accent border border-accent/30 uppercase tracking-wide flex-shrink-0">
                                                                Admin
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-text-subtle truncate">
                                                        {user.email_addresses[0]?.email_address}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Permissions & Action */}
                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                {/* Permission Stats */}
                                                <div className="hidden sm:flex items-center gap-2">
                                                    <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                                                        {notebookCount} Notebook{notebookCount !== 1 ? 's' : ''}
                                                    </div>
                                                    <div className="px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-xs font-medium">
                                                        {pageCount} Page{pageCount !== 1 ? 's' : ''}
                                                    </div>
                                                </div>

                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => setSelectedUser(user)}
                                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-text-subtle hover:text-white transition-all duration-200 border border-white/10 hover:border-primary/30 group-hover:shadow-sm"
                                                    title="Edit Permissions"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {filteredUsers.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <Users className="w-16 h-16 text-text-subtle/30 mb-4" />
                                        <h3 className="text-lg font-semibold text-white mb-2">No users found</h3>
                                        <p className="text-text-subtle/60">Try adjusting your search criteria</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {selectedUser && (
                <UserPermissionsModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onSave={() => {
                        fetchUsers(); // Refresh list to show updated counts
                    }}
                />
            )}
        </div>
    );
};

export default GlobalSettings;
