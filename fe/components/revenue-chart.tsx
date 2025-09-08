"use client"

import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const revenueData = [
  { month: "T1", revenue: 1200000, target: 1000000 },
  { month: "T2", revenue: 1350000, target: 1200000 },
  { month: "T3", revenue: 1100000, target: 1300000 },
  { month: "T4", revenue: 1800000, target: 1400000 },
  { month: "T5", revenue: 2100000, target: 1500000 },
  { month: "T6", revenue: 2400000, target: 1600000 },
  { month: "T7", revenue: 2200000, target: 1700000 },
  { month: "T8", revenue: 2600000, target: 1800000 },
  { month: "T9", revenue: 2800000, target: 1900000 },
  { month: "T10", revenue: 3100000, target: 2000000 },
  { month: "T11", revenue: 2900000, target: 2100000 },
  { month: "T12", revenue: 3400000, target: 2200000 },
]

export function RevenueChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Doanh thu theo tháng</CardTitle>
        <CardDescription>So sánh doanh thu thực tế và mục tiêu (VNĐ)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            revenue: {
              label: "Doanh thu thực tế",
              color: "hsl(var(--chart-1))",
            },
            target: {
              label: "Mục tiêu",
              color: "hsl(var(--chart-2))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value: number) => [`${(value / 1000000).toFixed(1)}M VNĐ`]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                name="Doanh thu thực tế"
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Mục tiêu"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
