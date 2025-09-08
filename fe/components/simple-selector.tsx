"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import { Badge } from "./ui/badge"
import { Calendar, CalendarDays, Clock, MapPin, Store as StoreComponentLayout } from "lucide-react"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import { format, startOfDay } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { PresetRange, Store } from "@/types"
import { DateRange } from "react-day-picker"
import { useOverviewProvider } from "@/contexts/overview-context"
const presetRanges: PresetRange[] = [
  {
    id: 1,
    count: 0,
    presetRange: "Tất cả",
    type: "day",
    time_status: "today"
  },
  {
    id: 2,
    count: 1,
    presetRange: "Hôm qua",
    type: "day",
    time_status: "past"
  },
  {
    id: 3,
    count: 1,
    presetRange: "Tuần trước",
    type: "week",
    time_status: "past"
  },
  {
    id: 4,
    count: 1,
    presetRange: "Tháng trước",
    type: "month",
    time_status: "past"
  }
]


export function SimpleSelector() {
  const [availableStores, setAvailableStores] = useState<Store[]>([])
  const { regions, stores, timeslots, selectedRegion, setSelectedRegion, selectedStore, setSelectedStore, selectedPresetRange, setSelectedPresetRange, selectedTimeslot, setSelectedTimeslot, getStoresForRegion, params, setParams } = useOverviewProvider()


  const handleRegionChange = (regionId: string) => {
    const region = regions.find((r) => r.id === Number.parseInt(regionId))
    setSelectedRegion(region || null)
    setSelectedStore(null) // Reset store selection
    setSelectedTimeslot(null) // Reset timeslot
    setParams({ ...params, region_id: Number.parseInt(regionId), store_id: undefined, timeslot_id: undefined })
  }

  const handleStoreChange = (storeId: string) => {
    const store = stores.find((s) => s.id === Number.parseInt(storeId))
    setSelectedStore(store || null)
    // const preset = presetRanges.find((p) => p.id === 1)
    setSelectedTimeslot(null) // Reset timeslot
    setSelectedPresetRange(null) // Reset presetRange selecton
    setParams({ ...params, store_id: Number.parseInt(storeId), timeslot_id: undefined })
  }
  const handlePresetRangeChange = (presetId: string) => {
    const preset = presetRanges.find((p) => p.id === Number.parseInt(presetId))
    console.log(preset,'choose');
    
    setSelectedPresetRange(preset || null)
    setSelectedTimeslot(null) // Reset timeslot
    setParams({ ...params, presetRange: preset })
  }

  const handleTimeslotChange = (timeslotId: string) => {
    const timeslot = timeslots.find((s) => s.id === Number.parseInt(timeslotId))
    console.log(timeslot);

    setSelectedTimeslot(timeslot || null) // Reset timeslot
    // setSelectedPresetRange(null) // Reset presetRange selecton
    setParams({ ...params, timeslot_id: Number.parseInt(timeslotId) })
  }

  useEffect(() => {
    console.log(selectedTimeslot, 'ss');

  }, [selectedTimeslot])
  const handleSwitchButton = (type: "preset" | "custom") => {
    if (type === "preset") {
      setParams({ ...params, timeType: `${type}`, dateRange: undefined, presetRange: undefined, timeslot_id: undefined })
    } else {
      setParams({ ...params, timeType: `${type}`, dateRange: undefined, presetRange: undefined, timeslot_id: undefined })
    }
    setSelectedTimeslot(null)
  }

  const handleDateRangeChange = (dateRange: DateRange) => {
    setParams({ ...params, dateRange: dateRange, timeslot_id: undefined })
    setSelectedTimeslot(null)
  }


  useEffect(() => {
    if (!selectedRegion) return
    const availableStores = getStoresForRegion(selectedRegion.id)
    setAvailableStores(availableStores)
  }, [selectedRegion])

  // const availableStores = selectedRegion ? getStoresForRegion(selectedRegion.id) : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chọn khu vực, phòng chờ và thời gian</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-10">
        <div className="space-y-2 flex gap-10">
          <div className="space-y-4 flex-3">
            <div className="space-y-4">
              <Label>Loại thời gian</Label>
              <div className="flex gap-4">
                <Button
                  variant={params?.timeType === "preset" ? "default" : "outline"}
                  onClick={() => handleSwitchButton("preset")}
                  className="flex-1"
                >
                  Khoảng cố định
                </Button>
                <Button
                  variant={params?.timeType === "custom" ? "default" : "outline"}
                  onClick={() => handleSwitchButton("custom")}
                  className="flex-1"
                >
                  Ngày cụ thể
                </Button>
              </div>
            </div>

            {params?.timeType === "preset" && (
              <div className="space-y-2">
                <Label htmlFor="presetRange" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Khoảng thời gian
                </Label>
                <Select value={params.presetRange?.id.toString()} onValueChange={handlePresetRangeChange}>
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

            {params?.timeType === "custom" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {/* Từ: {params.dateRange?.from ? format(params.dateRange.from, "P") : <span>...</span>}
                  Đến: {params.dateRange?.to ? format(params.dateRange.to, "P") : <span>...</span>} */}
                  Khoảng thời gian
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {(params.dateRange?.from && params.dateRange?.to) ? format(params.dateRange.from, "P") + " - " + format(params.dateRange.to, "P") : <span>Chọn ngày</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="range"
                      disabled={(date) => date >= startOfDay(new Date())}
                      required
                      selected={params.dateRange}
                      onSelect={(dateRange) => handleDateRangeChange(dateRange)}
                      excludeDisabled={true}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          <div className="flex-1"></div>
          <div className="space-y-4 flex-2">
            <div className="space-y-2" >
              <label className="text-sm font-semibold">Khu vực <span className="text-red-500">*</span></label>
              <Select value={selectedRegion?.id.toString() || ""} onValueChange={handleRegionChange}>
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

            <div className="space-y-2">
              <label className="text-sm font-semibold">Phòng chờ <span className="text-red-500">*</span></label>
              <Select value={selectedStore?.id.toString() || ""} onValueChange={handleStoreChange} disabled={!selectedRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phòng chờ" />
                </SelectTrigger>
                <SelectContent>
                  {availableStores.map((store) => (
                    <SelectItem key={store.id} value={store.id.toString()}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Ca làm việc <span className="text-red-500">*</span></label>
              <Select value={selectedTimeslot?.id.toString() || ""} onValueChange={handleTimeslotChange} disabled={!selectedStore || (!params?.presetRange && !params?.dateRange)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn ca làm việc" />
                </SelectTrigger>
                <SelectContent>
                  {timeslots.map((timeslot) => (
                    <SelectItem key={timeslot.id} value={timeslot.id.toString()}>
                      {timeslot.timeslot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {/* {selectedRegion && selectedStore && selectedPresetRange && selectedTimeslot && ( */}
        <div className="mt-4 p-0 bg-muted rounded-lg">
          {/* <p className="text-sm"> */}
          <strong><p className="text-sm mb-2">Đã chọn:</p></strong>
          <div className="flex gap-3">
            {params?.region_id && (
              <Badge variant="outline">
                <MapPin className="h-3 w-3 mr-1" />
                {regions.find((r) => r.id === params.region_id)?.name}
              </Badge>
            )}
            {params?.store_id && (
              <Badge variant="outline">
                <StoreComponentLayout className="h-3 w-3 mr-1" />
                {availableStores.find((s) => s.id === params.store_id)?.name}
              </Badge>
            )}
            {params?.timeType === "preset" && params.presetRange && (
              <Badge variant="outline">
                <Calendar className="h-4 w-4" />
                {presetRanges.find((r: PresetRange) => r.id === params.presetRange?.id)?.presetRange}
              </Badge>
            )}
            {params?.timeType === "custom" && params.dateRange && (
              <Badge variant="outline">
                <CalendarDays className="h-4 w-4" />
                {params.dateRange?.from ? format(params.dateRange.from, "P") + " - " : <span>...</span>}
                {params.dateRange?.to ? format(params.dateRange.to, "P") : <span>...</span>}
              </Badge>
            )}
            {params?.timeslot_id && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {timeslots.find((s) => s.id === params.timeslot_id)?.timeslot}
              </Badge>
            )}
          </div>
        </div>
        {/* )} */}
      </CardContent>
    </Card >
  )
}
