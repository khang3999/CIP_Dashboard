"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Clock } from "lucide-react"

interface ShiftChartProps {
  region: string
  store: string
}

export function ShiftChart({ region, store }: ShiftChartProps) {
  const [data, setData] = useState([
    {
      shift: "Ca 1 (00:00-08:00)",
      passengers: 0,
      services: 0,
      avgStay: 0,
    },
    {
      shift: "Ca 2 (08:00-16:00)",
      passengers: 0,
      services: 0,
      avgStay: 0,
    },
    {
      shift: "Ca 3 (16:00-24:00)",
      passengers: 0,
      services: 0,
      avgStay: 0,
    },
  ])

  useEffect(() => {
    const generateShiftData = () => {
      const basePassengers = region === "ga-quoc-te" ? 180 : 120
      const storeMultiplier = store.includes("store-1") ? 1.2 : store.includes("store-2") ? 1.0 : 0.8

      // Use deterministic values based on region and store combination
      const seedValue = (region + store).length % 10

      return [
        {
          shift: "Ca 1 (00:00-08:00)",
          passengers: Math.round(basePassengers * 0.4 * storeMultiplier + seedValue * 2),
          services: Math.round(25 * storeMultiplier + seedValue),
          avgStay: Math.round(45 + seedValue * 1.5),
        },
        {
          shift: "Ca 2 (08:00-16:00)",
          passengers: Math.round(basePassengers * 1.6 * storeMultiplier + seedValue * 3),
          services: Math.round(85 * storeMultiplier + seedValue * 1.5),
          avgStay: Math.round(65 + seedValue * 2),
        },
        {
          shift: "Ca 3 (16:00-24:00)",
          passengers: Math.round(basePassengers * 1.0 * storeMultiplier + seedValue * 2.5),
          services: Math.round(55 * storeMultiplier + seedValue * 1.2),
          avgStay: Math.round(55 + seedValue * 1.8),
        },
      ]
    }

    setData(generateShiftData())
  }, [region, store])

  const chartConfig = {
    passengers: {
      label: "Số lượng hành khách",
      color: "hsl(var(--primary))",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Số lượng người sử dụng phòng chờ theo ca - Ngày hôm trước
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="shift" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}`} />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value, name) => [
                  name === "passengers" ? `${value} người` : value,
                  name === "passengers" ? "Hành khách" : name,
                ]}
              />
              <Bar dataKey="passengers" fill="var(--color-passengers)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <div className="grid grid-cols-3 gap-4 mt-4">
          {data.map((shift, index) => (
            <div key={index} className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">{shift.shift}</p>
              <p className="text-sm font-semibold">{shift.passengers} hành khách</p>
              <p className="text-xs text-muted-foreground">
                {shift.services} dịch vụ • {shift.avgStay} phút TB
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
