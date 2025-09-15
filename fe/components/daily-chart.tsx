"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { Button } from './ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { BarChart, LineChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, Tooltip, Line, Label, ComposedChart, ReferenceLine } from "recharts"
interface DailyChartDashboardProps {
    foodsData: any[] | null
    ingredientsData: any[] | null
}
function DailyChart({ foodsData, ingredientsData }: DailyChartDashboardProps) {
    const [selectedDay, setSelectedDay] = useState(0)
    const [currentFoods, setCurrentFoods] = useState(foodsData?.[0])
    const [currentIngredients, setcurrentIngredients] = useState(ingredientsData?.[0])

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
        setCurrentFoods(foodsData?.[index])
        setcurrentIngredients(ingredientsData?.[index])
        console.log(ingredientsData?.[index], 'sdadsd');

        setSelectedDay(index)
    }
    useEffect(() => {
        console.log(selectedDay);

    }, [selectedDay])
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
                    <CardDescription>Dự đoán số lượng món ăn</CardDescription>
                </CardHeader>
                <ChartContainer
                    config={{
                        consumed_amount_suat: {
                            label: "Số suất",
                            color: "hsl(var(--chart-1))",

                        },
                    }}
                    className="h-[440px] px-10"
                >
                    {/* <div className='h-full'> */}
                    <ResponsiveContainer width="100%" height="100%" className="select-none bg-amber-200">
                        <BarChart
                            data={currentFoods?.items || []}
                            layout="vertical"
                            margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
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
                            <Bar dataKey="consumed_amount_suat" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                    {/* </div> */}
                </ChartContainer>
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
                            data={currentIngredients?.items || []}
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
                            <Line type="monotone" dataKey="qty_on_hand" stroke="#ff7300" name="Tồn kho" />
                            {/* Đường ROP ngang */}
                            <Line dataKey="ROP" stroke="green" strokeDasharray="3 3" name="ROP" />
                        </ComposedChart>
                    </ResponsiveContainer>
                    {/* </div> */}

                </ChartContainer>
            </Card>
        </div >
    )
}

export default DailyChart