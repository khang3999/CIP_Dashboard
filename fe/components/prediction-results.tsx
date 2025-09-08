"use client"

import { Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react"
import type { PredictionParams } from "./prediction-controls"

interface PredictionResultsProps {
  params: PredictionParams | null
  isLoading: boolean
}

// Mock prediction data generator
function generatePredictionData(params: PredictionParams) {
  const months =
    params.timeRange === "1month" ? 4 : params.timeRange === "3months" ? 12 : params.timeRange === "6months" ? 24 : 48
  const baseValue = 2000000
  const trendMultiplier = params.marketTrend === "bullish" ? 1.2 : params.marketTrend === "bearish" ? 0.8 : 1.0
  const seasonalityFactor = params.seasonality / 100

  const seedValue = (params.region + params.store + params.timeRange).length % 100

  return Array.from({ length: months }, (_, i) => {
    const seasonal = Math.sin((i / months) * 2 * Math.PI) * seasonalityFactor * 0.3
    const trend = (i / months) * trendMultiplier * 0.5
    const noise = (((seedValue + i) % 20) - 10) / 100 // Deterministic noise

    const predicted = baseValue * (1 + trend + seasonal + noise)
    const actual = i < months * 0.7 ? predicted * (0.9 + ((seedValue + i) % 20) / 100) : null
    const upperBound = predicted * 1.15
    const lowerBound = predicted * 0.85

    return {
      period: `T${i + 1}`,
      predicted: Math.round(predicted),
      actual: actual ? Math.round(actual) : null,
      upperBound: Math.round(upperBound),
      lowerBound: Math.round(lowerBound),
      confidence: Math.round(85 + ((seedValue + i) % 10)),
    }
  })
}

export function PredictionResults({ params, isLoading }: PredictionResultsProps) {
  if (!params) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Chọn tham số và nhấn "Tạo dự đoán" để xem kết quả</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Đang phân tích dữ liệu và tạo dự đoán...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const predictionData = generatePredictionData(params)
  const avgConfidence = Math.round(
    predictionData.reduce((sum, item) => sum + item.confidence, 0) / predictionData.length,
  )
  const totalPredicted = predictionData.reduce((sum, item) => sum + item.predicted, 0)
  const totalActual = predictionData.filter((item) => item.actual).reduce((sum, item) => sum + (item.actual || 0), 0)
  const accuracy = totalActual > 0 ? Math.round((1 - Math.abs(totalPredicted - totalActual) / totalActual) * 100) : null

  return (
    <div className="space-y-6">
      {/* Prediction Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Độ tin cậy trung bình</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-foreground">{avgConfidence}%</span>
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mức độ chính xác cao</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dự đoán tổng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-foreground">{(totalPredicted / 1000000).toFixed(1)}M</span>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">VNĐ trong kỳ dự đoán</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Độ chính xác</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-foreground">{accuracy ? `${accuracy}%` : "N/A"}</span>
              {accuracy && accuracy > 80 ? (
                <TrendingUp className="h-5 w-5 text-primary" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">So với dữ liệu thực tế</p>
          </CardContent>
        </Card>
      </div>

      {/* Prediction Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ dự đoán</CardTitle>
          <CardDescription>So sánh dữ liệu thực tế và dự đoán với khoảng tin cậy</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              predicted: {
                label: "Dự đoán",
                color: "hsl(var(--chart-1))",
              },
              actual: {
                label: "Thực tế",
                color: "hsl(var(--chart-2))",
              },
              upperBound: {
                label: "Giới hạn trên",
                color: "hsl(var(--chart-3))",
              },
              lowerBound: {
                label: "Giới hạn dưới",
                color: "hsl(var(--chart-3))",
              },
            }}
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={predictionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [`${(value / 1000000).toFixed(1)}M VNĐ`]}
                />

                {/* Confidence interval area */}
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stackId="1"
                  stroke="none"
                  fill="var(--color-chart-3)"
                  fillOpacity={0.1}
                />
                <Area type="monotone" dataKey="lowerBound" stackId="1" stroke="none" fill="white" fillOpacity={1} />

                {/* Prediction line */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  name="Dự đoán"
                  dot={{ fill: "var(--color-chart-1)", strokeWidth: 2, r: 4 }}
                />

                {/* Actual data line */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  name="Thực tế"
                  dot={{ fill: "var(--color-chart-2)", strokeWidth: 2, r: 4 }}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Nhận xét và khuyến nghị</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-primary/5 rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Xu hướng tích cực</p>
                <p className="text-sm text-muted-foreground">
                  Dựa trên tham số đã chọn, dự đoán cho thấy xu hướng tăng trưởng ổn định trong {params.timeRange}.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Lưu ý về mùa vụ</p>
                <p className="text-sm text-muted-foreground">
                  Với tính mùa vụ {params.seasonality}%, cần chuẩn bị cho các biến động theo chu kỳ.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-accent/5 rounded-lg">
              <CheckCircle className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Khuyến nghị</p>
                <p className="text-sm text-muted-foreground">
                  Tăng ngân sách marketing trong các tháng cao điểm để tối ưu hóa kết quả kinh doanh.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
