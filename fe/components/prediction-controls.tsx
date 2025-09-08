"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, Play, CalendarDays, MapPin, Store as StoreComponentLayout, Clock } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, set } from "date-fns"
import { vi } from "date-fns/locale"
import { PresetRange, Region, Store } from "@/types/index"
import { PredictionParams } from "@/types"
import { useRegions } from "@/contexts/app-provider"
import { usePredictionProvider } from "@/contexts/prediction-context"
import { DateRange } from "react-day-picker"
import { getDateRangeOfFuture } from "@/utils/utils"

interface PredictionControlsProps {
  onPredict: (params: PredictionParams | null) => void
  isLoading: boolean
}
const presetRanges: PresetRange[] = [
  {
    id: 5,
    count: 1,
    presetRange: "Ngày mai",
    type: "day",
    time_status: "future"
  },
  {
    id: 6,
    count: 1,
    presetRange: "7 ngày kế tiếp",
    type: "week",
    time_status: "future"
  },
  // {
  //   id: 7,
  //   count: 1,
  //   presetRange: "Tháng sau",
  //   type: "month",
  //   time_status: "future"
  // }
]


export function PredictionControls({ onPredict, isLoading }: PredictionControlsProps) {
  const { regions, stores, timeslots,
    selectedRegion,
    selectedStore,
    selectedPresetRange,
    selectedTimeslot,
    predictionParams,
    setSelectedRegion,
    setSelectedStore,
    getStoresForRegion,
    setSelectedTimeslot,
    setSelectedPresetRange,
    setPredictionParams } = usePredictionProvider()
  const [availableStores, setAvailableStores] = useState<Store[]>([])


  // const availableStores = selectedRegion ? getStoresForRegion(selectedRegion.id) : []

  // const getAvailableStores = () => {
  //   if (!params.region) return []
  //   const region = regions.find((r) => r.id.toString() === params.region)
  //   return region?.stores || []
  // }

  const handleRegionChange = (regionId: string) => {
    const region = regions.find((r) => r.id === Number.parseInt(regionId))
    setSelectedRegion(region || null)
    setSelectedStore(null) // Reset store selection
    setSelectedTimeslot(null) // Reset timeslot
    setPredictionParams({ ...predictionParams, region_id: Number.parseInt(regionId), store_id: undefined, timeslot_id: undefined })
  }

  const handleStoreChange = (storeId: string) => {
    const store = stores.find((s) => s.id === Number.parseInt(storeId))
    setSelectedStore(store || null)
    setSelectedTimeslot(null) // Reset timeslot
    setSelectedPresetRange(null) // Reset presetRange selecton
    setPredictionParams({ ...predictionParams, store_id: Number.parseInt(storeId), timeslot_id: undefined })
  }
  const handlePresetRangeChange = (presetId: string) => {
    const preset = presetRanges.find((p) => p.id === Number.parseInt(presetId))
    setSelectedPresetRange(preset || null)
    setSelectedTimeslot(null) // Reset timeslot
    setPredictionParams({ ...predictionParams, presetRange: preset, timeslot_id: undefined })
  }

  const handlePredict = () => {
    if (!predictionParams?.region_id || !predictionParams.store_id || (predictionParams.timeType === "custom" && !predictionParams.dateRange) || (predictionParams.timeType === "preset" && !predictionParams.presetRange) || !predictionParams.timeslot_id) {
      alert("Vui lòng điền đầy đủ thông tin!")
      return
    }
    // console.log(predictionParams, 'ppp');
    // const { startDate, endDate } = predictionParams.presetRange ? getDateRangeOfFuture(predictionParams.presetRange)  : { startDate: undefined, endDate: undefined }
    // console.log(startDate, endDate, 'date');

    onPredict(predictionParams)
  }


  const handleSwitchButton = (type: "preset" | "custom") => {
    if (type === "preset") {
      // setSelectedPresetRange(null)
      setPredictionParams({ ...predictionParams, timeType: `${type}`, dateRange: undefined, presetRange: undefined, timeslot_id: undefined })
    } else {
      setPredictionParams({ ...predictionParams, timeType: `${type}`, dateRange: undefined, presetRange: undefined, timeslot_id: undefined })
    }
    setSelectedTimeslot(null)
  }

  const handleDateRangeChange = (dateRange: DateRange) => {
    if (!dateRange) return

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const updatedRange: DateRange = {
      ...dateRange,
      from: tomorrow,   // ép from luôn = hôm nay
    }
    setPredictionParams({ ...predictionParams, dateRange: updatedRange, timeslot_id: undefined })
    setSelectedTimeslot(null)


  }

  const handleTimeslotChange = (timeslotId: string) => {
    const timeslot = timeslots.find((s) => s.id === Number.parseInt(timeslotId))
    setSelectedTimeslot(timeslot || null) // Reset timeslot
    setSelectedPresetRange(null) // Reset presetRange selecton
    setPredictionParams({ ...predictionParams, timeslot_id: Number.parseInt(timeslotId) })
  }

  useEffect(() => {
    console.log(selectedTimeslot, 'ss111');

  }, [selectedTimeslot])

  useEffect(() => {
    if (!selectedRegion) return
    setAvailableStores(getStoresForRegion(selectedRegion.id))
  }, [selectedRegion])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Thiết lập dự đoán
        </CardTitle>
        <CardDescription>Chọn thời gian và khu vực để dự đoán</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="region" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Khu vực <span className="text-red-500">*</span>
          </Label>
          <Select value={predictionParams?.region_id?.toString()} onValueChange={handleRegionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn khu vực" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((region) => (
                <SelectItem key={region.id} value={region.id.toString()}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* {selectedRegion && ( */}
        <div className="space-y-2">
          <Label htmlFor="store" className="flex items-center gap-2">
            <StoreComponentLayout className="h-4 w-4" />
            Phòng chờ <span className="text-red-500">*</span>
          </Label>
          <Select value={selectedStore?.id.toString() || ""} onValueChange={handleStoreChange} disabled={!selectedRegion}>
            <SelectTrigger>
              <SelectValue placeholder="Vui lòng chọn phòng chờ" />
            </SelectTrigger>
            <SelectContent>
              {/* <SelectItem value="all">
                  Toàn khu vực {regions.find((r) => r.id === params.region_id)?.name}
                </SelectItem> */}
              {availableStores.map((store) => (
                <SelectItem key={store.id} value={store.id.toString()}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* )} */}

        <div className="space-y-4">
          <Label>Loại thời gian</Label>
          <div className="flex gap-4">
            <Button
              variant={predictionParams?.timeType === "preset" ? "default" : "outline"}
              onClick={() => handleSwitchButton("preset")}
              className="flex-1"
            >
              Khoảng cố định
            </Button>
            <Button
              variant={predictionParams?.timeType === "custom" ? "default" : "outline"}
              onClick={() => handleSwitchButton("custom")}
              className="flex-1"
            >
              Ngày cụ thể
            </Button>
          </div>
        </div>

        {predictionParams?.timeType === "preset" && (
          <div className="space-y-2">
            <Label htmlFor="presetRange" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Khoảng thời gian <span className="text-red-500">*</span>
            </Label>
            <Select value={predictionParams.presetRange?.id.toString()} onValueChange={handlePresetRangeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn khoảng thời gian" />
              </SelectTrigger>
              <SelectContent>
                {presetRanges.map((range) => (
                  <SelectItem key={range.id} value={range.id.toString()}>
                    {range.presetRange}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {predictionParams?.timeType === "custom" && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {/* Từ: Ngày mai - Đến: {params.dateRange?.to ? format(params.dateRange?.to, "P", { locale: vi }) : <span>   </span>} */}
              Khoảng thời gian <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {predictionParams.dateRange?.to ? `Ngày mai - ` + format(predictionParams.dateRange?.to, "P", { locale: vi }) : <span>Chọn ngày</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="range"
                  required
                  selected={predictionParams.dateRange}
                  onSelect={(date) => handleDateRangeChange(date)}
                  // disabled={(date) => date <= new Date() && date > new Date().setDate()}
                  disabled={[
                    { before: new Date(new Date().setDate(new Date().getDate() + 1)) }, // chặn ngày quá khứ
                    { after: new Date(new Date().setDate(new Date().getDate() + 16 - 1)) } // chặn ngày sau 16 ngày
                  ]}
                  max={16}
                  excludeDisabled={true}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Ca làm việc <span className="text-red-500">*</span>
          </label>
          <Select value={selectedTimeslot?.id.toString() || ""} onValueChange={handleTimeslotChange} disabled={!selectedStore || (!predictionParams?.presetRange && !predictionParams?.dateRange)}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn ca làm việc" />
            </SelectTrigger>
            <SelectContent>
              {/* <SelectItem value="all">Cả ngày (24h)</SelectItem> */}
              {timeslots.map((timeslot) => (
                <SelectItem key={timeslot.id} value={timeslot.id.toString()}>
                  {timeslot.timeslot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tham số hiện tại:</Label>
          <div className="flex flex-wrap gap-2">
            {predictionParams?.region_id && (
              <Badge variant="outline">
                <MapPin className="h-3 w-3 mr-1" />
                {regions.find((r) => r.id === predictionParams.region_id)?.name}
              </Badge>
            )}
            {predictionParams?.store_id && (
              <Badge variant="outline">
                <StoreComponentLayout className="h-3 w-3 mr-1" />
                {availableStores.find((s) => s.id === predictionParams.store_id)?.name}
              </Badge>
            )}
            {predictionParams?.timeType === "preset" && predictionParams.presetRange && (
              <Badge variant="outline">
                <Calendar className="h-4 w-4" />
                {presetRanges.find((r) => r.id === predictionParams.presetRange?.id)?.presetRange}
              </Badge>
            )}
            {predictionParams?.timeType === "custom" && predictionParams.dateRange && (
              <Badge variant="outline">
                <Calendar className="h-4 w-4" />
                {predictionParams.dateRange?.from ? format(predictionParams.dateRange.from, "P") + " - " : <span>...</span>}
                {predictionParams.dateRange?.to ? format(predictionParams.dateRange.to, "P") : <span>...</span>}
              </Badge>
            )}
            {predictionParams?.timeslot_id && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {timeslots.find((t) => t.id === predictionParams.timeslot_id)?.timeslot}
              </Badge>
            )}
          </div>
        </div>

        <Button
          onClick={handlePredict}
          disabled={
            isLoading || !predictionParams?.region_id || !predictionParams.store_id || (predictionParams.timeType === "custom" && !predictionParams.dateRange) || (predictionParams.timeType === "preset" && !predictionParams.presetRange) || !predictionParams.timeslot_id}
          className="w-full"
          size="lg"
        >
          <Play className="h-4 w-4 mr-2" />
          {isLoading ? "Đang dự đoán..." : "Tạo dự đoán"}
        </Button>
      </CardContent>
    </Card>
  )
}
