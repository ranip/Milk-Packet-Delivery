import React, { useState, useRef } from 'react';
import { AppState, exportBackupJSON, exportBackupCSV, parseBackupJSON, syncToServerBackup, fetchServerBackup, resetToSampleData } from '../lib/storage';
import { VendorProfile, BackupLog, BackupDataPayload } from '../types';
import { 
  Smartphone, Download, Upload, Share2, RefreshCw, CheckCircle2, 
  AlertTriangle, FileText, Database, HardDrive, ShieldCheck, Copy, Check, Users, RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';

interface BackupAndSyncProps {
  appState: AppState;
  onRestoreState: (newState: AppState) => void;
  onUpdateDeviceName: (name: string) => void;
  onUpdateVendorProfile: (profile: VendorProfile) => void;
}

export const BackupAndSync: React.FC<BackupAndSyncProps> = ({
  appState,
  onRestoreState,
  onUpdateDeviceName,
  onUpdateVendorProfile,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [importedDataPreview, setImportedDataPreview] = useState<BackupDataPayload | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTodayBackedUp = appState.backupLogs.some(
    log => log.timestamp.startsWith(format(new Date(), 'yyyy-MM-dd'))
  );

  // Download JSON
  const handleDownloadJSON = () => {
    exportBackupJSON(appState);
    setSyncStatusMsg('Backup file successfully saved to phone storage!');
  };

  // Download CSV
  const handleDownloadCSV = () => {
    exportBackupCSV(appState);
  };

  // Handle Share Backup File
  const handleShareBackup = async () => {
    const timestamp = format(new Date(), 'yyyy-MM-dd');
    const jsonStr = JSON.stringify(appState, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const file = new File([blob], `MilkBoy_Backup_${timestamp}.json`, { type: 'application/json' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'MilkBoy Daily Transaction Backup',
          text: `Daily Milk Delivery & Billing backup for ${timestamp} from ${appState.deviceName}.`,
          files: [file],
        });
        setSyncStatusMsg('Shared backup file successfully!');
      } catch (err) {
        console.log('Share dismissed', err);
      }
    } else {
      // Fallback: Download and copy instructions
      exportBackupJSON(appState);
      alert('Downloaded backup file. You can now attach this JSON file in WhatsApp/Drive to share with spouse.');
    }
  };

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseBackupJSON(text);
        setImportedDataPreview(parsed);
      } catch (err: any) {
        alert(`Error reading backup file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Confirm Restore/Import
  const handleConfirmRestore = (merge: boolean) => {
    if (!importedDataPreview) return;

    if (merge) {
      // Merge records
      const existingHouseIds = new Set(appState.houses.map(h => h.id));
      const newHouses = [...appState.houses];
      importedDataPreview.houses.forEach(h => {
        if (!existingHouseIds.has(h.id)) newHouses.push(h);
      });

      const existingDelivIds = new Set(appState.deliveryRecords.map(d => d.id));
      const newDelivs = [...appState.deliveryRecords];
      importedDataPreview.deliveryRecords.forEach(d => {
        if (!existingDelivIds.has(d.id)) newDelivs.push(d);
      });

      const existingPayIds = new Set(appState.paymentRecords.map(p => p.id));
      const newPays = [...appState.paymentRecords];
      importedDataPreview.paymentRecords.forEach(p => {
        if (!existingPayIds.has(p.id)) newPays.push(p);
      });

      const newLog: BackupLog = {
        id: `log-import-${Date.now()}`,
        timestamp: new Date().toISOString(),
        deviceName: appState.deviceName,
        type: 'manual_import',
        recordsCount: {
          houses: newHouses.length,
          deliveries: newDelivs.length,
          payments: newPays.length,
        },
      };

      const updatedState: AppState = {
        ...appState,
        houses: newHouses,
        deliveryRecords: newDelivs,
        paymentRecords: newPays,
        backupLogs: [newLog, ...appState.backupLogs],
      };

      onRestoreState(updatedState);
      alert('Merged backup data successfully into phone storage!');
    } else {
      // Overwrite completely
      const newLog: BackupLog = {
        id: `log-restore-${Date.now()}`,
        timestamp: new Date().toISOString(),
        deviceName: appState.deviceName,
        type: 'manual_import',
        recordsCount: {
          houses: importedDataPreview.houses.length,
          deliveries: importedDataPreview.deliveryRecords.length,
          payments: importedDataPreview.paymentRecords.length,
        },
      };

      const updatedState: AppState = {
        vendorProfile: importedDataPreview.vendorProfile || appState.vendorProfile,
        products: importedDataPreview.products || appState.products,
        houses: importedDataPreview.houses,
        deliveryRecords: importedDataPreview.deliveryRecords,
        paymentRecords: importedDataPreview.paymentRecords || [],
        backupLogs: [newLog, ...appState.backupLogs],
        deviceName: appState.deviceName,
      };

      onRestoreState(updatedState);
      alert('Overwrote local phone storage with backup snapshot!');
    }

    setImportedDataPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Cloud Mirror Sync
  const handleCloudMirrorSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Pushing local phone database to server mirror...');

    const success = await syncToServerBackup(appState);
    if (success) {
      setSyncStatusMsg('Server cloud mirror synced successfully!');
    } else {
      setSyncStatusMsg('Cloud mirror endpoint busy or unreachable.');
    }
    setIsSyncing(false);
  };

  // Pull latest cloud mirror
  const handleFetchCloudMirror = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Fetching latest backup from cloud server...');

    const latest = await fetchServerBackup();
    if (latest) {
      setImportedDataPreview(latest);
      setSyncStatusMsg('Retrieved latest server backup snapshot!');
    } else {
      setSyncStatusMsg('No server backup snapshot found.');
    }
    setIsSyncing(false);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white border border-slate-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Dual-Phone Backup Engine
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-xl font-extrabold text-white mt-1">Dual Device Daily Storage Backup</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Keep transaction data identical on both phones (Primary & Secondary Device) with 1-click JSON backup export/import.
          </p>
        </div>

        {/* Current Status Badge */}
        <div className={`p-3 rounded-xl border flex items-center gap-3 ${
          isTodayBackedUp
            ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
            : 'bg-amber-950/80 border-amber-600/60 text-amber-300'
        }`}>
          {isTodayBackedUp ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
          )}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Today's Backup Status</span>
            <span className="text-xs font-bold">
              {isTodayBackedUp ? 'Saved to Storage Today' : 'Backup Pending Today!'}
            </span>
          </div>
        </div>
      </div>

      {syncStatusMsg && (
        <div className="p-3 bg-slate-900 text-emerald-400 text-xs font-bold rounded-xl border border-slate-800 flex items-center justify-between">
          <span>ℹ️ {syncStatusMsg}</span>
          <button onClick={() => setSyncStatusMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Device Config & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Phone Identity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <Smartphone className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-slate-900 text-base">Current Device Settings</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Phone Profile</label>
            <select
              value={appState.deviceName}
              onChange={e => onUpdateDeviceName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
            >
              <option value="Primary Phone">📱 Primary: {appState.vendorProfile.husbandPhoneName}</option>
              <option value="Secondary Phone">📱 Secondary: {appState.vendorProfile.wifePhoneName}</option>
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <p className="text-slate-700 font-medium">
              Active Phone: <strong className="text-slate-900">{appState.deviceName}</strong>
            </p>
            <p className="text-slate-500">
              Database contains: <strong className="text-slate-800">{appState.houses.length} Houses</strong>, <strong className="text-slate-800">{appState.deliveryRecords.length} Deliveries</strong>, <strong className="text-slate-800">{appState.paymentRecords.length} Payments</strong>
            </p>
          </div>

          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-slate-600 font-medium">Auto Daily Backup Enabled:</span>
            <input
              type="checkbox"
              checked={appState.vendorProfile.autoBackupDaily}
              onChange={e => onUpdateVendorProfile({
                ...appState.vendorProfile,
                autoBackupDaily: e.target.checked
              })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
          </div>
        </div>

        {/* Business & Vendor Profile Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <Users className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Current Device & Couple Settings</h3>
              <p className="text-xs text-slate-500">Edit business profile, primary & secondary phone labels and contact numbers</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Business Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-0.5">Dairy / Business Name</label>
                <input
                  type="text"
                  value={appState.vendorProfile.businessName}
                  onChange={e => onUpdateVendorProfile({ ...appState.vendorProfile, businessName: e.target.value })}
                  placeholder="e.g. Om Provisions"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-0.5">Primary Contact / Vendor Name</label>
                <input
                  type="text"
                  value={appState.vendorProfile.vendorName}
                  onChange={e => onUpdateVendorProfile({ ...appState.vendorProfile, vendorName: e.target.value })}
                  placeholder="e.g. Renuka & Mohan"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Primary & Secondary Device Specific Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Primary Device Card */}
              <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-extrabold text-blue-900 border-b border-blue-200/80 pb-1.5">
                  <span>📱 Primary Device Profile</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">Primary</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Primary Device Owner / Name</label>
                    <input
                      type="text"
                      value={appState.vendorProfile.husbandPhoneName || "K Mohan"}
                      onChange={e => onUpdateVendorProfile({
                        ...appState.vendorProfile,
                        husbandPhoneName: e.target.value
                      })}
                      placeholder="e.g. K Mohan"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Primary Phone Number</label>
                    <input
                      type="text"
                      value={appState.vendorProfile.husbandPhone || "+91 98765 43210"}
                      onChange={e => onUpdateVendorProfile({ ...appState.vendorProfile, husbandPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Device Card */}
              <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-extrabold text-rose-900 border-b border-rose-200/80 pb-1.5">
                  <span>📱 Secondary Device Profile</span>
                  <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">Secondary</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Secondary Device Owner / Name</label>
                    <input
                      type="text"
                      value={appState.vendorProfile.wifePhoneName || "K Renuka"}
                      onChange={e => onUpdateVendorProfile({
                        ...appState.vendorProfile,
                        wifePhoneName: e.target.value
                      })}
                      placeholder="e.g. K Renuka"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Secondary Phone Number</label>
                    <input
                      type="text"
                      value={appState.vendorProfile.wifePhone || "+91 98765 43211"}
                      onChange={e => onUpdateVendorProfile({ ...appState.vendorProfile, wifePhone: e.target.value })}
                      placeholder="+91 98765 43211"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* UPI ID & Monthly Delivery Charge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-0.5">UPI ID (For WhatsApp Bills)</label>
                <input
                  type="text"
                  value={appState.vendorProfile.upiId}
                  onChange={e => onUpdateVendorProfile({ ...appState.vendorProfile, upiId: e.target.value })}
                  placeholder="omprovisions@upi"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-0.5">Default Monthly Delivery Charge (₹/mo)</label>
                <input
                  type="number"
                  min="0"
                  value={appState.vendorProfile.defaultMonthlyDeliveryCharge || 0}
                  onChange={e => onUpdateVendorProfile({ ...appState.vendorProfile, defaultMonthlyDeliveryCharge: Number(e.target.value) })}
                  placeholder="0 (e.g. ₹50)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Primary Backup & Download Buttons */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3 md:col-span-2">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <HardDrive className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-slate-900 text-base">Save Backup to Phone Storage</h3>
          </div>

          <p className="text-xs text-slate-600">
            Click below to create an immediate backup file (`.json`) saved directly to your phone downloads folder.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={handleDownloadJSON}
              className="py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Save Backup (.json)</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className="py-3 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Export Ledger (.csv)</span>
            </button>
          </div>

          <button
            onClick={handleShareBackup}
            className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4 text-emerald-600" />
            <span>Share Backup File to Partner Phone (WhatsApp)</span>
          </button>
        </div>
      </div>

      {/* Import Backup & Cloud Sync */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Import / Restore Backup File */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <Upload className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-slate-900 text-base">Restore Data from Phone Backup File</h3>
          </div>

          <p className="text-xs text-slate-600">
            Received a backup JSON file from your partner's phone? Pick the JSON file to inspect and restore records onto this phone.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4 text-slate-700" />
            <span>Select Backup File (.json) from Phone</span>
          </button>
        </div>

        {/* Cloud Mirror Sync */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <Database className="w-5 h-5 text-teal-600" />
            <h3 className="font-extrabold text-slate-900 text-base">Cloud Mirror Auto-Sync</h3>
          </div>

          <p className="text-xs text-slate-600">
            Sync local database to server memory mirror so both phones can pull the latest backup when connected online.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCloudMirrorSync}
              disabled={isSyncing}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Push to Cloud</span>
            </button>

            <button
              onClick={handleFetchCloudMirror}
              disabled={isSyncing}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pull from Cloud</span>
            </button>
          </div>
        </div>

        {/* Reset / Clean Database Card */}
        <div className="bg-white rounded-2xl border border-rose-200 p-4 sm:p-5 shadow-sm space-y-3 md:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-rose-100">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-600" />
              <h3 className="font-extrabold text-slate-900 text-base">Reset to Single Sample Record</h3>
            </div>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Clean Start
            </span>
          </div>

          <p className="text-xs text-slate-600">
            Clear all extra test/dummy records and keep exactly <strong>1 sample house (A-101 Rajesh Sharma)</strong>, 1 sample delivery, and 1 sample payment record.
          </p>

          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to reset and keep only 1 sample dummy record? Any unbacked-up test records will be removed.')) {
                const freshState = resetToSampleData();
                onRestoreState(freshState);
                setSyncStatusMsg('Reset successful! Now showing exactly 1 sample dummy customer.');
              }
            }}
            className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Reset Database to 1 Sample Record</span>
          </button>
        </div>
      </div>

      {/* Backup Inspection Preview Modal */}
      {importedDataPreview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Inspect Backup File</h3>
              <button onClick={() => setImportedDataPreview(null)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <p className="text-slate-800 font-bold">
                  Exported By: <span className="text-emerald-700">{importedDataPreview.exportedBy || 'MilkBoy App'}</span>
                </p>
                <p className="text-slate-600">
                  Date: {importedDataPreview.exportedAt ? format(new Date(importedDataPreview.exportedAt), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                </p>
                <div className="pt-2 border-t border-slate-200 grid grid-cols-3 text-center gap-1 font-bold">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="block text-[10px] text-slate-500">Houses</span>
                    <span className="text-sm text-slate-900">{importedDataPreview.houses.length}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="block text-[10px] text-slate-500">Deliveries</span>
                    <span className="text-sm text-slate-900">{importedDataPreview.deliveryRecords.length}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="block text-[10px] text-slate-500">Payments</span>
                    <span className="text-sm text-slate-900">{importedDataPreview.paymentRecords.length}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleConfirmRestore(true)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  Merge into Current Phone Data (Recommended)
                </button>

                <button
                  onClick={() => handleConfirmRestore(false)}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  Overwrite Entire Phone Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Backup Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <h3 className="font-extrabold text-slate-900 text-base mb-3 pb-2 border-b border-slate-200">
          Historical Backup & Sync Activity Log
        </h3>

        {appState.backupLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">No backup activity logged yet.</p>
        ) : (
          <div className="space-y-2">
            {appState.backupLogs.map(log => (
              <div
                key={log.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 block">
                    {format(new Date(log.timestamp), 'dd MMM yyyy, hh:mm a')}
                  </span>
                  <span className="text-slate-500">
                    Device: {log.deviceName} • Mode: <strong className="uppercase text-slate-700">{log.type}</strong>
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-bold text-emerald-700">
                    {log.recordsCount.houses} Houses | {log.recordsCount.deliveries} Delivs
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
