"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, FileSpreadsheet, X, Download } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadDate: string
  status: "uploading" | "completed" | "error" | "processing"
  progress: number
  rows?: number
  columns?: number
}

export function FileUpload() {
  const [customerFile, setCustomerFile] = useState<File | null>(null)
  const [flightFile, setFlightFile] = useState<File | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    {
      id: "static-1",
      name: "sales_data_2024.xlsx",
      size: 2048576,
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      uploadDate: "2024-01-15", // Static date string instead of new Date()
      status: "completed",
      progress: 100,
      rows: 50000,
      columns: 12,
    },
    {
      id: "static-2",
      name: "customer_data.xlsx",
      size: 1536000,
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      uploadDate: "2024-01-20", // Static date string
      status: "completed",
      progress: 100,
      rows: 25000,
      columns: 8,
    },
  ])


  const [idCounter, setIdCounter] = useState(3)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        const newFile: UploadedFile = {
          id: `file-${idCounter}`, // Use counter instead of Date.now()
          name: file.name,
          size: file.size,
          type: file.type,
          uploadDate: "2024-01-28", // Static date string instead of new Date()
          status: "uploading",
          progress: 0,
        }

        setIdCounter((prev) => prev + 1)
        setUploadedFiles((prev) => [...prev, newFile])

        const interval = setInterval(() => {
          setUploadedFiles((prev) =>
            prev.map((f) => {
              if (f.id === newFile.id && f.progress < 100) {
                const progressIncrement = 15 + ((f.id.length * 3) % 10) // Deterministic increment
                const newProgress = Math.min(f.progress + progressIncrement, 100)
                return {
                  ...f,
                  progress: newProgress,
                  status: newProgress === 100 ? "processing" : "uploading",
                }
              }
              return f
            }),
          )
        }, 500)

        // Simulate processing completion
        setTimeout(() => {
          clearInterval(interval)
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === newFile.id
                ? {
                  ...f,
                  status: "completed",
                  progress: 100,
                  rows: 25000 + ((f.id.length * 1000) % 25000), // Deterministic values
                  columns: 8 + (f.id.length % 5), // Deterministic values
                }
                : f,
            ),
          )
        }, 3000)
      })
    },
    [idCounter],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getStatusColor = (status: UploadedFile["status"]) => {
    switch (status) {
      case "completed":
        return "bg-primary text-primary-foreground"
      case "uploading":
        return "bg-blue-500 text-white"
      case "processing":
        return "bg-yellow-500 text-white"
      case "error":
        return "bg-destructive text-destructive-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusText = (status: UploadedFile["status"]) => {
    switch (status) {
      case "completed":
        return "Hoàn thành"
      case "uploading":
        return "Đang tải lên"
      case "processing":
        return "Đang xử lý"
      case "error":
        return "Lỗi"
      default:
        return "Không xác định"
    }
  }


  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:8000/upload_excel", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    console.log("Uploaded response:", data);
  };

  const handleSave = async (type: "customers" | "weather" | "flights" | "dishes" | "ingredients") => {
    // Confirm
    const ok = confirm("Xác nhận lưu mô hình?");
    if (!ok) return;
    // Processing
    let file = null
    switch (type) {
      case "customers":
        file = customerFile
        break
      case "flights":
        file = flightFile
        break
    }

    if (!file) {
      alert("Chưa chọn file!");
      return;
    }
    try {
      // Chuẩn bị form data
      const formData = new FormData();
      formData.append("file", file!);
      formData.append("type", type);
      // Gọi API backend
      const res = await fetch("http://127.0.0.1:8000/files/save", {
        method: "POST",
        // headers: { "Content-Type": "application/json" },
        // headers: { "Content-Type": "application/octet-stream"},
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload thất bại: ${errorText}`);
      }

      const { status, message } = await res.json();

      if (status === "Success") {
        console.log(message);
        alert(`Đã lưu file ${type} thành công!`);
      } else {
        console.log(message);
        alert("Có lỗi xảy ra khi lưu mô hình");
      }

    } catch (err) {
      console.error("Lỗi khi lưu mô hình:", err);
      alert("Có lỗi xảy ra khi lưu mô hình");
    }
    finally {
      // setCustomerFile(null)
    }

  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: "customers" | "weather" | "flights" | "dishes" | "ingredients") => {
    const file = event.target.files?.[0]
    console.log('kjdfhnmbfjngv');

    if (
      file &&
      (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel")
    ) {
      switch (type) {
        case "customers":
          console.log('kjdfhnmbfjngv 1111', file);
          setCustomerFile(file)
          break
        case "flights":
          setFlightFile(file)
          break
      }
    } else {
      alert("Vui lòng chọn file Excel (.xlsx hoặc .xls)")
    }
  }
  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader className="flex justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Tải lên dữ liệu mới nhất <span className="text-red-500">*</span>
            </CardTitle>
            <CardDescription>Tải lên file Excel (.xlsx, .xls) hoặc CSV</CardDescription>
          </div>
          <Button onClick={() => handleSave("customers")}>Lưu vào CSDL</Button>
        </CardHeader>
        <CardContent>
          {/* <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-2 text-center cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-7 w-7 text-muted-foreground mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-primary font-medium">Thả file vào đây...</p>
            ) : (
              <div>
                <p className="text-foreground font-medium mb-2">Kéo thả file vào đây hoặc click để chọn</p>
                <p className="text-sm text-muted-foreground">Hỗ trợ: .xlsx, .xls, .csv (tối đa 10MB)</p>
              </div>
            )}
          </div> */}

          <div className="space-y-2">
            <Label htmlFor="excel-file-customers">Chọn file Excel dữ liệu khách hàng<span className="text-red-500">*</span></Label>
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
          </div>

        </CardContent>
      </Card>

      {/* Upload Dữ liệu chuyến bay */}
      <Card>
        <CardHeader className="flex justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Tải lên dữ liệu chuyến bay <span className="text-red-500">*</span>
            </CardTitle>
            <CardDescription>Tải lên file Excel (.xlsx, .xls) hoặc CSV </CardDescription>
          </div>
          <Button onClick={() => handleSave("flights")}>Lưu vào CSDL</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="excel-file-flights">Chọn file Excel dữ liệu chuyến bay<span className="text-red-500">*</span></Label>
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
          </div>
        </CardContent>
      </Card>
      {/* Upload thời tiết */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Tải lên dữ liệu thời tiết <span className="text-red-500">*</span>
          </CardTitle>
          <CardDescription>Tải lên file Excel (.xlsx, .xls) hoặc CSV để huấn luyện lại model</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-2 text-center cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-7 w-7 text-muted-foreground mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-primary font-medium">Thả file vào đây...</p>
            ) : (
              <div>
                <p className="text-foreground font-medium mb-2">Kéo thả file vào đây hoặc click để chọn</p>
                <p className="text-sm text-muted-foreground">Hỗ trợ: .xlsx, .xls, .csv (tối đa 10MB)</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card> */}

      {/* Uploaded Files List */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Danh sách file đã tải lên</CardTitle>
          <CardDescription>Quản lý các file dữ liệu đã upload</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <FileSpreadsheet className="h-8 w-8 text-green-500" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground truncate">{file.name}</p>
                    <Badge className={getStatusColor(file.status)}>{getStatusText(file.status)}</Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{file.uploadDate}</span>
                    {file.rows && file.columns && (
                      <span>
                        {file.rows.toLocaleString()} rows, {file.columns} columns
                      </span>
                    )}
                  </div>

                  {(file.status === "uploading" || file.status === "processing") && (
                    <div className="mt-2">
                      <Progress value={file.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {file.status === "uploading" ? "Đang tải lên" : "Đang xử lý"} {file.progress}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {file.status === "completed" && (
                    <>
                      <Button size="sm" variant="outline">
                        <Download className="h-3 w-3 mr-1" />
                        Tải xuống
                      </Button>
                      <Button size="sm" variant="outline">
                        Xem trước
                      </Button>
                      <Button size="sm">Huấn luyện Model</Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => removeFile(file.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {uploadedFiles.length === 0 && (
              <div className="text-center py-8">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Chưa có file nào được tải lên</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card> */}
    </div>
  )
}
