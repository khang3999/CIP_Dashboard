"use client"

import { useEffect, useState } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
// import { ThemeProvider } from "@/contexts/theme-provider"
import { AppProvider } from "@/contexts/app-provider"
import { SimpleSelector } from "@/components/simple-selector"
import {
  PassengerShiftChart,
  FoodDistributionChart,
  IngredientDistributionChart,
} from "@/components/simple-charts"
import { PredictionControls } from "@/components/prediction-controls"
import { ModelList } from "@/components/model-list"
import { FileUpload } from "@/components/file-upload"
import { PredictionParams } from "@/types"
import OverviewProvider, { useOverviewProvider } from "@/contexts/overview-context"
import PredictionProvider, { usePredictionProvider } from "@/contexts/prediction-context"
import { formatDate, generateTicks, getDateRangeOfFuture } from "@/utils/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, LineChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, Tooltip, Line, Label } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"


function OverviewSection() {
  const { params, selectedTimeslot } = useOverviewProvider()
  return (
    // <OverviewProvider>
    <div className="space-y-6">
      <SimpleSelector />
      <div>
        <PassengerShiftChart params={params} selectedTimeslot={selectedTimeslot || undefined} />
      </div>
      <div>
        <FoodDistributionChart />
      </div>
      <div>
        <IngredientDistributionChart />
      </div>
    </div>
    // </OverviewProvider>

  )
}

function PredictionsSection() {
  // const [predictionParams, setPredictionParams] = useState<PredictionParams | null>(null)
  const { predictionParams, setPredictionParams, selectedTimeslot } = usePredictionProvider()
  const [isLoading, setIsLoading] = useState(false)
  const [resultPredict, setResultPredict] = useState<any[] | null>([])

  const handlePredict = async (predictionParams: PredictionParams | null) => {

    if (!predictionParams) {
      console.log("Params is null");
      return
    }
    console.log("here");
    // setIsLoading(true)
    // await new Promise((resolve) => setTimeout(resolve, 2000))
    setPredictionParams(predictionParams)
    let startDate, endDate
    if (predictionParams.presetRange) {
      ({ startDate, endDate } = getDateRangeOfFuture(predictionParams.presetRange))
      console.log(startDate, endDate, 'date');
    } else if (predictionParams.dateRange) {

      startDate = formatDate(predictionParams.dateRange.from!)
      endDate = formatDate(predictionParams.dateRange.to!)
    }
    // startDate = startDate?.toString().slice(0, 10)
    // endDate = endDate?.toString().slice(0, 10)
    console.log(startDate, 'start');
    console.log(endDate, 'end');

    // Call API để lấy dữ liệu dự đoán ở đây
    const res = await fetch("http://127.0.0.1:8000/predicts/", {
      method: "POST",
      headers: { "Content-Type": "application/json", },
      body: JSON.stringify({
        region_id: predictionParams.region_id,
        store_id: predictionParams.store_id,
        timeslot_id: predictionParams.timeslot_id,
        start_date: startDate ? startDate : null,
        end_date: endDate ? endDate : null,
      }),
    });
    const { data } = await res.json()
    console.log(startDate);
    console.log(data);
    setResultPredict(data)
    setIsLoading(false)
  }

  useEffect(() => {
    if (!predictionParams) return
    setResultPredict(null)
  }, [predictionParams])

  return (
    // <PredictionProvider>
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PredictionControls onPredict={handlePredict} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-2">
          {resultPredict ? (
            <Card>
              <CardHeader>
                <CardTitle>Số lượng khách</CardTitle>
                <CardDescription>Dự đoán lượng khách sử dụng phòng chờ {selectedTimeslot?.timeslot}</CardDescription>
              </CardHeader>

              <CardContent className="flex justify-center">
                <ChartContainer
                  config={{
                    total_customers: {
                      label: "Số khách",
                      color: "hsl(var(--chart-1))",

                    },
                  }}
                  className="w-[80%] px-5 z-10"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    {/* <BarChart data={availableTimeslot}>
              <XAxis dataKey="shift" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="passengers" fill="#059669" />
            </BarChart> */}
                    {resultPredict?.length != 0 ?
                      <LineChart data={resultPredict!} margin={{ top: 15, bottom: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          {...(predictionParams?.presetRange?.time_status === 'today' && { ticks: generateTicks(resultPredict, predictionParams) })}
                          // ticks={generateTicks(loungeUsageData, params)}
                          padding={{ left: 30, right: 30 }}
                          // interval={0}
                          tickFormatter={(str) => {
                            const d = new Date(str);
                            return predictionParams?.presetRange?.time_status === 'today'
                              ? `${d.getMonth() + 1}/${d.getFullYear()}`  // hiển thị tháng
                              : `${d.getDate()}/${d.getMonth() + 1}`;     // hiển thị ngày
                            // if (params?.presetRange?.time_status === 'today') {
                            //   return `${d.getMonth() + 1}`;
                            // }
                            // return `${d.getDate()}/${d.getMonth() + 1}`;
                          }}
                        >
                          <Label value={predictionParams?.presetRange?.time_status === 'today' ? "Tháng" : "Ngày"} position="insideBottomRight" dx={5} dy={5} />
                        </XAxis>
                        <YAxis>
                          <Label value="Số khách" angle={0} position="insideTopLeft" dy={-20} />
                        </YAxis>
                        {/* <Tooltip content={<CustomTooltip />}></Tooltip> */}
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="total_customers" stroke="#8884d8" strokeWidth={2} dot={false} />
                      </LineChart>
                      :
                      <CardDescription className="text-center text-3xl">Không có dữ liệu</CardDescription>

                    }
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-card p-6 rounded-lg border border-border text-center">
              <p className="text-muted-foreground">Chọn tham số và nhấn "Tạo dự đoán" để xem kết quả</p>
            </div>
          )}
        </div>
      </div>

      {predictionParams && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* <PassengerShiftChart params={predictionParams} selectedTimeslot={selectedTimeslot || undefined} /> */}

          <FoodDistributionChart />
          <IngredientDistributionChart />
        </div>
      )}
    </div>
    // </PredictionProvider>
  )
}

