import React, { useState } from 'react';
import {
    MessageSquarePlus, Pin, PinOff, Trash2, Pencil, Check, X,
    ChevronLeft, ChevronRight, MessageCircle, MoreHorizontal,
    Search, Archive, Clock, Loader2, Database
} from 'lucide-react';

// --- Types ---

export interface Conversation {
    conversation_id: string;
    title: string;
    is_pinned: boolean;
    is_archived: boolean;
    message_count: number;
    last_message_at: string | null;
    created_at: string;
    chat_mode: 'rag' | 'sql';  // Chat mode: RAG for documents, SQL for structured data
}

interface ConversationSidebarProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    isLoading: boolean;
    isCollapsed: boolean;
    onSelectConversation: (conversationId: string) => void;
    onCreateConversation: () => void;
    onDeleteConversation: (conversationId: string) => void;
    onRenameConversation: (conversationId: string, newTitle: string) => void;
    onTogglePin: (conversationId: string) => void;
    onToggleCollapse: () => void;
}

// --- Helper Functions ---

const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return 'No messages';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- Conversation Item Component ---

interface ConversationItemProps {
    conversation: Conversation;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onRename: (newTitle: string) => void;
    onTogglePin: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
    conversation,
    isActive,
    onSelect,
    onDelete,
    onRename,
    onTogglePin
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(conversation.title);
    const [showActions, setShowActions] = useState(false);

    const handleRename = () => {
        if (editTitle.trim() && editTitle !== conversation.title) {
            onRename(editTitle.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRename();
        } else if (e.key === 'Escape') {
            setEditTitle(conversation.title);
            setIsEditing(false);
        }
    };

    // Chat mode specific styling
    const isSql = conversation.chat_mode === 'sql';
    const modeStyles = isSql
        ? {
            gradient: 'from-violet-500/20 via-violet-500/5 to-transparent',
            border: 'border-violet-500/30',
            activeBg: 'bg-violet-500/10',
            activeShadow: 'shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)]',
            iconBg: 'bg-violet-500/20',
            iconColor: 'text-violet-400',
            badgeBg: 'bg-violet-500/20',
            badgeText: 'text-violet-300',
            badgeBorder: 'border-violet-500/30',
            accentColor: 'bg-violet-500',
        }
        : {
            gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
            border: 'border-emerald-500/30',
            activeBg: 'bg-emerald-500/10',
            activeShadow: 'shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]',
            iconBg: 'bg-emerald-500/20',
            iconColor: 'text-emerald-400',
            badgeBg: 'bg-emerald-500/20',
            badgeText: 'text-emerald-300',
            badgeBorder: 'border-emerald-500/30',
            accentColor: 'bg-emerald-500',
        };

    return (
        <div
            className={`group relative flex items-center gap-2.5 px-3 py-3 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden ${isActive
                ? `${modeStyles.activeBg} border ${modeStyles.border} ${modeStyles.activeShadow}`
                : 'hover:bg-white/5 border border-transparent hover:border-white/5'
                }`}
            onClick={!isEditing ? onSelect : undefined}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Left accent bar */}
            <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-all duration-300 ${isActive ? modeStyles.accentColor : 'bg-transparent group-hover:bg-white/20'
                }`} />

            {/* Background gradient on hover/active */}
            <div className={`absolute inset-0 bg-gradient-to-r ${modeStyles.gradient} transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                }`} />

            {/* Icon - Shows different icon based on chat mode */}
            <div className={`relative shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${isActive
                ? `${modeStyles.iconBg} ${modeStyles.iconColor} ring-1 ring-white/10`
                : 'bg-white/5 text-text-subtle group-hover:bg-white/10 group-hover:text-white'
                }`}>
                {isSql ? (
                    <Database className="w-4 h-4" />
                ) : (
                    <MessageCircle className="w-4 h-4" />
                )}
            </div>

            {/* Content */}
            <div className="relative flex-1 min-w-0">
                {isEditing ? (
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleRename}
                            autoFocus
                            className={`flex-1 bg-black/30 border rounded px-2 py-1 text-xs text-white focus:outline-none ${isSql ? 'border-violet-500/30 focus:border-violet-500/50' : 'border-emerald-500/30 focus:border-emerald-500/50'
                                }`}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRename(); }}
                            className={`p-1 hover:bg-white/10 rounded ${modeStyles.iconColor}`}
                        >
                            <Check className="w-3 h-3" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setEditTitle(conversation.title); setIsEditing(false); }}
                            className="p-1 hover:bg-white/10 rounded text-text-subtle"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-xs font-medium truncate max-w-[120px] ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                {conversation.title}
                            </span>
                            {conversation.is_pinned && (
                                <Pin className={`w-3 h-3 shrink-0 ${modeStyles.iconColor}`} />
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Chat mode badge */}
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${modeStyles.badgeBg} ${modeStyles.badgeText} ${modeStyles.badgeBorder}`}>
                                {isSql ? (
                                    <>
                                        <Database className="w-2.5 h-2.5" />
                                        SQL
                                    </>
                                ) : (
                                    <>
                                        <MessageCircle className="w-2.5 h-2.5" />
                                        RAG
                                    </>
                                )}
                            </span>
                            <span className="text-[10px] text-text-subtle/70">
                                {conversation.message_count} {conversation.message_count === 1 ? 'msg' : 'msgs'}
                            </span>
                            <span className="text-[10px] text-text-subtle/40">•</span>
                            <span className="text-[10px] text-text-subtle/60">
                                {formatRelativeTime(conversation.last_message_at)}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Actions (visible on hover) */}
            {
                !isEditing && showActions && (
                    <div className="absolute right-2 flex items-center gap-0.5 bg-surface/90 backdrop-blur-sm rounded-lg p-0.5 border border-white/10 shadow-lg animate-fade-in">
                        <button
                            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
                            className={`p-1.5 rounded hover:bg-white/10 transition-colors ${conversation.is_pinned ? 'text-primary' : 'text-text-subtle hover:text-white'
                                }`}
                            title={conversation.is_pinned ? 'Unpin' : 'Pin'}
                        >
                            {conversation.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditTitle(conversation.title); }}
                            className="p-1.5 rounded hover:bg-white/10 text-text-subtle hover:text-white transition-colors"
                            title="Rename"
                        >
                            <Pencil className="w-3 h-3" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-1.5 rounded hover:bg-red-500/20 text-text-subtle hover:text-red-400 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                )
            }
        </div >
    );
};

