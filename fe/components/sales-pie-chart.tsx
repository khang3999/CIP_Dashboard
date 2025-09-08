"use client"

import { Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const salesData = [
  { name: "Sản phẩm A", value: 35, color: "hsl(var(--chart-1))" },
  { name: "Sản phẩm B", value: 25, color: "hsl(var(--chart-2))" },
  { name: "Sản phẩm C", value: 20, color: "hsl(var(--chart-3))" },
  { name: "Sản phẩm D", value: 15, color: "hsl(var(--chart-4))" },
  { name: "Khác", value: 5, color: "hsl(var(--chart-5))" },
]

export function SalesPieChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tỷ lệ bán hàng theo sản phẩm</CardTitle>
        <CardDescription>Phân bố doanh số theo từng sản phẩm (%)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            value: {
              label: "Tỷ lệ",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={salesData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {salesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => [`${value}%`]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
