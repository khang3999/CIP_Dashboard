"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, LineChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, Tooltip, Line, Label } from "recharts"
import { useLoungeUsage, useFoodDistribution, useIngredientDistribution } from "@/contexts/app-provider"
import { useCallback, useEffect, useState } from "react"
// import { CustomParams } from "./prediction-controls"
// import { supabase } from "@/utils/supabase/client"
import { LoungageUsage, Timeslot } from "@/types"
import { generateTicks, getDateRangeOfPast } from "@/utils/utils"
import { supabase } from "@/utils/supabase/client"
import { useOverviewProvider } from "@/contexts/overview-context"
import { Divide } from "lucide-react"
// const presetRanges = [
//   {
//     id: 1,
//     count: 0,
//     presetRange: "Tất cả",
//     type: "date",
//     time_status: "current"
//   },
//   {
//     id: 2,
//     count: 1,
//     presetRange: "Hôm qua",
//     type: "date",
//     time_status: "past"
//   },
//   {
//     id: 3,
//     count: 1,
//     presetRange: "tuần trước",
//     type: "week",
//     time_status: "past"
//   },
//   {
//     id: 4,
//     count: 1,
//     presetRange: "tháng trước",
//     type: "month",
//     time_status: "past"
//   }
// ]

const COLORS = ["#059669", "#0891b2", "#7c3aed", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#2563eb"]
export function PassengerShiftChart({ params, selectedTimeslot }: { params?: any, selectedTimeslot?: Timeslot }) {
  // const { regions, stores, timeslots, selectedRegion, setSelectedRegion, selectedStore, setSelectedStore, selectedPresetRange, setSelectedPresetRange, selectedTimeslot, setSelectedTimeslot, getStoresForRegion, params } = useOverviewProvider()
  const [availableTimeslot, setAvailableTimeslot] = useState<Timeslot[]>([])
  const [loungeUsageData, setLoungeUsageData] = useState<LoungageUsage[]>([])

  // // Get yesterday's data by shifts
  // const yesterday = new Date()
  // yesterday.setDate(yesterday.getDate() - 1)
  // const yesterdayStr = yesterday.toISOString().split("T")[0]

  const getChartData = async (postgre_func_name: string, params: any) => {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    console.log(params, 'param');


    if (params.dateRange) {
      startDate = params.dateRange.from;
      endDate = params.dateRange.to;
    } else if (params.presetRange) {
      ({ startDate, endDate } = getDateRangeOfPast(params.presetRange));
    }

    const postgreParams = {
      p_region_id: params.region_id,
      p_store_id: params.store_id,
      p_timeslot_id: params.timeslot_id,
      p_start_date: startDate?.toLocaleDateString("en-CA"),
      p_end_date: endDate?.toLocaleDateString("en-CA")
    }
    console.log(postgreParams);
    // Func
    //     create or replace function get_lounge_usage_customers (
    //   p_region_id integer,
    //   p_store_id integer,
    //   p_timeslot_id integer,
    //   p_start_date date,
    //   p_end_date date
    // ) returns table (
    //   id int,
    //   timeslot_id int,
    //   total_customers int
    // ) language sql as $$
    //   select c.id as id, c.timeslot_id, c.total_customers
    //   from cip_customer_statistics as c
    //   where (p_region_id is null or c.region_id = p_region_id)
    //     and (p_store_id is null or c.store_id = p_store_id)
    //     and (p_timeslot_id is null or c.timeslot_id = p_timeslot_id)
    //     and (p_start_date is null or c.date >= p_start_date)
    //     and (p_end_date is null or c.date <= p_end_date)
    //   order by c.date
    //   limit 5;
    // $$;

    try {
      const { data, error } = await supabase.rpc(postgre_func_name, postgreParams)
      if (error) throw error
      console.log(data, "test");
      setLoungeUsageData(data)
    } catch (err) {
      console.error("Error fetching chart data:", err)
      setLoungeUsageData([])
    }
  }
  // console.log(selectedTimeslot, "called");

  // Khi thời gian và ca thay đổi thì gọi hàm tính lại data biểu đồ
  useEffect(() => {
    console.log(selectedTimeslot, "called");
    if (!selectedTimeslot) return
    const postgre_func_name = 'get_lounge_usage_customers'
    getChartData(postgre_func_name, params)
  }, [selectedTimeslot])


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = new Date(label);
      // const labelStr = params?.presetRange?.time_status === 'today'
      //   ? `${d.getMonth() + 1}/${d.getFullYear()}`
      //   : `${d.getDate()}/${d.getMonth() + 1}`;
      const labelStr = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
      return (
        <div className="tooltip bg-white rounded-lg px-1.5 py-1.5 shadow-md shadow-gray-400">
          <p>{`${labelStr}`}</p>
          <p>{`Số khách: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Số lượng khách</CardTitle>
        <CardDescription>Thống kê lượng khách sử dụng phòng chờ {selectedTimeslot?.timeslot}</CardDescription>
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
            {loungeUsageData.length != 0 ?
              <LineChart data={loungeUsageData} margin={{ top: 15, bottom: 15}}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  {...(params?.presetRange?.time_status === 'today' && { ticks: generateTicks(loungeUsageData, params) })}
                  // ticks={generateTicks(loungeUsageData, params)}
                  padding={{ left: 30, right: 30 }}
                  // interval={0}
                  tickFormatter={(str) => {
                    const d = new Date(str);
                    return params?.presetRange?.time_status === 'today'
                      ? `${d.getMonth() + 1}/${d.getFullYear()}`  // hiển thị tháng
                      : `${d.getDate()}/${d.getMonth() + 1}`;     // hiển thị ngày
                    // if (params?.presetRange?.time_status === 'today') {
                    //   return `${d.getMonth() + 1}`;
                    // }
                    // return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                >
                  <Label value={params?.presetRange?.time_status === 'today' ? "Tháng" : "Ngày"} position="insideBottomRight"  dx={5} dy={5} />
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
    </Card>)
}

export function FoodDistributionChart() {
  const { foodDistribution } = useFoodDistribution()

  // Aggregate food data
  const foodData = foodDistribution.reduce(
    (acc, item) => {
      const existing = acc.find((f) => f.name === item.foodType)
      if (existing) {
        existing.value += item.quantity
      } else {
        acc.push({ name: item.foodType, value: item.quantity })
      }
      return acc
    },
    [] as { name: string; value: number }[],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phân bổ món ăn</CardTitle>
        <CardDescription>Tỷ lệ các món ăn được phục vụ</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            food: {
              label: "Món ăn",
              color: "hsl(var(--chart-2))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={foodData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {foodData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function IngredientDistributionChart() {
  const { ingredientDistribution } = useIngredientDistribution()

  // Aggregate ingredient data
  const ingredientData = ingredientDistribution.reduce(
    (acc, item) => {
      const existing = acc.find((i) => i.name === item.ingredient)
      if (existing) {
        existing.value += item.quantity
      } else {
        acc.push({ name: item.ingredient, value: item.quantity })
      }
      return acc
    },
    [] as { name: string; value: number }[],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phân bổ nguyên liệu</CardTitle>
        <CardDescription>Tỷ lệ sử dụng các nguyên liệu</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            ingredient: {
              label: "Nguyên liệu",
              color: "hsl(var(--chart-3))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ingredientData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {ingredientData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
