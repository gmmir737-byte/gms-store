import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { DeliveryArea } from '../types/database';
import { fetchActiveDeliveryAreas, checkDeliveryServiceability } from '../lib/delivery';

interface DeliveryContextType {
  activeAreas: DeliveryArea[];
  selectedArea: DeliveryArea | null;
  loading: boolean;
  isCheckerModalOpen: boolean;
  setSelectedArea: (area: DeliveryArea | null) => void;
  openCheckerModal: () => void;
  closeCheckerModal: () => void;
  refreshAreas: () => Promise<void>;
  checkAreaAvailability: (
    areaName: string,
    city?: string,
    state?: string,
    pincode?: string,
    district?: string,
    tehsil?: string
  ) => Promise<{
    isAvailable: boolean;
    area: DeliveryArea | null;
    message: string;
  }>;
}

const DeliveryContext = createContext<DeliveryContextType | undefined>(undefined);

const SELECTED_AREA_STORAGE_KEY = 'azhar_store_selected_delivery_area';

export const DeliveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeAreas, setActiveAreas] = useState<DeliveryArea[]>([]);
  const [selectedArea, setSelectedAreaState] = useState<DeliveryArea | null>(() => {
    try {
      const saved = localStorage.getItem(SELECTED_AREA_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isCheckerModalOpen, setIsCheckerModalOpen] = useState<boolean>(false);

  const refreshAreas = useCallback(async () => {
    setLoading(true);
    try {
      const areas = await fetchActiveDeliveryAreas();
      setActiveAreas(areas);

      // If the previously saved selected area is now inactive or deleted, update it
      if (selectedArea) {
        const stillActive = areas.find(
          (a) => a.id === selectedArea.id || a.area_name.toLowerCase() === selectedArea.area_name.toLowerCase()
        );
        if (!stillActive) {
          // Area was disabled or deleted
          setSelectedAreaState(null);
          localStorage.removeItem(SELECTED_AREA_STORAGE_KEY);
        } else {
          // Update details (e.g. updated delivery charge or estimated time)
          setSelectedAreaState(stillActive);
          localStorage.setItem(SELECTED_AREA_STORAGE_KEY, JSON.stringify(stillActive));
        }
      }
    } catch (err) {
      console.error('Failed to load active delivery areas:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedArea]);

  useEffect(() => {
    refreshAreas();
  }, [refreshAreas]);

  const setSelectedArea = useCallback((area: DeliveryArea | null) => {
    setSelectedAreaState(area);
    try {
      if (area) {
        localStorage.setItem(SELECTED_AREA_STORAGE_KEY, JSON.stringify(area));
      } else {
        localStorage.removeItem(SELECTED_AREA_STORAGE_KEY);
      }
    } catch (err) {
      console.error('Error saving selected area to localStorage:', err);
    }
  }, []);

  const openCheckerModal = useCallback(() => {
    setIsCheckerModalOpen(true);
  }, []);

  const closeCheckerModal = useCallback(() => {
    setIsCheckerModalOpen(false);
  }, []);

  const checkAreaAvailability = useCallback(
    async (areaName: string, city?: string, state?: string, pincode?: string, district?: string, tehsil?: string) => {
      const result = await checkDeliveryServiceability(areaName, city, state, pincode, district, tehsil);
      return result;
    },
    []
  );

  return (
    <DeliveryContext.Provider
      value={{
        activeAreas,
        selectedArea,
        loading,
        isCheckerModalOpen,
        setSelectedArea,
        openCheckerModal,
        closeCheckerModal,
        refreshAreas,
        checkAreaAvailability,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
};

export function useDelivery(): DeliveryContextType {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error('useDelivery must be used within a DeliveryProvider');
  }
  return context;
}
