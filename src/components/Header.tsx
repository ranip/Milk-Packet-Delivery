import React from 'react';
import { Milk, Calendar, RefreshCw, Smartphone, Search, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { VendorProfile } from '../types';

interface HeaderProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (newDate: string) => void;
  vendorProfile: VendorProfile;
  deviceName: string;
  onDeviceNameChange: (name: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isBackedUpToday: boolean;
  onSyncClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedDate,
  onDateChange,
  vendorProfile,
  deviceName,
  onDeviceNameChange,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  isBackedUpToday,
  onSyncClick,
}) => {
  const currentDateObj = new Date(selectedDate);

  const handlePrevDay = () => {
    onDateChange(format(subDays(currentDateObj, 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    onDateChange(format(addDays(currentDateObj, 1), 'yyyy-MM-dd'));
  };

  const handleTodayClick = () => {
    onDateChange(format(new Date(), 'yyyy-MM-dd'));
  };

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
            <Milk className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">{vendorProfile.businessName}</h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                50 Houses Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Vendor: {vendorProfile.vendorName} • {vendorProfile.phone}
            </p>
          </div>
        </div>

        {/* Device Mode & Backup Status */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Device Profile Switcher */}
          <div className="flex items-center bg-slate-900 border border-emerald-500/40 rounded-xl px-2 py-1 text-xs shadow-inner">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400 mr-1.5 shrink-0" />
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400 mr-1.5 hidden xs:inline">
              Device:
            </span>
            <select
              value={deviceName}
              onChange={(e) => onDeviceNameChange(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="Husband's Phone (Primary)" className="bg-slate-900 text-white font-semibold">
                📱 Primary: {vendorProfile.husbandPhoneName}
              </option>
              <option value="Wife's Phone (Secondary)" className="bg-slate-900 text-white font-semibold">
                📱 Secondary: {vendorProfile.wifePhoneName}
              </option>
            </select>
          </div>

          {/* Backup Indicator Badge */}
          <button
            onClick={onSyncClick}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
              isBackedUpToday
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/60'
                : 'bg-amber-950/70 text-amber-300 border-amber-600/50 animate-pulse hover:bg-amber-900/80'
            }`}
            title="Click to manage daily backup & dual-phone sync"
          >
            {isBackedUpToday ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Backup Saved</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Backup Today!</span>
              </>
            )}
            <RefreshCw className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Control Bar: Date Navigator & Global Search */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border-b border-slate-800">
        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1 text-sm font-semibold text-slate-100">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>{format(currentDateObj, 'EEE, dd MMM yyyy')}</span>
          </div>

          <button
            onClick={handleNextDay}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={handleTodayClick}
              className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-lg hover:bg-emerald-500/30 transition"
            >
              Go to Today
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search House # (e.g. A-101) or Name..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <nav className="max-w-7xl mx-auto px-2 flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'today', label: '🛵 Today Run', badge: '50' },
          { id: 'houses', label: '🏠 Houses Ledger', badge: '' },
          { id: 'billing', label: '💰 Billing & Dues', badge: 'Dues' },
          { id: 'backup', label: '🔄 Phone Sync & Backup', badge: isBackedUpToday ? 'OK' : '⚠️' },
          { id: 'ratecard', label: '📦 Rates & Products', badge: '' },
          { id: 'analytics', label: '📊 Stock & AI Log', badge: 'AI' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 font-bold rounded-full ${
                    isActive
                      ? 'bg-slate-950 text-emerald-400'
                      : tab.badge === '⚠️'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
