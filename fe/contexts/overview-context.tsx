"use client"
import { FoodDistribution, OveriewParams, PresetRange, Region, Store, Timeslot } from '@/types';
import React, { createContext, ReactNode, useContext, useRef, useState } from 'react';
import { useAppProvider } from './app-provider';
import { DateRange } from 'react-day-picker';
// Data context interface
interface OverviewContextType {
  // Regions and stores
  regions: Region[]
  stores: Store[]
  timeslots: Timeslot[]
  selectedRegion: Region | null
  selectedStore: Store | null
  selectedTimeslot: Timeslot | null
  selectedPresetRange: PresetRange | null
  params: OveriewParams | null
  // foodsDataShared: FoodDistribution[],
  foodsDataShared: FoodDistribution[]
  setSelectedRegion: (region: Region | null) => void
  setSelectedStore: (store: Store | null) => void
  setSelectedTimeslot: (timeslot: Timeslot | null) => void
  setSelectedPresetRange: (presetRange: PresetRange | null) => void
  setParams: (params: OveriewParams) => void
  setFoodsDataShared: (foodDistributionData: FoodDistribution[]) => void
  // Loading states
  // isLoading: boolean
  // setIsLoading: (loading: boolean) => void

  // Refresh data
  // refreshData: () => void

  // // Method
  getStoresForRegion: (selectedRegionId: number) => Store[]
}

const OverviewContext = createContext<OverviewContextType | undefined>(undefined)

const OverviewProvider = ({ children }: { children: ReactNode }) => {
  const { regions, stores, timeslots, getStoresForRegion } = useAppProvider()
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [selectedPresetRange, setSelectedPresetRange] = useState<any | null>(null)
  const [selectedTimeslot, setSelectedTimeslot] = useState<Timeslot | null>(null)
  const [foodsDataShared, setFoodsDataShared] = useState<FoodDistribution[]>([])
  // const [foodsDataShared, setFoodsDataShared] = useState<FoodDistribution[]>([])
  // const foodsDataShared = useRef<FoodDistribution[]>([])

  const [params, setParams] = useState<OveriewParams>({
    timeType: "preset",
    region_id: undefined,
    store_id: undefined,
    presetRange: undefined,
    timeslot_id: undefined,
    dateRange: undefined
  })


  const value: OverviewContextType = {
    regions, stores, timeslots,
    selectedRegion,
    selectedStore,
    selectedPresetRange,
    selectedTimeslot,
    params,
    setSelectedRegion,
    setSelectedStore,
    getStoresForRegion,
    setSelectedTimeslot,
    setSelectedPresetRange,
    setParams,
    foodsDataShared,
    setFoodsDataShared
    // isLoading,
    // setIsLoading,
    // refreshData,
  }
  return <OverviewContext.Provider value={value}>{children}</OverviewContext.Provider>
}

// Custom hook to use data context
export function useOverviewProvider() {
  const context = useContext(OverviewContext)
  if (context === undefined) {
    throw new Error("useOverviewProvider must be used within a OverviewProvider")
  }
  return context
}

// Helper hooks for specific data
export function useOverviewChart() {

}


export default OverviewProvider;
