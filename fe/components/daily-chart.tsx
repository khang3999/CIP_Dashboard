"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { BarChart, LineChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, Tooltip, Line, Label, ComposedChart, ReferenceLine, LabelList } from "recharts"
import { COLORS } from './simple-charts'
interface DailyChartDashboardProps {
    foodsData: any[] | null
    ingredientsData: any[] | null
}
function DailyChart({ foodsData, ingredientsData }: DailyChartDashboardProps) {
    const [selectedDay, setSelectedDay] = useState<any>(null)
    const [currentFoods, setCurrentFoods] = useState<any>([])
    const [currentIngredients, setcurrentIngredients] = useState<any>([])
    const [foodTypes, setFoodTypes] = useState<any>(null)
    //  const currentData = data[selectedDay] || []
    const dateRange = useMemo(() => {
        // let dates = []
        if (!foodsData) return [];

        // Lấy mảng các ngày từ foodsData.date
        const dates = foodsData.map(f => f.date);

        // Nếu muốn loại bỏ trùng lặp
        const uniqueDates = [...new Set(dates)];
        // console.log((uniqueDates), 'qqq');

        return uniqueDates;
    }, [foodsData])

    const handleSelectedDateChange = (index: number) => {
        const currentFoods = foodsData?.[index].items.sort((a: any, b: any) => b.consumed_amount_suat - a.consumed_amount_suat)

        const foodTypeMap = new Map<string, number>();
        for (const item of currentFoods) {
            foodTypeMap.set(
                item.food_type,
                (foodTypeMap.get(item.food_type) ?? 0) + item.consumed_amount_suat
            );
        }

        // Convert sang array
        const countByFoodTypeArr = Array.from(foodTypeMap, ([food_type, count]) => ({
            food_type,
            count,
        }));

        // const countByFoodTypeArr = currentFoods.reduce((acc: any[], item: any) => {
        //     const found = acc.find((f) => f.food_type === item.food_type);
        //     if (found) {
        //         found.count += item.consumed_amount_suat;
        //     } else {
        //         acc.push({ food_type: item.food_type, count: item.consumed_amount_suat });
        //     }
        //     return acc;
        // }, []);
        const ingredients = ingredientsData?.[index].items.sort((a: any, b: any) => b.qty_issued - a.qty_issued)
        // console.log(countByFoodTypeArr, "kkk")
        // console.log(ingredientsData?.[index], 'sdadsd');

        setFoodTypes(countByFoodTypeArr)
        setCurrentFoods(currentFoods)
        setcurrentIngredients(ingredients)
        setSelectedDay(index)
    }
    useEffect(() => {
        console.log(selectedDay);
        handleSelectedDateChange(0)
    }, [])
    const CustomTick = ({ x, y, payload }: any) => {
        return (
            <text
                x={x}
                y={y + 10}
                textAnchor="end"
                fill="#444"
                fontSize={12}
                transform={`rotate(-45, ${x}, ${y})`}
            >
                {payload.value}
            </text>
        );
    };
    // const dateRange = ["2025-09-12", "2025-09-13"]
    return (
        <div className='grid grid-cols-1 lg:grid-cols-1 gap-6 select-none'>
            <div className='flex gap-2 flex-wrap'>
                {dateRange.map((d, index) => (
                    <Button
                        variant={selectedDay === index ? "default" : "secondary"}
                        key={index}
                        onClick={() => handleSelectedDateChange(index)}>{d}</Button>
                ))}
            </div>
            <Card className=''>
                <CardHeader>
                    <CardTitle>Số lượng món ăn</CardTitle>
                    <CardDescription>Dự đoán số lượng món ăn cho {currentFoods[0]?.pax} khách</CardDescription>
                </CardHeader>

                <CardContent className=''>
                    <div className='flex h-[380px] gap-5 w-full py-3'>
                        <div className='rounded-2xl bg-amber-200 flex-1 py-5'>
                            <ChartContainer
                                config={{
                                    consumed_amount_suat: {
                                        label: "Số suất",
                                        color: "hsl(var(--chart-1))",
                                    },
                                }}
                                className="overflow-y-auto h-full"
                            >
                                <div className='h-[1200px]'>
                                    <ResponsiveContainer width="100%" height="100%" className="select-none">
                                        <BarChart
                                            data={currentFoods || []}
                                            layout="vertical"
                                            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                                            // barCategoryGap="20%"
                                            barSize={20}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                type="number"
                                                dataKey="consumed_amount_suat"
                                                tick={{
                                                    fontWeight: "600",
                                                }}
                                            />
                                            <YAxis
                                                dataKey="dish_name"
                                                type="category"
                                                interval={0}
                                                width={150}
                                                padding={{ bottom: 10 }}
                                                tick={{
                                                    fontWeight: "600",
                                                }}
                                            />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="consumed_amount_suat" fill="#8884d8" >
                                                <LabelList dataKey="consumed_amount_suat" position="right" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                            </ChartContainer>
                        </div>

                        <div className='table-auto flex flex-1 rounded-2xl flex-col overflow-clip bg-blue-100'>
                            <div className='py-2 px-4'>
                                <div className='flex justify-between'>
                                    <p className='font-semibold'>Tên nguyên liệu</p>
                                    <p className='pr-3 font-semibold'>Số lượng sử dụng</p>
                                </div>
                            </div>
                            <div className="overflow-y-auto px-4">
                                {currentIngredients.map((item: any, index: number) => (
                                    <div key={index} className='flex justify-between'>
                                        <p className=''>{item.ingredient_name}</p>
                                        <p className=''>{item.qty_issued}</p>
                                    </div>
                                ))
                                }
                            </div>
                            {/* <div> */}
                            <div className='px-4 pt-1'>
                                <div className='py-[1px] w-full bg-blue-200'></div>
                                <div className='flex justify-between py-2'>
                                    <p className='font-semibold'>Tổng cộng</p>
                                    <p className='font-semibold pr-3'>{currentIngredients.reduce((acc: any, i: any) => acc + i.qty_issued, 0)}</p>
                                </div>
                            </div>
                            {/* </div> */}
                        </div>
                    </div>
                    <div className='py-5'>
                        <div className='py-[1px] bg-gray-200 mx-[200px]'></div>
                        <CardTitle className='text-center pt-5'>Tỉ lệ theo nhóm món</CardTitle>
                        <ChartContainer
                            config={{}}
                            className="h-[350px] w-[100%] px-5 z-10"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart >
                                    <Pie
                                        data={foodTypes || []}
                                        outerRadius={120}
                                        dataKey="count"
                                        nameKey="food_type"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {foodTypes?.map((entry:any, index:any) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <ChartLegend content={<ChartLegendContent nameKey="food_type" />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>
            <Card className=''>
                <CardHeader>
                    <CardTitle>Nguyên liệu sử dụng</CardTitle>
                    <CardDescription>Dự đoán nguyên liệu sử dụng</CardDescription>
                </CardHeader>
                <ChartContainer
                    config={{
                        ingredient_name: {
                            label: "Tên nguyên liệu",
                            color: "hsl(var(--chart-1))",
                        },
                    }}
                    className="h-[440px] px-10"
                >
                    {/* <div className='h-full'> */}
                    <ResponsiveContainer width="100%" height="100%" className="select-none bg-red-200">
                        <ComposedChart
                            data={currentIngredients || []}
                            // layout="vertical"
                            margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                            // barCategoryGap="20%"
                            barSize={15}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                type="category"
                                dataKey="ingredient_name"
                                height={70}
                                tick={{
                                    fontWeight: "600",
                                    // transform: "rotate(-45)",    
                                    // xoay chữ
                                    angle: -45,
                                    textAnchor: "end" // neo cuối khi xoay
                                }}
                                interval={0}
                            />
                            <YAxis
                                // dataKey="qty_issued"
                                type="number"
                                // width={150}
                                padding={{ bottom: 10 }}
                                tick={{
                                    fontSize: 12,
                                    fontWeight: "600",
                                }}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="qty_issued" fill="#8884d8" name="Sử dụng" />
                            {/* <Line type="monotone" dataKey="qty_on_hand" stroke="#ff7300" name="Tồn kho" /> */}
                            {/* Đường ROP ngang */}
                            {/* <Line dataKey="ROP" stroke="green" strokeDasharray="3 3" name="ROP" /> */}
                        </ComposedChart>
                    </ResponsiveContainer>
                    {/* </div> */}

                </ChartContainer>
            </Card>
        </div >
    )
}

export default DailyChart