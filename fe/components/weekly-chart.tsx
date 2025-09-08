"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Calendar } from "lucide-react"

interface WeeklyChartProps {
  region: string
  store: string
}

export function WeeklyChart({ region, store }: WeeklyChartProps) {
  const [data, setData] = useState([{ week: "Đang tải...", passengers: 0, services: 0, avgDaily: 0, daysCount: 0 }])

  useEffect(() => {
    const generateWeeklyData = () => {
      const basePassengers = region === "ga-quoc-te" ? 1200 : 800
      const storeMultiplier = store.includes("store-1") ? 1.2 : store.includes("store-2") ? 1.0 : 0.8

      const staticWeeks = [
        { week: "Tuần 1 (1/1 - 7/1)", daysInPeriod: 7 },
        { week: "Tuần 2 (8/1 - 14/1)", daysInPeriod: 7 },
        { week: "Tuần 3 (15/1 - 21/1)", daysInPeriod: 7 },
        { week: "Tuần này (đến 28/1)", daysInPeriod: 6 },
      ]

      const seedValue = (region + store).length % 20

      return staticWeeks.map((weekInfo, index) => ({
        week: weekInfo.week,
        passengers: Math.round(
          basePassengers * storeMultiplier * (weekInfo.daysInPeriod / 7) + seedValue * (index + 1) * 5,
        ),
        services: Math.round(450 * storeMultiplier * (weekInfo.daysInPeriod / 7) + seedValue * (index + 1) * 2.5),
        avgDaily: Math.round((basePassengers * storeMultiplier) / 7 + seedValue * (index + 1)),
        daysCount: weekInfo.daysInPeriod,
      }))
    }

    setData(generateWeeklyData())
  }, [region, store])

  const chartConfig = {
    passengers: {
      label: "Hành khách tuần",
      color: "hsl(var(--primary))",
    },
    avgDaily: {
      label: "Trung bình/ngày",
      color: "hsl(var(--muted-foreground))",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Số lượng hành khách sử dụng phòng chờ - 4 tuần trong tháng
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}`} />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value, name) => [
                  `${value.toLocaleString()} người`,
                  name === "passengers" ? "Hành khách tuần" : "Trung bình/ngày",
                ]}
              />
              <Line
                type="monotone"
                dataKey="passengers"
                stroke="var(--color-passengers)"
                strokeWidth={3}
                dot={{ fill: "var(--color-passengers)", strokeWidth: 2, r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="avgDaily"
                stroke="var(--color-avgDaily)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "var(--color-avgDaily)", strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Tổng hành khách</p>
            <p className="text-lg font-semibold">
              {data.reduce((sum, week) => sum + week.passengers, 0).toLocaleString()} người
            </p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Trung bình/tuần</p>
            <p className="text-lg font-semibold">
              {Math.round(data.reduce((sum, week) => sum + week.passengers, 0) / 4).toLocaleString()} người
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
