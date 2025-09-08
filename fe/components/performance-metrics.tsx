"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Target } from "lucide-react"

const metrics = [
  {
    title: "Tổng doanh thu",
    value: "2.4M VNĐ",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
    description: "So với tháng trước",
  },
  {
    title: "Khách hàng mới",
    value: "1,234",
    change: "+5.2%",
    trend: "up",
    icon: Users,
    description: "Tăng trưởng ổn định",
  },
  {
    title: "Đơn hàng",
    value: "856",
    change: "+8.1%",
    trend: "up",
    icon: ShoppingCart,
    description: "Hiệu suất tốt",
  },
  {
    title: "Tỷ lệ chuyển đổi",
    value: "3.2%",
    change: "-0.5%",
    trend: "down",
    icon: Target,
    description: "Cần cải thiện",
  },
]

export function PerformanceMetrics() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        const TrendIcon = metric.trend === "up" ? TrendingUp : TrendingDown

        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metric.value}</div>
              <div className="flex items-center space-x-1 text-xs">
                <TrendIcon className={`h-3 w-3 ${metric.trend === "up" ? "text-primary" : "text-destructive"}`} />
                <span className={`font-medium ${metric.trend === "up" ? "text-primary" : "text-destructive"}`}>
                  {metric.change}
                </span>
                <span className="text-muted-foreground">{metric.description}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
