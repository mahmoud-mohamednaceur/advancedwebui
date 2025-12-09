import React from 'react';
import {
  Network,
  LayoutDashboard,
  Book,
  Settings,
  ChevronDown,
  LogOut,
  ArrowLeft,
  FileText,
  PlayCircle,
  BarChart2,
  Search,
  MessageSquare,
  Command
} from 'lucide-react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { isAdmin, hasPagePermission } from '../utils/admin';

export type GlobalPage = 'dashboard' | 'notebooks' | 'settings';
export type WorkspacePage = 'home' | 'chat' | 'documents' | 'chart' | 'search' | 'settings';

interface SidebarProps {
  mode: 'global' | 'workspace';
  activePage: string;
  onNavigate: (page: any) => void;
  onBackToGlobal?: () => void;
  notebookName?: string;
  notebookId?: string;
}

const SidebarItem = ({
  icon: Icon,
  label,
  active = false,
  onClick,
  hasSubmenu = false,
  indent = false
}: {
  icon: any,
  label: string,
  active?: boolean,
  onClick?: () => void,
  hasSubmenu?: boolean,
  indent?: boolean
}) => (
  <div
    onClick={onClick}
    className={`group relative flex items-center justify-between px-3 py-2.5 mx-2 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden ${active ? 'bg-white/5 text-white' : 'text-text-subtle hover:text-white hover:bg-white/5'} ${indent ? 'ml-4 border-l border-white/5 rounded-l-none border-y-0 border-r-0' : ''}`}
  >
    {/* Active Indicator Pill */}
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary shadow-[0_0_10px_#7EF9FF]"></div>}

    <div className="flex items-center gap-3 z-10 pl-2">
      <Icon className={`w-4 h-4 transition-colors ${active ? 'text-primary' : 'text-text-subtle group-hover:text-white'}`} />
      <span className={`text-sm font-medium tracking-wide ${active ? 'text-white' : ''}`}>{label}</span>
    </div>
    {hasSubmenu && <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100" />}
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ mode, activePage, onNavigate, onBackToGlobal, notebookName, notebookId }) => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const isUserAdmin = isAdmin(user);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <aside className="w-64 h-screen bg-[#050508]/80 backdrop-blur-xl border-r border-white/5 flex flex-col shrink-0 sticky top-0 z-30">
      {/* Header / Logo */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.location.reload()}>
          <div className="relative flex items-center justify-center w-8 h-8">
            <div className="absolute inset-0 bg-primary/20 rounded-xl rotate-6 group-hover:rotate-12 transition-transform"></div>
            <div className="absolute inset-0 bg-secondary/20 rounded-xl -rotate-3 group-hover:-rotate-6 transition-transform"></div>
            <Network className="w-5 h-5 text-primary relative z-10" />
          </div>
          <span className="text-lg font-display font-bold text-white tracking-tight">RAG Flow</span>
        </div>
      </div>

      {/* Context Header (Workspace Mode) */}
      {mode === 'workspace' && (
        <div className="px-4 py-4 mx-2 mt-2 mb-2 bg-surface-highlight/50 rounded-xl border border-white/5">
          <button
            onClick={onBackToGlobal}
            className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-text-subtle hover:text-primary transition-colors mb-3 pl-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Hub
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              <Book className="w-4 h-4" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] text-text-subtle font-mono">Notebook</span>
              <span className="text-sm font-bold text-white truncate leading-tight" title={notebookName}>{notebookName || 'Untitled'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Namespace Selector (Global Mode Only) */}
      {mode === 'global' && (
        <div className="px-4 py-4">
          <button className="w-full bg-surface-highlight/50 hover:bg-surface-highlight border border-white/5 hover:border-white/10 text-white rounded-xl p-2 flex items-center justify-between transition-all duration-200 group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-black flex items-center justify-center border border-white/10 group-hover:border-white/20">
                <Command className="w-4 h-4 text-text-subtle group-hover:text-white" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-bold text-text-subtle group-hover:text-white transition-colors uppercase tracking-wider">Workspace</span>
                <span className="text-sm font-bold leading-none text-white">Default</span>
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-text-subtle" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 px-2 flex flex-col gap-1 mt-2">

        {mode === 'global' ? (
          <>
            <div className="text-[10px] font-bold text-text-subtle/50 uppercase tracking-widest mb-2 px-4 mt-2">Platform</div>
            <SidebarItem
              icon={LayoutDashboard}
              label="Dashboard"
              active={activePage === 'dashboard'}
              onClick={() => onNavigate('dashboard')}
            />
            <SidebarItem
              icon={Book}
              label="Notebooks"
              active={activePage === 'notebooks'}
              onClick={() => onNavigate('notebooks')}
            />
            {hasPagePermission(user, 'settings') && (
              <>
                <div className="text-[10px] font-bold text-text-subtle/50 uppercase tracking-widest mb-2 px-4 mt-6">Admin</div>
                <SidebarItem
                  icon={Settings}
                  label="User Management"
                  active={activePage === 'settings'}
                  onClick={() => onNavigate('settings')}
                />
              </>
            )}
          </>
        ) : (
          <>
            <div className="text-[10px] font-bold text-text-subtle/50 uppercase tracking-widest mb-2 px-4 mt-2">Menu</div>
            {hasPagePermission(user, 'home', notebookId) && (
              <SidebarItem
                icon={LayoutDashboard}
                label="Overview"
                active={activePage === 'home'}
                onClick={() => onNavigate('home')}
              />
            )}

            {hasPagePermission(user, 'chat', notebookId) && (
              <SidebarItem
                icon={MessageSquare}
                label="Chat"
                active={activePage === 'chat'}
                onClick={() => onNavigate('chat')}
              />
            )}

            {hasPagePermission(user, 'documents', notebookId) && (
              <SidebarItem
                icon={FileText}
                label="Documents"
                active={activePage === 'documents'}
                onClick={() => onNavigate('documents')}
              />
            )}

            {(hasPagePermission(user, 'search', notebookId) || hasPagePermission(user, 'chart', notebookId)) && (
              <div className="text-[10px] font-bold text-text-subtle/50 uppercase tracking-widest mb-2 px-4 mt-6">Playground</div>
            )}

            {hasPagePermission(user, 'search', notebookId) && (
              <SidebarItem
                icon={Search}
                label="Search"
                active={activePage === 'search'}
                onClick={() => onNavigate('search')}
              />
            )}
            {hasPagePermission(user, 'chart', notebookId) && (
              <SidebarItem
                icon={BarChart2}
                label="Chart"
                active={activePage === 'chart'}
                onClick={() => onNavigate('chart')}
              />
            )}

            <div className="text-[10px] font-bold text-text-subtle/50 uppercase tracking-widest mb-2 px-4 mt-6">Config</div>
            {hasPagePermission(user, 'settings', notebookId) && (
              <SidebarItem
                icon={Settings}
                label="Settings"
                active={activePage === 'settings'}
                onClick={() => onNavigate('settings')}
              />
            )}
          </>
        )}

      </div>

      {/* User / Footer */}
      <div className="p-4 border-t border-white/5 bg-[#050508]/50">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-subtle hover:bg-red-500/10 hover:text-red-400 transition-all group"
        >
          <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;