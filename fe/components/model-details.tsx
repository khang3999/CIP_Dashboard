"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Bar, BarChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { TrendingUp, Clock, Database, Target, Cpu, MemoryStick as Memory } from "lucide-react"

interface Model {
  id: string
  name: string
  type: string
  status: "training" | "completed" | "failed" | "paused"
  accuracy: number
  trainingProgress: number
  createdAt: string
  trainingTime: string
  dataSize: string
  version: string
}

interface ModelDetailsProps {
  model: Model | null
}

// Mock training history data
const trainingHistory = [
  { epoch: 1, loss: 0.85, accuracy: 65, valLoss: 0.92, valAccuracy: 62 },
  { epoch: 2, loss: 0.72, accuracy: 73, valLoss: 0.78, valAccuracy: 71 },
  { epoch: 3, loss: 0.65, accuracy: 78, valLoss: 0.71, valAccuracy: 76 },
  { epoch: 4, loss: 0.58, accuracy: 82, valLoss: 0.66, valAccuracy: 80 },
  { epoch: 5, loss: 0.52, accuracy: 85, valLoss: 0.61, valAccuracy: 83 },
  { epoch: 6, loss: 0.47, accuracy: 88, valLoss: 0.58, valAccuracy: 86 },
  { epoch: 7, loss: 0.43, accuracy: 90, valLoss: 0.55, valAccuracy: 88 },
  { epoch: 8, loss: 0.39, accuracy: 92, valLoss: 0.53, valAccuracy: 90 },
  { epoch: 9, loss: 0.36, accuracy: 93, valLoss: 0.51, valAccuracy: 91 },
  { epoch: 10, loss: 0.34, accuracy: 94, valLoss: 0.5, valAccuracy: 92 },
]

const performanceMetrics = [
  { metric: "Precision", value: 0.94 },
  { metric: "Recall", value: 0.91 },
  { metric: "F1-Score", value: 0.92 },
  { metric: "AUC-ROC", value: 0.96 },
]

export function ModelDetails({ model }: ModelDetailsProps) {
  if (!model) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Chọn một model để xem chi tiết</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Model Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{model.name}</CardTitle>
              <CardDescription>
                {model.type} - {model.version}
              </CardDescription>
            </div>
            <Badge className={model.status === "completed" ? "bg-primary" : "bg-blue-500"}>
              {model.status === "completed" ? "Hoàn thành" : "Đang huấn luyện"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Độ chính xác</p>
                <p className="text-2xl font-bold">{model.accuracy}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Thời gian huấn luyện</p>
                <p className="text-2xl font-bold">{model.trainingTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Kích thước dữ liệu</p>
                <p className="text-2xl font-bold">{model.dataSize}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Tiến độ</p>
                <p className="text-2xl font-bold">{model.trainingProgress}%</p>
              </div>
            </div>
          </div>

          {model.status === "training" && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Tiến độ huấn luyện</span>
                <span>{model.trainingProgress}%</span>
              </div>
              <Progress value={model.trainingProgress} className="h-3" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training History Chart */}
      {model.status === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử huấn luyện</CardTitle>
            <CardDescription>Theo dõi loss và accuracy qua các epochs</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                accuracy: {
                  label: "Training Accuracy",
                  color: "hsl(var(--chart-1))",
                },
                valAccuracy: {
                  label: "Validation Accuracy",
                  color: "hsl(var(--chart-2))",
                },
                loss: {
                  label: "Training Loss",
                  color: "hsl(var(--chart-3))",
                },
                valLoss: {
                  label: "Validation Loss",
                  color: "hsl(var(--chart-4))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trainingHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="epoch" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    name="Training Accuracy"
                  />
                  <Line
                    type="monotone"
                    dataKey="valAccuracy"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    name="Validation Accuracy"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {model.status === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle>Chỉ số hiệu suất</CardTitle>
            <CardDescription>Các metrics đánh giá chất lượng model</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Giá trị",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceMetrics} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis domain={[0, 1]} />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => [value.toFixed(3)]} />
                  <Bar dataKey="value" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* System Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Tài nguyên hệ thống</CardTitle>
          <CardDescription>Sử dụng CPU và Memory trong quá trình huấn luyện</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">CPU Usage</span>
              </div>
              <Progress value={75} className="h-2" />
              <p className="text-xs text-muted-foreground">75% - 8 cores được sử dụng</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Memory className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Memory Usage</span>
              </div>
              <Progress value={60} className="h-2" />
              <p className="text-xs text-muted-foreground">12.8GB / 32GB RAM</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Cấu hình Model</CardTitle>
          <CardDescription>Thông số và hyperparameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Learning Rate:</span>
                <span className="text-sm font-medium">0.001</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Batch Size:</span>
                <span className="text-sm font-medium">32</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Epochs:</span>
                <span className="text-sm font-medium">100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Optimizer:</span>
                <span className="text-sm font-medium">Adam</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Hidden Layers:</span>
                <span className="text-sm font-medium">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Neurons per Layer:</span>
                <span className="text-sm font-medium">128, 64, 32</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Activation:</span>
                <span className="text-sm font-medium">ReLU</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Dropout Rate:</span>
                <span className="text-sm font-medium">0.2</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
