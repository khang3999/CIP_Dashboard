import React from 'react'
import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, FileSpreadsheet, X, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
interface UploadCardProps {
  type: string;
  title?: string;
  description?: string;
  label?: string;
  inputId?: string;
  accept?: string;
  required?: boolean;
  onFileChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSave?: () => void;
}
function CardUpload({
  type,
  title,
  description,
  label,
  inputId,
  accept = ".xlsx,.xls",
  required = false,
  onFileChange,
  onSave,
}: UploadCardProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="flex justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Tải lên dữ liệu mới nhất {title} <span className="text-red-500">*</span>
          </CardTitle>
          <CardDescription>Tải lên file Excel (.xlsx, .xls)</CardDescription>
        </div>
        <Button onClick={onSave}>Lưu vào CSDL</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor={type}>Chọn file Excel dữ liệu<span className="text-red-500">*</span></Label>
          <div className="flex items-center gap-2">
            <Input
              id={type}
              type="file"
              accept={accept}
              onChange={onFileChange}
              className="cursor-pointer"
            />
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CardUpload