function TrainingSection() {
  return (
    <div className="space-y-6">
      <ModelList onSelectModel={() => { }} selectedModel={null} />
    </div>
  )
}

function UploadSection() {
  return (
    <div className="space-y-6">
      <FileUpload />
    </div>
  )
}

function SettingsSection() {
  return (
    <div className="bg-card p-6 rounded-lg border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">Cài đặt</h3>
      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Settings sẽ được hiển thị ở đây</p>
      </div>
    </div>
  )
}

const sectionTitles = {
  overview: "Tổng quan Dashboard",
  predictions: "Dự đoán AI",
  training: "Huấn luyện Model",
  upload: "Tải lên dữ liệu",
  settings: "Cài đặt hệ thống",
}

const sectionSubtitles = {
  overview: "Thống kê lịch sử: số khách theo ca, phân bổ món ăn và nguyên liệu",
  predictions: "Dự đoán xu hướng với 3 biểu đồ tương tự phần tổng quan",
  training: "Huấn luyện và quản lý các mô hình XGBoost",
  upload: "Tải lên file Excel để retrain model",
  settings: "Cấu hình và tùy chỉnh hệ thống",
}

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("overview")

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <OverviewProvider>
            <OverviewSection />
          </OverviewProvider>
        )
      case "predictions":
        return (
          <PredictionProvider>
            <PredictionsSection />
          </PredictionProvider>)
      case "training":
        return <TrainingSection />
      case "upload":
        return <UploadSection />
      case "settings":
        return <SettingsSection />
      default:
        return <OverviewSection />
    }
  }

  return (
    // <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <AppProvider>
      <div className="flex h-screen bg-background">
        <DashboardSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

        <main className="flex-1 overflow-auto p-6">
          <DashboardHeader
            title={sectionTitles[activeSection as keyof typeof sectionTitles]}
            subtitle={sectionSubtitles[activeSection as keyof typeof sectionSubtitles]}
          />

          {renderSection()}
        </main>
      </div>
    </AppProvider>
    // </ThemeProvider>
  )
}
