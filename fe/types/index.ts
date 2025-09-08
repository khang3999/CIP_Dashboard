import { DateRange } from 'react-day-picker';
export interface Model {
    id: string
    name: string
    type: string
    region_id: number
    status: "training" | "completed" | "failed" | "paused" | "using" | "default"
    accuracy?: number
    file_path: string
    file_url: string
    rmse?: number
    mae?: number
    r2?: number
    wape?: number
    training_progress: number
    created_at: string
    training_time?: string
    data_size?: string
    version: string
}
// Types for shared data
export interface Region {
    id: number
    name: string
}

export interface OveriewParams {
    timeType?: "preset" | "custom"
    presetRange?: PresetRange
    dateRange?: DateRange
    region_id?: number
    store_id?: number
    timeslot_id?: number // Added shift parameter
}

export interface PredictionParams {
    timeType?: "preset" | "custom"
    presetRange?: PresetRange
    dateRange?: DateRange
    region_id?: number
    store_id?: number
    timeslot_id?: number // Added shift parameter
}

export interface PresetRange {
    id: number
    count: number
    presetRange: string,
    type: "day" | "month" | "week" | "year"
    time_status: "past" | "future" | "today"
}

export interface Store {
    id: number
    name: string
    region_id: number
}

export interface Timeslot {
    id: number
    timeslot: string
}

export interface LoungageUsage {
    id: number
    date: string
    region_id: number
    store_id: number
    timeslot_id: number
    total_customers: number
    flight: number
    dow: number
    month: number
    is_holiday: boolean
    temp_avg: number
    rain: boolean
    is_weekend: boolean
}

export interface FoodDistribution {
    id: string
    storeId: number
    date: string
    foodType: string
    quantity: number
    percentage: number
}

export interface IngredientDistribution {
    id: string
    storeId: number
    date: string
    ingredient: string
    quantity: number
    percentage: number
}

