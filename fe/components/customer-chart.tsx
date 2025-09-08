"use client"

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const customerData = [
  { category: "Khách hàng mới", count: 234, percentage: 45 },
  { category: "Khách hàng cũ", count: 456, percentage: 55 },
  { category: "Khách VIP", count: 123, percentage: 15 },
  { category: "Khách doanh nghiệp", count: 89, percentage: 12 },
]

export function CustomerChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Phân loại khách hàng</CardTitle>
        <CardDescription>Thống kê khách hàng theo từng nhóm</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            count: {
              label: "Số lượng",
              color: "hsl(var(--chart-1))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={customerData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-chart-1)" name="Số lượng khách hàng" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
