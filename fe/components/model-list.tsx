"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, Play, Pause, Trash2, Eye, RefreshCw, Upload, FileSpreadsheet, MapPin, Save, SaveAll, Check } from "lucide-react"
import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { useAppProvider } from "@/contexts/app-provider"
import { Model, Region } from "@/types"
import { set } from "date-fns"
import { formatTimestampVN, removeVietnameseTones } from "@/utils/utils"
import { supabase } from "@/utils/supabase/client"




const mockModels: Model[] = [
  // {
  //   id: "1",
  //   name: "Revenue Prediction Model",
  //   type: "XGBoost Regressor",
  //   status: "using",
  //   accuracy: 96.8,
  //   training_progress: 100,
  //   created_at: "2024-01-15",
  //   training_time: "1h 45m",
  //   data_size: "50,000 records",
  //   version: "v2.1",
  //   // rmse: 0.123
  // },
  // {
  //   id: "2",
  //   name: "Customer Segmentation",
  //   type: "K-Means Clustering",
  //   status: "training",
  //   accuracy: 0,
  //   trainingProgress: 67,
  //   createdAt: "2024-01-20",
  //   trainingTime: "1h 12m",
  //   dataSize: "25,000 records",
  //   version: "v1.3",
  // },
  // {
  //   id: "3",
  //   name: "Sales Forecasting",
  //   type: "XGBoost Classifier",
  //   status: "completed",
  //   accuracy: 92.4,
  //   trainingProgress: 100,
  //   createdAt: "2024-01-10",
  //   trainingTime: "2h 15m",
  //   dataSize: "100,000 records",
  //   version: "v3.0",
  // },
  // {
  //   id: "4",
  //   name: "Churn Prediction",
  //   type: "XGBoost Classifier",
  //   status: "failed",
  //   accuracy: 0,
  //   trainingProgress: 45,
  //   createdAt: "2024-01-18",
  //   trainingTime: "0h 45m",
  //   dataSize: "30,000 records",
  //   version: "v1.0",
  // },
  // {
  //   id: "5",
  //   name: "Store Performance Prediction",
  //   type: "XGBoost Regressor",
  //   status: "completed",
  //   accuracy: 94.7,
  //   trainingProgress: 100,
  //   createdAt: "2024-01-22",
  //   trainingTime: "1h 28m",
  //   dataSize: "75,000 records",
  //   version: "v1.2",
  // },
  // {
  //   id: "6",
  //   name: "Regional Sales Forecast",
  //   type: "XGBoost Ensemble",
  //   status: "training",
  //   accuracy: 0,
  //   trainingProgress: 82,
  //   createdAt: "2024-01-25",
  //   trainingTime: "2h 05m",
  //   dataSize: "120,000 records",
  //   version: "v1.0",
  // },
]

interface ModelListProps {
  onSelectModel: (model: Model) => void
  selectedModel: Model | null
}

