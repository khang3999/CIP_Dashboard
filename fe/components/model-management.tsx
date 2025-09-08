"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Brain, Download, Trash2, Eye, Play, Archive, HardDrive } from "lucide-react"

interface ModelFile {
  id: string
  name: string
  version: string
  type: string
  size: number
  accuracy: number
  createdDate: string
  lastUsed: string
  status: "active" | "archived" | "deprecated"
  downloadCount: number
}

const mockModelFiles: ModelFile[] = [
  {
    id: "1",
    name: "Revenue Prediction Model",
    version: "v2.1",
    type: "Linear Regression",
    size: 15728640, // 15MB
    accuracy: 94.2,
    createdDate: "2024-01-15",
    lastUsed: "2024-01-22",
    status: "active",
    downloadCount: 12,
  },
  {
    id: "2",
    name: "Customer Segmentation",
    version: "v1.3",
    type: "K-Means Clustering",
    size: 8388608, // 8MB
    accuracy: 87.5,
    createdDate: "2024-01-10",
    lastUsed: "2024-01-20",
    status: "active",
    downloadCount: 8,
  },
  {
    id: "3",
    name: "Sales Forecasting",
    version: "v3.0",
    type: "LSTM Neural Network",
    size: 52428800, // 50MB
    accuracy: 89.7,
    createdDate: "2024-01-05",
    lastUsed: "2024-01-18",
    status: "active",
    downloadCount: 15,
  },
  {
    id: "4",
    name: "Churn Prediction",
    version: "v1.0",
    type: "Random Forest",
    size: 25165824, // 24MB
    accuracy: 82.3,
    createdDate: "2023-12-20",
    lastUsed: "2024-01-10",
    status: "archived",
    downloadCount: 5,
  },
  {
    id: "5",
    name: "Price Optimization",
    version: "v0.9",
    type: "Gradient Boosting",
    size: 18874368, // 18MB
    accuracy: 76.8,
    createdDate: "2023-12-15",
    lastUsed: "2023-12-25",
    status: "deprecated",
    downloadCount: 2,
  },
]

export function ModelManagement() {
  const [models, setModels] = useState<ModelFile[]>(mockModelFiles)
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getStatusColor = (status: ModelFile["status"]) => {
    switch (status) {
      case "active":
        return "bg-primary text-primary-foreground"
      case "archived":
        return "bg-yellow-500 text-white"
      case "deprecated":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusText = (status: ModelFile["status"]) => {
    switch (status) {
      case "active":
        return "Đang sử dụng"
      case "archived":
        return "Đã lưu trữ"
      case "deprecated":
        return "Không dùng nữa"
      default:
        return "Không xác định"
    }
  }

  const handleDownload = (model: ModelFile) => {
    // Simulate download
    console.log(`Downloading ${model.name} ${model.version}`)
    setModels((prev) => prev.map((m) => (m.id === model.id ? { ...m, downloadCount: m.downloadCount + 1 } : m)))
  }

  const handleArchive = (modelId: string) => {
    setModels((prev) => prev.map((m) => (m.id === modelId ? { ...m, status: "archived" } : m)))
  }

  const handleDelete = (modelId: string) => {
    setModels((prev) => prev.filter((m) => m.id !== modelId))
  }

  const toggleModelSelection = (modelId: string) => {
    setSelectedModels((prev) => (prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]))
  }

  const totalSize = models.reduce((sum, model) => sum + model.size, 0)
  const activeModels = models.filter((m) => m.status === "active").length
  const archivedModels = models.filter((m) => m.status === "archived").length

  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng dung lượng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold text-foreground">{formatFileSize(totalSize)}</span>
            </div>
            <Progress value={65} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">65% của 200MB được sử dụng</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Models đang dùng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">{activeModels}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Models hoạt động</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Models lưu trữ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Archive className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold text-foreground">{archivedModels}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Models đã lưu trữ</p>
          </CardContent>
        </Card>
      </div>

      {/* Model Files List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quản lý Model Files</CardTitle>
              <CardDescription>Tải xuống, lưu trữ và quản lý các model đã huấn luyện</CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedModels.length > 0 && (
                <>
                  <Button variant="outline" size="sm">
                    <Archive className="h-3 w-3 mr-1" />
                    Lưu trữ ({selectedModels.length})
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    Tải xuống
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {models.map((model) => (
              <div
                key={model.id}
                className={`p-4 border rounded-lg transition-colors ${
                  selectedModels.includes(model.id) ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model.id)}
                    onChange={() => toggleModelSelection(model.id)}
                    className="rounded"
                  />

                  <Brain className="h-8 w-8 text-primary" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{model.name}</h3>
                      <Badge variant="outline">{model.version}</Badge>
                      <Badge className={getStatusColor(model.status)}>{getStatusText(model.status)}</Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">{model.type}</p>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Kích thước:</span>
                        <p className="font-medium">{formatFileSize(model.size)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Độ chính xác:</span>
                        <p className="font-medium">{model.accuracy}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ngày tạo:</span>
                        <p className="font-medium">{model.createdDate}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sử dụng lần cuối:</span>
                        <p className="font-medium">{model.lastUsed}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lượt tải:</span>
                        <p className="font-medium">{model.downloadCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDownload(model)}>
                      <Download className="h-3 w-3 mr-1" />
                      Tải xuống
                    </Button>

                    {model.status === "active" && (
                      <Button size="sm" variant="outline">
                        <Play className="h-3 w-3 mr-1" />
                        Sử dụng
                      </Button>
                    )}

                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3 mr-1" />
                      Chi tiết
                    </Button>

                    {model.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => handleArchive(model.id)}>
                        <Archive className="h-3 w-3 mr-1" />
                        Lưu trữ
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive bg-transparent"
                      onClick={() => handleDelete(model.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Xóa
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
