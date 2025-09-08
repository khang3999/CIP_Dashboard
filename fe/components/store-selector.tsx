"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Store } from "lucide-react"

interface StoreSelectorProps {
  onSelectionChange: (region: string, store: string) => void
}

export function StoreSelector({ onSelectionChange }: StoreSelectorProps) {
  const [selectedRegion, setSelectedRegion] = useState("")
  const [selectedStore, setSelectedStore] = useState("")

  const regions = [
    {
      id: 1,
      name: "Ga Quốc Tế",
      key: "ga-quoc-te",
      stores: [
        { id: "gt-store-1", name: "Store GT-01 (Terminal 1)" },
        { id: "gt-store-2", name: "Store GT-02 (Terminal 2)" },
        { id: "gt-store-3", name: "Store GT-03 (Duty Free)" },
        { id: "gt-store-4", name: "Store GT-04 (Food Court)" },
        { id: "gt-store-5", name: "Store GT-05 (Departure)" },
      ],
    },
    {
      id: 2,
      name: "Ga Quốc Nội",
      key: "ga-quoc-noi",
      stores: [
        { id: "gn-store-1", name: "Store GN-01 (Hall A)" },
        { id: "gn-store-2", name: "Store GN-02 (Hall B)" },
        { id: "gn-store-3", name: "Store GN-03 (VIP Lounge)" },
        { id: "gn-store-4", name: "Store GN-04 (Gate Area)" },
      ],
    },
  ]

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region)
    setSelectedStore("")
    onSelectionChange(region, "")
  }

  const handleStoreChange = (store: string) => {
    setSelectedStore(store)
    onSelectionChange(selectedRegion, store)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Chọn khu vực và cửa hàng
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Khu vực *</label>
          <Select value={selectedRegion} onValueChange={handleRegionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn khu vực..." />
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

        {selectedRegion && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Store className="h-4 w-4" />
              Cửa hàng *
            </label>
            <Select value={selectedStore} onValueChange={handleStoreChange}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn cửa hàng..." />
              </SelectTrigger>
              <SelectContent>
                {regions
                  .find((r) => r.id.toString() === selectedRegion)
                  ?.stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedRegion && selectedStore && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Đã chọn:</p>
            <p className="font-medium">
              {regions.find((r) => r.id.toString() === selectedRegion)?.name} -{" "}
              {
                regions.find((r) => r.id.toString() === selectedRegion)?.stores.find((s) => s.id === selectedStore)
                  ?.name
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
