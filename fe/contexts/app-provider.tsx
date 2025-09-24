"use client"

import { FoodDistribution, IngredientDistribution, LoungageUsage, OveriewParams, Region, Timeslot, Store, Model, ModelType } from "@/types"
import { supabase } from "@/utils/supabase/client"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { DateRange } from "react-day-picker"

// Data context interface
interface AppContextType {
  // Regions and stores
  regions: Region[]
  stores: Store[]
  timeslots: Timeslot[]
  modelTypes: ModelType[]
  // selectedRegion: Region | null
  // selectedStore: Store | null
  // setSelectedRegion: (region: Region | null) => void
  // setSelectedStore: (store: Store | null) => void

  // Lounge usage data
  loungeUsage: LoungageUsage[]
  foodDistribution: FoodDistribution[]
  ingredientDistribution: IngredientDistribution[]

  // Loading states
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  modelsList: Model[]
  setModelsList: (models: Model[]) => void

  // Refresh data
  refreshData: () => void

  // // Method
  getStoresForRegion: (selectedRegionId: number) => Store[]
}

const AppContext = createContext<AppContextType | undefined>(undefined)


export function AppProvider({ children }: { children: ReactNode }) {
  const [regions, setRegions] = useState<Region[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [timeslots, setTimeslots] = useState<Timeslot[]>([])
  const [modelTypes, setModelTypes] = useState<ModelType[]>([])
  const [loungeUsage, setLoungeUsage] = useState<LoungageUsage[]>([])
  const [foodDistribution, setFoodDistribution] = useState<FoodDistribution[]>([])
  const [ingredientDistribution, setIngredientDistribution] = useState<IngredientDistribution[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [modelsList, setModelsList] = useState<Model[]>([])

  const getStoresForRegion = (selectedRegionId: number) => {
    const storesForRegion = stores.filter(store => store.region_id === selectedRegionId)
    return storesForRegion
  }

  // Lấy data regions và stores
  useEffect(() => {
    const fetchRegionsAndStoresAndShifts = async () => {
      let regionsData: Region[] = []
      let storesData: Store[] = []
      let shiftsData: Timeslot[] = []
      let modelTypes: any[] = []
      try {
        //     id: string
        // name: string
        // type: string
        // regionId: number
        // status: "training" | "completed" | "failed" | "paused" | "using" | "default"
        // accuracy?: number
        // file_path: string
        // file_url: string
        // rmse?: number
        // mae?: number
        // r2?: number
        // wape?: number
        // trainingProgress: number
        // created_at: string
        // training_time?: string
        // data_size?: string
        // version: string
        const { data, error } = await supabase.from("cip_regions").select("*")
        if (error) throw error
        regionsData = data ?? []
        console.log(regionsData);

      } catch (err) {
        console.error("Error fetching regions:", err)
      }

      try {
        const { data, error } = await supabase.from("cip_stores").select("*")
        if (error) throw error
        storesData = data ?? []
        console.log(storesData);
      } catch (err) {
        console.error("Error fetching stores:", err)
      }

      try {
        const { data, error } = await supabase.from("cip_timeslot").select('*')
        if (error) throw error
        shiftsData = data ?? []
        console.log(data, "asdasd");
      } catch (err) {
        console.error("Error fetching stores:", err)
      }

      try {
        const { data, error } = await supabase.from("cip_model_types").select("*")
        if (error) throw error
        modelTypes = data ?? []
        // console.log(regionsData);

      } catch (err) {
        console.error("Error fetching regions:", err)
      }

      setRegions(regionsData)
      setStores(storesData)
      setTimeslots(shiftsData)
      setModelTypes(modelTypes)
    }

    fetchRegionsAndStoresAndShifts()
  }, [])

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const { data, error } = await supabase.from("cip_models").select("id, name, type, regionId:region_id, status, accuracy, filePath:file_path, fileUrl:file_url, rmse, mae, wape, trainingProgress:training_progress, createdAt:created_at, version").order("created_at")
        if (error) throw error
        setModelsList(data || [])
      } catch (err) {
        console.error("Error fetching models:", err)
      }
    }
    // Fetch lần đầu
    fetchModels()
    const channel = supabase
      .channel("models-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cip_models" },
        (payload) => {
          // console.log("Realtime change:", payload);
          // if (payload.eventType === "UPDATE") {
          //   // const updated = payload.new;
          //   // // ví dụ cập nhật UI khi model completed
          //   // if (updated.status === "completed") {
          //   //   alert(`✅ Model ${updated.model_name} đã train xong!`);
          //   // }
          // }
          console.log("Realtime change detected:", payload);
          fetchModels()
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const refreshData = () => {
    setIsLoading(true)
    setTimeout(() => {
      // setLoungeUsage(generateMockLoungeUsage())
      // setFoodDistribution(generateMockFoodDistribution())
      // setIngredientDistribution(generateMockIngredientDistribution())
      setIsLoading(false)
    }, 1000)
  }

  const value: AppContextType = {
    regions,
    stores,
    timeslots,
    loungeUsage,
    foodDistribution,
    ingredientDistribution,
    isLoading,
    setIsLoading,
    refreshData,
    getStoresForRegion,
    modelsList,
    setModelsList,
    modelTypes
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// Custom hook to use data context --- Hook nay khi cho 
export function useAppProvider() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}


// Helper hooks for specific data
// export function useOverviewSection() {
//   const { regions, stores, timeslots } = useData()
//   const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
//   const [selectedStore, setSelectedStore] = useState<Store | null>(null)
//   const [selectedPresetRange, setSelectedPresetRange] = useState<any | null>(null)
//   const [selectedTimeslot, setSelectedTimeslot] = useState<Timeslot | null>(null)
//   // const [dateRange, setDateRange] = useState<DateRange | undefined>();
//   const [params, setParams] = useState<OveriewParams>({
//     timeType: "preset",
//     region_id: undefined,
//     store_id: undefined,
//     presetRange: undefined,
//     timeslot_id: undefined,
//     dateRange: undefined
//   })

//   const getStoresForRegion = (selectedRegionId: number) => {
//     const storesForRegion = stores.filter(store => store.region_id === selectedRegionId)
//     return storesForRegion
//   }

//   return { regions, stores, timeslots, selectedRegion, setSelectedRegion, selectedStore, setSelectedStore, selectedPresetRange, setSelectedPresetRange, selectedTimeslot, setSelectedTimeslot, getStoresForRegion, params, setParams }
// }

// Helper hooks for specific data
export function useRegions() {
  const { regions, stores, timeslots } = useAppProvider()

  const getStoresForRegion = (selectedRegionId: number) => {
    const storesForRegion = stores.filter(store => store.region_id === selectedRegionId)
    return storesForRegion
  }

  return { regions, stores, timeslots, getStoresForRegion }
}

export function useLoungeUsage() {
  const { loungeUsage } = useAppProvider()

  const filteredUsage = loungeUsage.filter((usage) => {
    // if (selectedStore) return usage.store_id === selectedStore.id
    // if (selectedRegion) return usage.region_id === selectedRegion.id
    return true
  })

  return { loungeUsage: filteredUsage }
}

export function useFoodDistribution() {
  const { foodDistribution } = useAppProvider()

  const filteredFood = foodDistribution.filter((food) => {
    // if (selectedStore) return food.storeId === selectedStore.id
    return true
  })

  return { foodDistribution: filteredFood }
}

export function useIngredientDistribution() {
  const { ingredientDistribution } = useAppProvider()

  const filteredIngredients = ingredientDistribution.filter((ingredient) => {
    // if (selectedStore) return ingredient.storeId === selectedStore.id
    return true
  })

  return { ingredientDistribution: filteredIngredients }
}
