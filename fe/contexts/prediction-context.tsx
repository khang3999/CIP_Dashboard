import { PredictionParams, PresetRange, Region, Store, Timeslot } from '@/types'
import React, { createContext, ReactNode, useContext, useState } from 'react'
import { useAppProvider } from './app-provider'


interface PredictContextType {
    // Regions and stores
    regions: Region[]
    stores: Store[]
    timeslots: Timeslot[]
    selectedRegion: Region | null
    selectedStore: Store | null
    selectedTimeslot: Timeslot | null
    selectedPresetRange: PresetRange | null
    predictionParams: PredictionParams | null
    setSelectedRegion: (region: Region | null) => void
    setSelectedStore: (store: Store | null) => void
    setSelectedTimeslot: (timeslot: Timeslot | null) => void
    setSelectedPresetRange: (presetRange: PresetRange | null) => void
    setPredictionParams: (params: PredictionParams) => void

    // Loading states
    // isLoading: boolean
    // setIsLoading: (loading: boolean) => void

    // Refresh data
    // refreshData: () => void

    // // Method
    getStoresForRegion: (selectedRegionId: number) => Store[]
}

const PredictionContext = createContext<PredictContextType | undefined>(undefined)

const PredictionProvider = ({ children }: { children: ReactNode }) => {

    const { regions, stores, timeslots, getStoresForRegion } = useAppProvider()
    const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
    const [selectedStore, setSelectedStore] = useState<Store | null>(null)
    const [selectedPresetRange, setSelectedPresetRange] = useState<any | null>(null)
    const [selectedTimeslot, setSelectedTimeslot] = useState<Timeslot | null>(null)
    const [predictionParams, setPredictionParams] = useState<PredictionParams>({
        timeType: "preset",
        region_id: undefined,
        store_id: undefined,
        presetRange: undefined,
        timeslot_id: undefined,
        dateRange: undefined
    })
    const value: PredictContextType = {
        regions, stores, timeslots,
        selectedRegion,
        selectedStore,
        selectedPresetRange,
        selectedTimeslot,
        predictionParams,
        setSelectedRegion,
        setSelectedStore,
        getStoresForRegion,
        setSelectedTimeslot,
        setPredictionParams,
        setSelectedPresetRange
        // isLoading,
        // setIsLoading,
        // refreshData,
    }
    return <PredictionContext.Provider value={value}>{children}</PredictionContext.Provider>
}
// Custom hook to use data context
export function usePredictionProvider() {
    const context = useContext(PredictionContext)
    if (context === undefined) {
        throw new Error("usePredictionProvider must be used within a PredictionProvider")
    }
    return context
}
export default PredictionProvider