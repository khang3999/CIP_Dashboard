"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, LineChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, Tooltip, Line, Label, Legend, ComposedChart } from "recharts"
import { useLoungeUsage, useFoodDistribution, useIngredientDistribution } from "@/contexts/app-provider"
import { useCallback, useEffect, useRef, useState } from "react"
// import { CustomParams } from "./prediction-controls"
// import { supabase } from "@/utils/supabase/client"
import { FoodDistribution, Ingredient, IngredientDistribution, LoungageUsage, OveriewParams, PredictionParams, Timeslot } from "@/types"
import { generateTicks, getDateRangeOfPast, getRandomColor } from "@/utils/utils"
import { supabase } from "@/utils/supabase/client"
import { useOverviewProvider } from "@/contexts/overview-context"

const COLORS = ["#059669", "#0891b2", "#7c3aed", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#2563eb"]
export function PassengerShiftChart({ params }: { params?: OveriewParams | null }) {
  const [loungeUsageData, setLoungeUsageData] = useState<LoungageUsage[]>([])

  const getChartData = async (postgre_func_name: string, params: any) => {
    let startDate: Date | string | undefined;
    let endDate: Date | string | undefined;


    if (params.dateRange) {
      startDate = params.dateRange.from;
      endDate = params.dateRange.to;
    } else if (params.presetRange) {
      const res = getDateRangeOfPast(params.presetRange);
      startDate = res.startDate
      endDate = res.endDate
    }

    const postgreParams = {
      p_region_id: params.region_id,
      p_store_id: params.store_id,
      p_timeslot_id: params.timeslot_id,
      p_start_date: startDate,
      p_end_date: endDate
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
  // Khi thời gian và ca thay đổi thì gọi hàm tính lại data biểu đồ
  useEffect(() => {
    if (!params?.timeslot_id) return
    const postgre_func_name = 'get_lounge_usage_customers'
    getChartData(postgre_func_name, params)
  }, [params?.timeslot_id])


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
        <CardTitle>Lượng khách</CardTitle>
        <CardDescription>Thống kê lượng khách sử dụng phòng chờ</CardDescription>
      </CardHeader>

      <CardContent className="flex justify-center">
        <ChartContainer
          config={{
            total_customers: {
              label: "Số khách",
              color: "hsl(var(--chart-1))",
            },
          }}
          className="h-[450px] px-5 z-10"
        >
          <ResponsiveContainer width="100%" height="100%">
            {loungeUsageData.length != 0 ?
              <LineChart data={loungeUsageData} margin={{ top: 15, bottom: 15 }}>
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
                  <Label value={params?.presetRange?.time_status === 'today' ? "Tháng" : "Ngày"} position="insideBottomRight" dx={5} dy={5} />
                </XAxis>
                <YAxis 
                  padding={{ top: 10 }}
                >
                  <Label value="Số khách" angle={0} position="insideTopLeft" dy={-20} />
                </YAxis>
                {/* <Tooltip content={<CustomTooltip />}></Tooltip> */}
                <ChartTooltip content={<ChartTooltipContent />} />
                {/* <Legend content={<ChartLegendContent />} /> */}
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

export function FoodDistributionChart({ params }: { params?: OveriewParams | null }) {
  const [foodDistributionData, setFoodDistributionData] = useState<FoodDistribution[]>([])
  const { foodsDataShared, setFoodsDataShared }: any = useOverviewProvider()
  const getChartData = async (postgreFunc: string, params: OveriewParams) => {
    let startDate: Date | string | undefined;
    let endDate: Date | string | undefined;

    console.log(params, 'param');


    if (params.dateRange) {
      startDate = params.dateRange.from;
      endDate = params.dateRange.to;
    } else if (params.presetRange) {
      const res = getDateRangeOfPast(params.presetRange);
      startDate = res.startDate
      endDate = res.endDate

    }

    const postgreParams = {
      p_store_id: params.store_id,
      p_timeslot_id: params.timeslot_id,
      p_start_date: startDate,
      p_end_date: endDate
    }

    //       create or replace function get_dish_consumed_sum(
    //   p_store_id int,
    //   p_timeslot_id int,
    //   p_start_date date,
    //   p_end_date date
    // )
    // returns table (
    //   id int,
    //   quantity numeric,
    //   storeId int,
    //   timeslotId int,
    //   date date,
    //   foodType text,
    //   name text,
    //   pax int
    // ) language sql as $$
    //   select dish_id as id, sum(consumed_amount_suat) as quantity, store_id as storeId, timeslot_id as timeslotId, date, food_type as foodType, dish_name as name , pax
    //   from cip_log_refill
    //   where store_id = p_store_id
    //     and timeslot_id = p_timeslot_id
    //     and date between p_start_date and p_end_date
    //    group by dish_id, store_id, timeslot_id, date, food_type, dish_name, pax;
    // $$;
    // id: string
    // storeId: number
    // timeslotId: number
    // date: string
    // foodType: string
    // name: string
    // quantity: number
    // pax: number
    try {
      const { data, error } = await supabase.rpc(postgreFunc, postgreParams)
      if (error) throw error
      console.log(data, "food");
      // setChartConfig(generateChartConfig(data))
      setFoodsDataShared(data)
      setFoodDistributionData(data)
    } catch (err) {
      console.error("Error fetching chart data:", err)
      setFoodDistributionData([])
    }
  }
  useEffect(() => {
    if (!params?.timeslot_id) return
    const postgreFunctionName = 'get_dish_consumed_sum'
    getChartData(postgreFunctionName, params)
  }, [params?.timeslot_id])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phân bổ món ăn</CardTitle>
        <CardDescription>Tỷ lệ các món ăn được phục vụ</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <ChartContainer
          config={{}}
          className="h-[500px] w-[100%] px-5 z-10"

        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart >
              <Pie
                data={foodDistributionData}
                outerRadius={150}
                dataKey="quantity"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {foodDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function IngredientDistributionChart({ params }: { params?: OveriewParams | null }) {
  const [ingredientDistributionData, setIngredientDistributionData] = useState<any>([])
  const { foodsDataShared, setFoodsDataShared }: any = useOverviewProvider()

  const calculateIngredients = (dishes: FoodDistribution[], bom: Ingredient[]) => {
    const ingredientTotals: Record<string, IngredientDistribution> = {}
    dishes.map((dish: FoodDistribution) => {
      const bomItems = bom.filter(b => b.dishId === dish.dishId);
      bomItems.forEach(b => {
        const totalAmount = dish.quantity * b.amount;
        if (!ingredientTotals[b.ingredientId]) {
          ingredientTotals[b.ingredientId] = {
            ingredientId: b.ingredientId,
            ingredientName: b.ingredientName,
            totalAmount: 0,
          }
        }
        ingredientTotals[b.ingredientId].totalAmount += totalAmount
      });
    });
    return Object.values(ingredientTotals)
  }

  const getBOM = async () => {
    try {
      const { data, error } = await supabase.from("cip_bom").select("dishId:dish_id, dishName:dish_name, ingredientId: ingredient_id, ingredientName: ingredient_name, amount: converted_amount_g")
      if (error) throw error
      return data as Ingredient[]
    } catch (err) {
      console.error("Error fetching regions:", err)
      return []
    }
  }
  useEffect(() => {
    if (foodsDataShared.length == 0) {
      console.log("FoodsDataShared data is empty.");
      return
    }
    console.log("changeeeeed");
    const process = async () => {
      const bom = await getBOM()
      const ingredientsDistribution = calculateIngredients(foodsDataShared, bom)
      console.log(ingredientsDistribution, "ingredient");
      setIngredientDistributionData(ingredientsDistribution)
    }
    process()
  }, [foodsDataShared])
  return (
    <Card>
      <CardHeader>
        <CardTitle>Phân bổ nguyên liệu</CardTitle>
        <CardDescription>Số lượng các loại nguyên liệu đã sử dụng</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <ChartContainer
          config={{
            // ingredientName: {
            //   label: "Nguyên liệu",
            //   color: "hsl(var(--chart-3))",
            // },
          }}
          className="h-[500px] w-[100%] px-5 z-10"
        >
          <ResponsiveContainer width="100%" height="100%">
            {/* <PieChart>
              <Pie
                data={ingredientDistributionData}
                outerRadius={150}
                dataKey="totalAmount"
                nameKey="ingredientName"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {ingredientDistributionData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent nameKey="ingredientName" />} />
            </PieChart> */}
            <ComposedChart
              data={ingredientDistributionData}
              // margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
              // barCategoryGap="20%"
              barSize={15}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="category"
                dataKey="ingredientName"
                height={70}
                padding={{ left: 5 }}
                tick={{
                  fontSize: 11,
                  fontWeight: "600",
                  // transform: "rotate(-45)",    
                  // xoay chữ
                  angle: -45,
                  textAnchor: "end" // neo cuối khi xoay
                }}
                interval={0}
              />
              <YAxis
                dataKey="totalAmount"
                type="number"
                // width={150}
                padding={{ bottom: 0, top: 24 }}
                tick={{
                  fontSize: 11,
                  fontWeight: "600",
                }}
                height={50}
              >

                <Label value="Đơn vị (g)" position="insideTopLeft" dy={-5} />
              </YAxis>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="totalAmount" fill="#db6302" name="Sử dụng" />
              {/* <Line type="monotone" dataKey="totalAmount" stroke="#ff7300" name="Tồn kho" /> */}
              {/* Đường ROP ngang */}
              {/* <Line dataKey="ROP" stroke="green" strokeDasharray="3 3" name="ROP" /> */}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