// --- Main Sidebar Component ---

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
    conversations,
    activeConversationId,
    isLoading,
    isCollapsed,
    onSelectConversation,
    onCreateConversation,
    onDeleteConversation,
    onRenameConversation,
    onTogglePin,
    onToggleCollapse
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Filter and sort conversations
    const filteredConversations = conversations
        .filter(c => !c.is_archived)
        .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

    // Separate pinned and unpinned
    const pinnedConversations = filteredConversations.filter(c => c.is_pinned);
    const unpinnedConversations = filteredConversations.filter(c => !c.is_pinned);

    const handleDelete = (conversationId: string) => {
        // Immediate delete without double-click confirmation
        onDeleteConversation(conversationId);
    };

    // Collapsed state
    if (isCollapsed) {
        return (
            <div className="w-14 h-full bg-[#0A0A0F] border-r border-white/5 flex flex-col items-center py-4 gap-3">
                <button
                    onClick={onToggleCollapse}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-text-subtle hover:text-white transition-all border border-white/5 hover:border-white/10"
                    title="Expand sidebar"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>

                <div className="h-px w-8 bg-white/10" />

                <button
                    onClick={onCreateConversation}
                    className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-all border border-primary/20 hover:border-primary/30"
                    title="New conversation"
                >
                    <MessageSquarePlus className="w-4 h-4" />
                </button>

                <div className="h-px w-8 bg-white/10" />

                {/* Mini conversation indicators */}
                <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar px-1">
                    {filteredConversations.slice(0, 10).map((conv) => {
                        const isSqlMode = conv.chat_mode === 'sql';
                        const isActiveConv = activeConversationId === conv.conversation_id;

                        return (
                            <button
                                key={conv.conversation_id}
                                onClick={() => onSelectConversation(conv.conversation_id)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isActiveConv
                                        ? isSqlMode
                                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-white/5 text-text-subtle hover:text-white hover:bg-white/10 border border-transparent'
                                    }`}
                                title={`${conv.title} (${isSqlMode ? 'SQL' : 'RAG'})`}
                            >
                                {isSqlMode ? (
                                    <Database className="w-3.5 h-3.5" />
                                ) : (
                                    <MessageCircle className="w-3.5 h-3.5" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="w-72 h-full bg-[#050508]/80 backdrop-blur-xl border-r border-white/5 flex flex-col animate-fade-in relative z-20">
            {/* Header */}
            <div className="p-4 pt-6 pb-2">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_10px_-3px_rgba(126,249,255,0.3)]">
                            <MessageCircle className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-bold text-white text-sm tracking-wide">Chats</span>
                    </div>
                    <button
                        onClick={onToggleCollapse}
                        className="p-2 rounded-lg hover:bg-white/5 text-text-subtle hover:text-white transition-all duration-200"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                </div>

                {/* New Conversation Button */}
                <button
                    onClick={onCreateConversation}
                    className="group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all duration-300 border border-white/5 hover:border-white/10 hover:shadow-[0_0_20px_-5px_rgba(126,249,255,0.1)] relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <MessageSquarePlus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform duration-300" />
                    <span className="relative">New Connection</span>
                </button>

                {/* Search */}
                {conversations.length > 0 && (
                    <div className="relative mt-4 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-subtle group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Find a conversation..."
                            className="w-full bg-[#0A0A0F] border border-white/5 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-text-subtle/70 focus:outline-none focus:border-primary/20 focus:bg-white/5 transition-all duration-300"
                        />
                    </div>
                )}
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-32 text-text-subtle">
                        <Loader2 className="w-5 h-5 animate-spin mb-3 text-primary/50" />
                        <span className="text-[10px] uppercase tracking-wider opacity-70">Loading History</span>
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-text-subtle text-center p-4 opacity-50">
                        <MessageCircle className="w-8 h-8 mb-3 opacity-20" />
                        <p className="text-xs font-medium">
                            {searchQuery ? 'No matches found' : 'Your history is empty'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Pinned Section */}
                        {pinnedConversations.length > 0 && (
                            <div className="space-y-1">
                                <div className="px-3 py-1 flex items-center gap-2">
                                    <Pin className="w-3 h-3 text-primary" />
                                    <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">Pinned</span>
                                </div>
                                {pinnedConversations.map((conv) => (
                                    <ConversationItem
                                        key={conv.conversation_id}
                                        conversation={conv}
                                        isActive={activeConversationId === conv.conversation_id}
                                        onSelect={() => onSelectConversation(conv.conversation_id)}
                                        onDelete={() => handleDelete(conv.conversation_id)}
                                        onRename={(newTitle) => onRenameConversation(conv.conversation_id, newTitle)}
                                        onTogglePin={() => onTogglePin(conv.conversation_id)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Recent Section */}
                        {unpinnedConversations.length > 0 && (
                            <div className="space-y-1">
                                {pinnedConversations.length > 0 && (
                                    <div className="px-3 py-1 mt-4 flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-text-subtle" />
                                        <span className="text-[10px] font-bold text-text-subtle/60 uppercase tracking-widest">Recent</span>
                                    </div>
                                )}
                                {unpinnedConversations.map((conv) => (
                                    <ConversationItem
                                        key={conv.conversation_id}
                                        conversation={conv}
                                        isActive={activeConversationId === conv.conversation_id}
                                        onSelect={() => onSelectConversation(conv.conversation_id)}
                                        onDelete={() => handleDelete(conv.conversation_id)}
                                        onRename={(newTitle) => onRenameConversation(conv.conversation_id, newTitle)}
                                        onTogglePin={() => onTogglePin(conv.conversation_id)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer Stats - Minimalist */}
            <div className="p-4 border-t border-white/5 bg-[#050508]/50 backdrop-blur-md">
                <div className="flex items-center justify-between text-[10px] text-text-subtle/60 font-mono">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span>{isLoading ? 'SYNCING' : 'ONLINE'}</span>
                    </div>
                    <span>{conversations.length} CHATS</span>
                </div>
            </div>
        </div>
    );
};

export default ConversationSidebar;