export function ModelList({ onSelectModel, selectedModel }: ModelListProps) {
  const [retrainDialogOpen, setRetrainDialogOpen] = useState(false)
  const [createNewModelDialogOpen, setCreateNewModelDialogOpen] = useState(false)
  const [addExistingDialogOpen, setAddExistingDialogOpen] = useState(false)
  const [selectedModelForRetrain, setSelectedModelForRetrain] = useState<Model | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<{
    customers?: File;
    weather?: File;
    flights?: File;
  }>({});
  const [modelName, setModelName] = useState<string>("");
  const [uploadedModel, setUploadedModel] = useState<File | null>(null);
  const [isRetraining, setIsRetraining] = useState(false)
  const [createNewModelParams, setCreateNewModelParams] = useState<{
    region_id?: number;
    customers?: File;
    weather?: File;
    flights?: File;
    dishes?: File;
    ingredients?: File;
  }>({ customers: undefined, weather: undefined, flights: undefined, dishes: undefined, ingredients: undefined });

  const { regions } = useAppProvider()
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const { modelsList, setModelsList } = useAppProvider()

  const getStatusColor = (status: Model["status"]) => {
    switch (status) {
      case "completed":
      case "using":
        return "bg-primary text-primary-foreground"
      case "training":
        return "bg-blue-500 text-white"
      case "failed":
        return "bg-destructive text-destructive-foreground"
      case "paused":
        return "bg-yellow-500 text-white"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusText = (status: Model["status"]) => {
    switch (status) {
      case "completed":
        return "Hoàn thành"
      case "training":
        return "Đang huấn luyện"
      case "failed":
        return "Thất bại"
      case "paused":
        return "Tạm dừng"
      case "using":
        return "Đang sử dụng"
      default:
        return "Không xác định"
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: "customers" | "weather" | "flights" | "dishes" | "ingredients") => {
    const file = event.target.files?.[0]
    if (
      file &&
      (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel")
    ) {
      setCreateNewModelParams((prev) => ({
        ...prev,
        [type]: file,
      }));
    } else {
      alert("Vui lòng chọn file Excel (.xlsx hoặc .xls)")
    }
  }

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.name.toLowerCase().endsWith(".pkl")) {
      setUploadedModel(file);
    } else {
      alert("Vui lòng chọn file model (.pkl)");
    }
  };
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const safeValue = removeVietnameseTones(value);
    setModelName(safeValue);
  };
  const handleRetrain = async () => {
    if (!uploadedFiles || !selectedModelForRetrain) return

    setIsRetraining(true)
    // Simulate retrain process
    // setTimeout(() => {
    //   setIsRetraining(false)
    //   setRetrainDialogOpen(false)
    //   setUploadedFiles(null)
    //   setSelectedModelForRetrain(null)
    //   alert(`Model "${selectedModelForRetrain.name}" đã bắt đầu quá trình retrain với file ${uploadedFile.name}`)
    // }, 2000)
  }

  const handleCreateNewModel = async () => {
    if (!createNewModelParams || !selectedRegion) {
      console.log("Thiếu thông tin để tạo mô hình mới");
      return
    }
    console.log("Gởi qua back end");
    // Call API to create new model
  }

  const openRetrainDialog = (model: Model) => {
    setSelectedModelForRetrain(model)
    setRetrainDialogOpen(true)
  }

  const openCreateNewModelDialog = () => {
    setCreateNewModelDialogOpen(true)
  }

  const handleCancelExistingModel = () => {
    setModelName("");
    handleSelectedRegion("-1");
    setUploadedModel(null);
    setAddExistingDialogOpen(false);
  }

  const handleSaveExistingModel = async () => {
    if (!modelName || !selectedRegion || !uploadedModel) {
      alert("Thiếu thông tin để lưu mô hình. Vui lòng điền đầy đủ thông tin trước khi lưu mô hình.");
      console.log("Thiếu thông tin để lưu mô hình có sẵn");
      return;
    }
    // Confirm
    const ok = confirm("Xác nhận lưu mô hình?");
    if (!ok) return;
    try {

      // Chuẩn bị form data
      const formData = new FormData();
      formData.append("file", uploadedModel);
      formData.append("model_name", modelName);
      formData.append("region_id", selectedRegion.id.toString());

      // Gọi API backend
      const res = await fetch("http://127.0.0.1:8000/models/save", {
        method: "POST",
        // headers: { "Content-Type": "application/json" },
        // headers: { "Content-Type": "application/octet-stream" },
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload thất bại: ${errorText}`);
      }

      const data = await res.json();
      if (data.status === "success") {
        console.log("Upload thành công:", data);
        alert("Mô hình đã được lưu thành công!");
        setModelName("");
        handleSelectedRegion("-1");
        setUploadedModel(null);

      } else {
        console.log("Upload thất bại:", data);
        alert("Có lỗi xảy ra khi lưu mô hình");
      }

    } catch (err) {
      console.error("Lỗi khi lưu mô hình:", err);
      alert("Có lỗi xảy ra khi lưu mô hình");
    }
    finally {
      try {
        // 3. Lấy lại danh sách model mới nhất
        const { data, error } = await supabase.from("cip_models").select("*");
        if (error) throw error;

        setModelsList(data || []);
        setAddExistingDialogOpen(false);
      }
      catch (err) {
        console.error("Error loading models:", err);
        alert("Có lỗi xảy ra khi tải lại các mô hình.");
      }
    }
  }


  const handleDeleteModel = async (model: Model) => {
    if (model.status === "using") {
      alert("Không thể xóa mô hình đang được sử dụng.")
      return
    }
    const ok = confirm(`Xác nhận xóa mô hình "${model.name}"? Hành động này không thể hoàn tác.`)
    if (!ok) return

    // Call API to delete model
    try {
      const res = await fetch("http://127.0.0.1:8000/models/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_id: model.id, file_path: model.file_path }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Xóa mô hình thất bại: ${errorText}`);
      }

      const data = await res.json();
      if (data.status === "success") {
        console.log("Xóa thành công:", data);
        alert(data.message || "Mô hình đã được xóa thành công!");



      } else {
        console.log("Xóa thất bại:", data);
        alert("Có lỗi xảy ra khi xóa model và file");
      }
    } catch (err) {
      console.error("Error deleting model:", err);
      alert("Có lỗi xảy ra khi xóa model.");
    }
    finally {
      try {
        // 3. Lấy lại danh sách model mới nhất
        const { data, error } = await supabase.from("cip_models").select("*");
        if (error) throw error;

        setModelsList(data || []);
      }
      catch (err) {
        console.error("Error loading models:", err);
        alert("Có lỗi xảy ra khi tải lại các mô hình.");
      }
    }
  }

  const handleSelectedRegion = (regionId: string) => {
    const region = regions.find((r) => r.id === Number.parseInt(regionId))
    setSelectedRegion(region || null)
    // setCreateNewModelParams((prev) => ({ ...prev, region_id: Number.parseInt(regionId) }));
  }

  const handleSetUsing = async (model: Model) => {
    if (model.status !== "completed") {
      alert("Chỉ có thể chọn mô hình với trạng thái 'Hoàn thành'")
      return
    }
    const ok = confirm(`Xác nhận chọn mô hình "${model.name}" để sử dụng?`)
    if (!ok) return

    try {
      // 1. Chuyển tất cả model cùng region_id sang 'completed'
      let { error: error1 } = await supabase
        .from("cip_models")
        .update({ status: "completed" })
        .eq("region_id", model.region_id);
      if (error1) throw error1;

      // 2. Chọn model hiện tại sang 'using'
      let { error: error2 } = await supabase
        .from("cip_models")
        .update({ status: "using" })
        .eq("id", model.id);
      if (error2) throw error2;

      // 3. Lấy lại danh sách model mới nhất
      const { data, error } = await supabase.from("cip_models").select("*");
      if (error) throw error;

      setModelsList(data || []);
    } catch (err) {
      console.error("Error updating models:", err);
      alert("Có lỗi xảy ra khi cập nhật model.");
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Danh sách Models
        </CardTitle>
        <CardDescription>Quản lý và theo dõi các machine learning models</CardDescription>
        <div className="flex justify-between">
          {/* <div>
            <Button variant="outline" onClick={() => setCreateNewModelDialogOpen(true)}>
              Huấn luyện mô hình mới
            </Button>
          </div> */}
          <div>
            <Button variant="outline" onClick={() => setAddExistingDialogOpen(true)}>
              Tải mô hình có sẵn
            </Button>
          </div>
        </div>

      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {modelsList.map((model) => (
            <div
              key={model.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedModel?.id === model.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              onClick={() => onSelectModel(model)}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{model.name}</h3>
                  <p className="text-sm text-muted-foreground">{model.type}</p>
                  {/* <p className="text-sm text-muted-foreground">{model.file_path}</p> */}
                </div>
                <div className="flex items-center gap-2">
                  {model.status === "using" &&
                    // <Button size="sm" variant="outline" className="hover:cursor-pointer" onClick={() => handleSetUsing(model)}>
                    //   Chọn dùng
                    // </Button>
                    <Badge className={model.region_id === 1 ? "bg-amber-200 text-foreground" : "bg-emerald-200 text-foreground"} variant="outline">{regions.find(r => r.id === model.region_id)?.name}</Badge>
                  }
                  <Badge className={getStatusColor(model.status)}>{getStatusText(model.status)}</Badge>
                  <Badge variant="outline">v{Number.parseFloat(model.version).toFixed(1)}</Badge>
                </div>
              </div>

              {/* {model.status === "training" && (
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Tiến độ huấn luyện</span>
                    <span>{model.trainingProgress}%</span>
                  </div>
                  <Progress value={model.trainingProgress} className="h-2" />
                </div>
              )} */}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {/* <div>
                  <span className="text-muted-foreground">Độ chính xác:</span>
                  <p className="font-medium">{model.accuracy > 0 ? `${model.accuracy}%` : "Chưa có"}</p>
                </div> */}
                {/* <div>
                  <span className="text-muted-foreground">Thời gian:</span>
                  <p className="font-medium">{model.trainingTime}</p>
                </div> */}
                {/* <div>
                  <span className="text-muted-foreground">Dữ liệu:</span>
                  <p className="font-medium">{model.dataSize}</p>
                </div> */}
                <div>
                  <span className="text-muted-foreground">Ngày tạo:</span>
                  <p className="font-medium">{formatTimestampVN(model.created_at)}</p>
                  {/* <p className="font-medium"> {new Date(model.created_at).toLocaleTimeString("vi-VN")}</p> */}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-3">
                {/* {model.status === "training" && (
                  <Button size="sm" variant="outline">
                    <Pause className="h-3 w-3 mr-1" />
                    Tạm dừng
                  </Button>
                )}
                {model.status === "paused" && (
                  <Button size="sm" variant="outline">
                    <Play className="h-3 w-3 mr-1" />
                    Tiếp tục
                  </Button>
                )}
                {model.status === "completed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      openRetrainDialog(model)
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retrain
                  </Button>
                )} */}

                {model.status === "completed" &&
                  <Button size="sm" variant="outline" className="hover:cursor-pointer" onClick={() => handleSetUsing(model)}>
                    Chọn dùng
                  </Button>
                }
                <Button size="sm" variant="outline">
                  <Eye className="h-3 w-3 mr-1" />
                  Chi tiết
                </Button>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive bg-transparent" onClick={() => handleDeleteModel(model)}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Xóa
                </Button>
              </div>
            </div>
          ))}
        </div>


        {/* Retrain dialog */}
        <Dialog open={retrainDialogOpen} onOpenChange={setRetrainDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Model</DialogTitle>
              <DialogDescription>
                Upload file Excel để update model "{selectedModelForRetrain?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* File flights */}
              <div className="space-y-2">
                <Label htmlFor="excel-file-flights">Chọn file Excel dữ liệu chuyến bay <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="excel-file-flights"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => handleFileUpload(event, "flights")}
                    className="cursor-pointer"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {uploadedFiles.flights && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{uploadedFiles.flights.name}</span>
                    <span>({(uploadedFiles.flights.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>
              {/* File lounge usage */}
              <div className="space-y-2">
                <Label htmlFor="excel-file-customers">Chọn file Excel dữ liệu hành khách sử dụng phòng chờ <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="excel-file-customers"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => handleFileUpload(event, "customers")}
                    className="cursor-pointer"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {uploadedFiles.customers && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{uploadedFiles.customers.name}</span>
                    <span>({(uploadedFiles.customers.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>
              {/* File weather */}
              <div className="space-y-2">
                <Label htmlFor="excel-file-weather">Chọn file Excel dữ liệu thời tiết <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="excel-file-weather"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => handleFileUpload(event, "weather")}
                    className="cursor-pointer"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {uploadedFiles.weather && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{uploadedFiles.weather.name}</span>
                    <span>({(uploadedFiles.weather.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRetrainDialogOpen(false)} disabled={isRetraining}>
                  Hủy
                </Button>
                <Button onClick={handleRetrain} disabled={!uploadedFiles || isRetraining}>
                  {isRetraining ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Đang retrain...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Bắt đầu Retrain
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create new model */}
        {/* <Dialog open={createNewModelDialogOpen} onOpenChange={setCreateNewModelDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Huấn luyện mô hình mới</DialogTitle>
              <DialogDescription>
                Upload file Excel để huấn luyện mô hình
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">

              <Label htmlFor="model-type" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Chọn khu vực <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedRegion?.id.toString()} onValueChange={handleSelectedRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khu vực" />
                </SelectTrigger>
                <SelectContent id="model-type">
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id.toString()}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <Label htmlFor="excel-file-flights">Chọn file Excel dữ liệu chuyến bay <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="excel-file-flights"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => handleFileUpload(event, "flights")}
                    className="cursor-pointer"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {uploadedFiles.flights && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{uploadedFiles.flights.name}</span>
                    <span>({(uploadedFiles.flights.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="excel-file-weather">Chọn file Excel dữ liệu thời tiết <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="excel-file-weather"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => handleFileUpload(event, "weather")}
                    className="cursor-pointer"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {uploadedFiles.weather && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{uploadedFiles.weather.name}</span>
                    <span>({(uploadedFiles.weather.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="excel-file-customers">Chọn file Excel dữ liệu hành khách sử dụng phòng chờ <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="excel-file-customers"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => handleFileUpload(event, "customers")}
                    className="cursor-pointer"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {uploadedFiles.customers && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{uploadedFiles.customers.name}</span>
                    <span>({(uploadedFiles.customers.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="excel-file-dishes">Chọn file Excel dữ liệu món ăn <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="excel-file-dishes"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => handleFileUpload(event, "dishes")}
                    className="cursor-pointer"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {uploadedFiles.weather && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{uploadedFiles.weather.name}</span>
                    <span>({(uploadedFiles.weather.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="excel-file-ingredients">Chọn file Excel dữ liệu nguyên liệu <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="excel-file-ingredients"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => handleFileUpload(event, "ingredients")}
                    className="cursor-pointer"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {uploadedFiles.weather && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{uploadedFiles.weather.name}</span>
                    <span>({(uploadedFiles.weather.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>


              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateNewModelDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreateNewModel} disabled={!createNewModelParams}>
                  Bắt đầu Train mô hình
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog> */}

        {/* Add existing dialog */}
        <Dialog open={addExistingDialogOpen} onOpenChange={setAddExistingDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Thêm mô hình có sẵn</DialogTitle>
              {/* <DialogDescription>
                Upload file model "{selectedModelForRetrain?.name}"
              </DialogDescription> */}
            </DialogHeader>
            <div className="space-y-4">
              {/* Tên mô hình */}
              <div className="space-y-2">
                <Label htmlFor="model-name">Tên mô hình<span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="model-name"
                    type="text"
                    value={modelName}
                    onChange={(event) => handleTextChange(event)}
                    // className="cursor-pointer"
                    placeholder="Nhập tên mô hình (không dâu tiếng Việt)"
                  />
                  {/* <Upload className="h-4 w-4 text-muted-foreground" /> */}
                </div>
                {/* {uploadedFiles.customers && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{uploadedFiles.customers.name}</span>
                    <span>({(uploadedFiles.customers.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )} */}
              </div>
              <div className="space-y-2">
                {/* Chọn khu vực */}
                <Label htmlFor="model-name">Chọn khu vực<span className="text-red-500">*</span></Label>
                <Select value={selectedRegion?.id.toString()} onValueChange={handleSelectedRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn khu vực" />
                  </SelectTrigger>
                  <SelectContent id="model-type">
                    {regions.map((region) => (
                      <SelectItem key={region.id} value={region.id.toString()}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* File model */}
              <div className="space-y-2">
                <Label htmlFor="model-file">Chọn file model<span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="model-file"
                    type="file"
                    accept=".pkl, pickle"
                    onChange={(event) => handleModelUpload(event)}
                    className="cursor-pointer"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {uploadedModel && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{uploadedModel.name}</span>
                    <span>({(uploadedModel.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelExistingModel}>
                  Hủy
                </Button>
                <Button onClick={handleSaveExistingModel}>
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    {/* <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> */}
                    Lưu mô hình
                  </>
                  {/* {isRetraining ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Đang retrain...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Lưu mô hình
                    </>
                  )} */}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card >
  )
}
