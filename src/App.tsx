import React, { useState, useEffect } from 'react';
import { 
  loadAppData, saveAppData, calculateHouseLedger, AppState, setDeviceName 
} from './lib/storage';
import { 
  House, Product, DeliveryRecord, PaymentRecord, VendorProfile 
} from './types';
import { Header } from './components/Header';
import { TodayDeliveryRun } from './components/TodayDeliveryRun';
import { HouseDirectory } from './components/HouseDirectory';
import { HouseLedgerModal } from './components/HouseLedgerModal';
import { BillingAndPayments } from './components/BillingAndPayments';
import { BackupAndSync } from './components/BackupAndSync';
import { ProductRateCard } from './components/ProductRateCard';
import { AnalyticsAndStock } from './components/AnalyticsAndStock';
import { format } from 'date-fns';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppData());
  const [activeTab, setActiveTab] = useState<string>('today');
  const [selectedDate, setSelectedDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modals state
  const [activeLedgerHouseId, setActiveLedgerHouseId] = useState<string | null>(null);
  const [quickPayHouseId, setQuickPayHouseId] = useState<string | null>(null);

  // Check if backed up today
  const isBackedUpToday = appState.backupLogs.some(
    log => log.timestamp.startsWith(format(new Date(), 'yyyy-MM-dd'))
  );

  // Auto save on state updates
  const updateState = (updater: (prev: AppState) => AppState) => {
    setAppState((prev) => {
      const updated = updater(prev);
      saveAppData(updated, true);
      return updated;
    });
  };

  // Device Name update
  const handleDeviceNameChange = (newName: string) => {
    setDeviceName(newName);
    updateState(prev => ({
      ...prev,
      deviceName: newName,
    }));
  };

  // Delivery Record update
  const handleUpdateDelivery = (newRecord: DeliveryRecord) => {
    updateState(prev => {
      const existingIdx = prev.deliveryRecords.findIndex(d => d.id === newRecord.id);
      let updatedDelivs = [...prev.deliveryRecords];
      if (existingIdx >= 0) {
        updatedDelivs[existingIdx] = newRecord;
      } else {
        updatedDelivs.push(newRecord);
      }
      return {
        ...prev,
        deliveryRecords: updatedDelivs,
      };
    });
  };

  // Add Payment
  const handleAddPayment = (newPayment: PaymentRecord) => {
    updateState(prev => ({
      ...prev,
      paymentRecords: [newPayment, ...prev.paymentRecords],
    }));
  };

  // Save / Edit House
  const handleSaveHouse = (house: House) => {
    updateState(prev => {
      const idx = prev.houses.findIndex(h => h.id === house.id);
      let updated = [...prev.houses];
      if (idx >= 0) {
        updated[idx] = house;
      } else {
        updated.push(house);
      }
      return {
        ...prev,
        houses: updated,
      };
    });
  };

  // Save Product
  const handleSaveProduct = (product: Product) => {
    updateState(prev => {
      const idx = prev.products.findIndex(p => p.id === product.id);
      let updated = [...prev.products];
      if (idx >= 0) {
        updated[idx] = product;
      } else {
        updated.push(product);
      }
      return {
        ...prev,
        products: updated,
      };
    });
  };

  // Delete Product
  const handleDeleteProduct = (productId: string) => {
    updateState(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== productId),
    }));
  };

  // Restore State from backup
  const handleRestoreState = (newState: AppState) => {
    setAppState(newState);
    saveAppData(newState, false);
  };

  const activeHouseForLedger = appState.houses.find(h => h.id === activeLedgerHouseId);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Header & Navigation Bar */}
      <Header
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        vendorProfile={appState.vendorProfile}
        deviceName={appState.deviceName}
        onDeviceNameChange={handleDeviceNameChange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isBackedUpToday={isBackedUpToday}
        onSyncClick={() => setActiveTab('backup')}
      />

      {/* Main View Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 pt-4">
        {activeTab === 'today' && (
          <TodayDeliveryRun
            selectedDate={selectedDate}
            houses={appState.houses}
            products={appState.products}
            deliveryRecords={appState.deliveryRecords}
            searchQuery={searchQuery}
            deviceName={appState.deviceName}
            onUpdateDelivery={handleUpdateDelivery}
            onOpenHouseLedger={(houseId) => setActiveLedgerHouseId(houseId)}
          />
        )}

        {activeTab === 'houses' && (
          <HouseDirectory
            houses={appState.houses}
            products={appState.products}
            calculateLedger={(houseId) => calculateHouseLedger(houseId, appState)}
            searchQuery={searchQuery}
            onOpenLedgerModal={(houseId) => setActiveLedgerHouseId(houseId)}
            onOpenPaymentModal={(houseId) => setActiveLedgerHouseId(houseId)}
            onSaveHouse={handleSaveHouse}
          />
        )}

        {activeTab === 'billing' && (
          <BillingAndPayments
            houses={appState.houses}
            calculateLedger={(houseId) => calculateHouseLedger(houseId, appState)}
            vendorProfile={appState.vendorProfile}
            deviceName={appState.deviceName}
            onAddPayment={handleAddPayment}
            onOpenLedgerModal={(houseId) => setActiveLedgerHouseId(houseId)}
          />
        )}

        {activeTab === 'backup' && (
          <BackupAndSync
            appState={appState}
            onRestoreState={handleRestoreState}
            onUpdateDeviceName={handleDeviceNameChange}
            onUpdateVendorProfile={(profile) => updateState(prev => ({ ...prev, vendorProfile: profile }))}
          />
        )}

        {activeTab === 'ratecard' && (
          <ProductRateCard
            products={appState.products}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsAndStock
            selectedDate={selectedDate}
            houses={appState.houses}
            products={appState.products}
            deliveryRecords={appState.deliveryRecords}
            paymentRecords={appState.paymentRecords}
            onUpdateDelivery={handleUpdateDelivery}
            onAddPayment={handleAddPayment}
          />
        )}
      </main>

      {/* House Ledger Statement Modal */}
      {activeHouseForLedger && (
        <HouseLedgerModal
          house={activeHouseForLedger}
          products={appState.products}
          deliveryRecords={appState.deliveryRecords}
          paymentRecords={appState.paymentRecords}
          vendorProfile={appState.vendorProfile}
          ledgerSummary={calculateHouseLedger(activeHouseForLedger.id, appState)}
          deviceName={appState.deviceName}
          onClose={() => setActiveLedgerHouseId(null)}
          onAddPayment={(payment) => {
            handleAddPayment(payment);
          }}
        />
      )}
    </div>
  );
}
