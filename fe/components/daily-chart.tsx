"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { CHART_CONFIG, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { BarChart, LineChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, Tooltip, Line, Label, ComposedChart, ReferenceLine, LabelList } from "recharts"
import { COLORS } from './simple-charts'
import { Timeslot } from '@/types'
import { useAppProvider } from '@/contexts/app-provider'
import { AlertTriangle } from 'lucide-react'
interface DailyChartDashboardProps {
    foodsData: any[] | null
    ingredientsData: any[] | null
    dateList: any[] | null
    timeslot: Timeslot | null
}
function DailyChart({ foodsData, ingredientsData, dateList, timeslot }: DailyChartDashboardProps) {
    const [selectedDay, setSelectedDay] = useState<any>(null)
    const [currentFoods, setCurrentFoods] = useState<any>([])
    const [currentIngredients, setcurrentIngredients] = useState<any>([])
    const [foodTypes, setFoodTypes] = useState<any>(null)
    const [ingredientsByCategory, setIngredientsByCategory] = useState<any>(null)
    // const [isUsedByCategory, setIsUsedByCategory] = useState<any>(null)
    // const [totalFoods, setTotalFoods] = useState(0)
    const [totalTimeslots, setTotalTimeslots] = useState<Timeslot[] | null>(null)
    const { timeslots } = useAppProvider()
    //  const currentData = data[selectedDay] || []
    // const dateRange = useMemo(() => {
    //     // let dates = []
    //     if (!foodsData) return [];

    //     // Lấy mảng các ngày từ foodsData.date
    //     const dates = foodsData.map(f => f.date);

    //     // Nếu muốn loại bỏ trùng lặp
    //     const uniqueDates = [...new Set(dates)];
    //     // console.log((uniqueDates), 'qqq');

    //     return uniqueDates;
    // }, [foodsData])
    console.log(foodsData, 'foo');

    const reshapeFoodsDataById = (data: any) => {
        const result: any = {};
        // Loop từng ca (1,2,3)
        data.dishes.forEach((dish: any) => {
            if (!result[dish.dish_id]) {
                result[dish.dish_id] = {
                    dishName: dish.dish_name,
                    dishId: dish.dish_id,
                    totalPax: 0,
                    foodType: dish.food_type,
                    totalDish: 0,
                };
            }
            // Dùng dynamic key theo timeslot_id
            const slotKey = `${dish.timeslot_id}`;
            result[dish.dish_id][slotKey] = dish.consumed_amount_suat;
            // Cộng vào tổng
            result[dish.dish_id].totalDish += dish.consumed_amount_suat;
            // Cộng vào tổng
            result[dish.dish_id].totalPax += dish.pax;
        });
        return Object.values(result).sort((a: any, b: any) => b.totalDish - a.totalDish);
    }
    const reshapeFoodsDataByFoodType = (data: any) => {
        const result: any = {};
        // Loop từng ca (1,2,3)
        data.dishes.forEach((dish: any) => {
            if (!result[dish.food_type]) {
                result[dish.food_type] = {
                    // dishName: dish.dish_name,
                    // dishId: dish.dish_id,
                    // totalPax: 0,
                    // foodType: dish.food_type,
                    totalDish: 0,
                };
            }
            // Dùng dynamic key theo timeslot_id
            const slotKey = `${dish.timeslot_id}`;
            // Khởi tạo nếu chưa có
            if (!result[dish.food_type][slotKey]) {
                result[dish.food_type][slotKey] = 0;
                result[dish.food_type][`foodType${slotKey}`] = `${dish.food_type} ca ${slotKey}`;
            }
            result[dish.food_type][slotKey] += dish.consumed_amount_suat;
            // Cộng vào tổng
            result[dish.food_type].totalDish += dish.consumed_amount_suat;
            // // Cộng vào tổng
            // result[dish.dish_id].totalPax += dish.pax;
        });
        return Object.values(result);
    }

    const reshapeIngredientsByCategory = (currentIngredients: any) => {
        const result: any = {};
        // Loop từng ca (1,2,3)
        currentIngredients.forEach((ingredient: any) => {
            if (!result[ingredient.category]) {
                result[ingredient.category] = {
                    // dishName: dish.dish_name,
                    // dishId: dish.dish_id,
                    // totalPax: 0,
                    // foodType: dish.food_type,
                    category: ingredient.category,
                    totalOnHand: 0,
                    totalIsUsed: 0
                };
            }
            result[ingredient.category].totalOnHand += ingredient.qty_on_hand;
            result[ingredient.category].totalIsUsed += ingredient.qty_is_used;
        });
        return Object.values(result);
    }
    const handleSelectedDateChange = (index: number) => {
        // const currentFoods = foodsData?.[index].items.sort((a: any, b: any) => b.consumed_amount_suat - a.consumed_amount_suat)
        const currentFoods = reshapeFoodsDataById(foodsData?.[index])
        console.log(currentFoods, "cccc");
        const foodTypes = reshapeFoodsDataByFoodType(foodsData?.[index])
        console.log(foodTypes, "ffff");


        const currentIngredients = ingredientsData?.[index].ingredients?.sort((a: any, b: any) => b.qty_is_used - a.qty_is_used)
        console.log(currentIngredients, "iiiii1");


        setFoodTypes(foodTypes)
        setCurrentFoods(currentFoods)
        setcurrentIngredients(currentIngredients)
        setIngredientsByCategory(reshapeIngredientsByCategory(currentIngredients))
        setSelectedDay(index)
    }
    const createTimeslots = (timeslot: Timeslot | null) => {
        let totalTimeslots: any = []
        if (timeslot?.id == 4) {
            totalTimeslots = timeslots.filter((item: any) => item.id != 4)
        }
        else {
            totalTimeslots = [timeslot]
        }
        return totalTimeslots
    }
    useEffect(() => {
        console.log(selectedDay)
        console.log(foodTypes, "foood");

        if (!timeslot) return
        setTotalTimeslots(createTimeslots(timeslot))
        handleSelectedDateChange(0)
    }, [])
    const CustomTick = ({ x, y, payload }: any) => {
        const ingredient = currentIngredients?.[payload.index];
        // const diff = row.qty_is_used - row.b;
        // console.log(ingredient.qty_on_hand, "onhand");

        return (
            <text
                x={x}
                y={y + 10}
                textAnchor="end"
                // fill={ingredient.qty_on_hand < 0 ? "#DC2626" : "#000"}
                // fill='#DC2626'
                style={{
                    fill: ingredient.ending_inventory < 0 ? "#DC2626" : "#000",
                    fontWeight: ingredient.ending_inventory < 0 ? 600 : 500
                }}
                fontSize={13}
                fontWeight={500}
                transform={`rotate(-45, ${x}, ${y})`}
            >
                {payload.value}
            </text>
        );
    };
    const CustomTickOnhand = ({ x, y, payload }: any) => {
        const ingredient = currentIngredients?.[payload.index];
        // const diff = row.qty_is_used - row.b;
        // console.log(ingredient.qty_on_hand, "onhand");

        return (
            <text
                x={x}
                y={y + 10}
                textAnchor="end"
                // fill={ingredient.qty_on_hand < 0 ? "#DC2626" : "#000"}
                // fill='#DC2626'
                style={{
                    fill: ingredient.qty_on_hand < 0 ? "#DC2626" : "#000",
                    fontWeight: ingredient.qty_on_hand < 0 ? 600 : 500
                }}
                fontSize={13}
                fontWeight={500}
                transform={`rotate(-45, ${x}, ${y})`}
            >
                {payload.value}
            </text>
        );
    };

    // custom label line
    const customLabelLine = (props: any) => {
        const RADIAN = Math.PI / 180;

        const { cx, cy, midAngle, outerRadius, index } = props;
        const offset = index % 2 === 0 ? 20 : 100; // xen kẽ ngắn 20px, dài 40px

        const x1 = cx + outerRadius * Math.cos(-midAngle * RADIAN);
        const y1 = cy + outerRadius * Math.sin(-midAngle * RADIAN);
        const x2 = cx + (outerRadius + offset) * Math.cos(-midAngle * RADIAN);
        const y2 = cy + (outerRadius + offset) * Math.sin(-midAngle * RADIAN);

        return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" />;
    };

    const renderCustomLabel = ({
        cx, cy, midAngle, outerRadius, percent, name, index
    }: any) => {
        const RADIAN = Math.PI / 180;

        const offset = index % 2 === 0 ? 20 : 100; // giống như line
        const x = cx + (outerRadius + offset) * Math.cos(-midAngle * RADIAN);
        const y = cy + (outerRadius + offset) * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="black"
                textAnchor={x > cx ? "start" : "end"} // 👈 canh theo hướng line
                dominantBaseline="central"
                fontSize={12}
            >
                {`${name} ${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };
    // const dateRange = ["2025-09-12", "2025-09-13"]
    return (
        <div className='grid grid-cols-1 lg:grid-cols-1 gap-6 select-none'>
            <div className='flex gap-2 flex-wrap'>
                {dateList?.map((d, index) => (
                    <Button
                        variant={selectedDay === index ? "default" : "secondary"}
                        key={index}
                        onClick={() => handleSelectedDateChange(index)}>{d}</Button>
                ))}
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Số lượng món ăn</CardTitle>
                    <CardDescription>Dự đoán số lượng món ăn</CardDescription>
                </CardHeader>

                <CardContent className=''>
                    <div className='flex gap-4'>
                        <Card className='gap-1 p-2'>
                            <CardDescription>
                                Tổng số khách dự kiến
                            </CardDescription>
                            <p className='pl-2 text-2xl text-center font-semibold'>
                                {currentFoods?.[0]?.totalPax | 0}
                            </p>
                        </Card>
                        <Card className='gap-1 p-2'>
                            <CardDescription>
                                Tổng số suất ăn dự kiến
                            </CardDescription>
                            <p className='pl-2 text-2xl text-center font-semibold   '>
                                {foodTypes?.reduce((total: number, item: any) => total + item.totalDish, 0)}
                            </p>
                            {/* <p className='pl-2 text-2xl text-center font-semibold'>
                                0
                            </p> */}
                        </Card>
                    </div>

                    {/* <div>Tổng số suất ăn dự kiến {foodTypes.map((i)=>)}</div> */}
                    <div className='flex h-[350px]  gap-5 w-full py-3'>
                        {/* <div className='flex-1 flex flex-col'> */}
                        <div className='rounded-2xl bg-amber-200 py-2'>
                            <ChartContainer
                                config={CHART_CONFIG}
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
                                                // dataKey="consumed_amount_suat"
                                                tick={{
                                                    fontWeight: "600",
                                                }}
                                            />
                                            <YAxis
                                                dataKey="dishName"
                                                type="category"
                                                interval={0}
                                                width={150}
                                                padding={{ bottom: 10 }}
                                                tick={{
                                                    fontWeight: "600",
                                                }}
                                            />
                                            <ChartTooltip content={<ChartTooltipContent chartType='food' />} />
                                            {totalTimeslots?.map((timeslot, index) => (
                                                <Bar key={index} dataKey={`${timeslot.id}`} stackId="a" fill={COLORS[index % COLORS.length]} >
                                                    <LabelList dataKey={`${timeslot.id}`} position="inside" fill='white' />
                                                </Bar>
                                            ))}
                                            {/* <Bar dataKey="consumed_amount_suat" fill="#8884d8" >
                                                <LabelList dataKey="consumed_amount_suat" position="right" />
                                            </Bar> */}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                            </ChartContainer>
                        </div>
                        {/* </div> */}

                        <div className='flex flex-1 rounded-2xl flex-col overflow-clip bg-blue-100 pb-4'>
                            <div className='px-4 pt-1'>
                                <div className='flex justify-between py-2'>
                                    <p className='font-semibold'>Nguyên vật liệu được sử dụng</p>
                                    <p className='font-semibold pr-3'>{currentIngredients?.reduce((acc: any, i: any) => acc + (i.qty_is_used > 0 ? 1 : 0), 0)}</p>
                                    {/* {currentIngredients?.reduce((acc: any, i: any) => acc + (i.qty_on_hand < 0 ? 1 : 0), 0)} */}
                                </div>
                                <div className='py-[1px] w-full bg-blue-200'></div>

                            </div>
                            <div className='py-2 px-4'>
                                <div className='flex justify-between'>
                                    <p className='font-semibold'>Tên</p>
                                    <p className='pr-3 font-semibold'>Số lượng sử dụng (g)
                                    </p>
                                </div>
                            </div>
                            <div className="overflow-y-auto px-4 py-1">
                                {currentIngredients?.map((item: any, index: number) => (
                                    <div key={index} className='flex justify-between'>
                                        <p className=''>{item.ingredient_name}</p>
                                        <p className=''>{item.qty_is_used}</p>
                                    </div>
                                ))
                                }
                            </div>
                            {/* <div> */}

                            {/* </div> */}
                        </div>
                    </div>
                    <div className='py-5'>
                        <div className='py-[1px] bg-gray-200 mx-[200px]'></div>
                        <CardTitle className='text-center pt-5 pb-3'>Tỉ lệ theo nhóm món</CardTitle>
                        <ChartContainer
                            config={{}}
                            className="h-[420px] w-full px-5 z-10"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart >
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <ChartLegend content={<ChartLegendContent />} className='lg:grid-cols-5' />
                                    {totalTimeslots?.map((timeslot, index) => (
                                        <Pie
                                            key={timeslot.id}
                                            data={foodTypes}
                                            outerRadius={50 + index * 50}
                                            innerRadius={index * 50}
                                            dataKey={`${timeslot.id}`}
                                            nameKey={`foodType${timeslot.id}`}
                                            labelLine={false}
                                            // label={({ name, percent }) => `${name} - ${(percent * 100).toFixed(0)}%`}
                                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                                const RADIAN = Math.PI / 180;
                                                const radius = (innerRadius + outerRadius) / 2; // nằm giữa vòng
                                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                //// Text luôn hướng lên, chỉ cần rotate nếu muốn cân chỉnh
                                                let angle = 0
                                                if (midAngle <= 90) {
                                                    angle = 90 - midAngle
                                                } else if (midAngle <= 180) {
                                                    angle = -(180 - midAngle)
                                                }
                                                else if (midAngle <= 270) {
                                                    angle = 270 - midAngle
                                                } else {
                                                    angle = -(360 - midAngle)
                                                }
                                                return (
                                                    <text
                                                        x={x}
                                                        y={y}
                                                        textAnchor="middle"
                                                        dominantBaseline="central"
                                                        transform={`rotate(${angle}, ${x}, ${y})`}
                                                        fill="#000"
                                                        fontSize={11}
                                                    >
                                                        {(percent * 100).toFixed(0)}%
                                                    </text>
                                                );
                                            }}
                                        >
                                            {foodTypes?.map((entry: any, index: any) => (
                                                <Cell key={`${entry.foodType}-${timeslot.id}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                    ))}

                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>
            {/* Tồn kho */}
            <Card className=''>
                <CardHeader>
                    <CardTitle>Nguyên liệu cần sử dụng</CardTitle>
                    <CardDescription>Dự đoán nguyên liệu cần sử dụng</CardDescription>
                </CardHeader>
                <CardContent>
                    <CardTitle>Nguyên liệu cần sử dụng theo tên nguyên liệu</CardTitle>
                    <div className='flex h-[380px]  gap-5 w-full py-3'>
                        <div className='rounded-2xl bg-red-100 p-3'>
                            <ChartContainer
                                config={{
                                    ingredient_name: {
                                        label: "Tên nguyên liệu",
                                        color: "hsl(var(--chart-1))",
                                    },
                                }}
                                className="overflow-x-auto overflow-y-auto w-full h-full"
                            >
                                <div className='w-[2000px] h-[100%]'>
                                    <ResponsiveContainer width="100%" height="100%" className="select-none ">
                                        <BarChart
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
                                                tick={CustomTickOnhand}
                                                interval={0}
                                                padding={{ left: 10 }}
                                            />
                                            <YAxis
                                                // dataKey="qty_is_used"
                                                type="number"
                                                // width={150}
                                                height={200}
                                                padding={{ bottom: 10 }}
                                                tick={{
                                                    fontSize: 12,
                                                    fontWeight: "600",
                                                }}
                                                domain={["dataMin", 100]}

                                            // scale="log"
                                            // tickFormatter={(value) => {
                                            //     if (value >= 1000000) return `${value / 1000000}M`;
                                            //     if (value >= 1000) return `${value / 1000}k`;
                                            //     return value;
                                            // }}
                                            />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="qty_is_used" fill="#ff7300" name="Sử dụng">
                                                {/* <LabelList dataKey="qty_is_used" position="top" /> */}
                                            </Bar>
                                            {/* <Bar dataKey="qty_received" fill="#8884d8" name="Nhận mới" stackId="a" /> */}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                            </ChartContainer>
                        </div>
                        <div className='flex flex-1 rounded-2xl flex-col overflow-clip bg-blue-100 pb-2'>
                            <div className='px-4 pt-1'>
                                <div className='flex justify-between py-2'>
                                    <p className='font-semibold'>Nguyên liệu hết trong kho</p>
                                    <p className='font-semibold pr-3'>{currentIngredients?.reduce((acc: any, i: any) => acc + (i.qty_on_hand < 0 ? 1 : 0), 0)}</p>
                                </div>
                                <div className='py-[1px] w-full bg-blue-200'></div>
                            </div>
                            <div className='py-2 px-4'>
                                {/* <p className='italic'>Chi tiết: </p> */}
                                <div className='flex justify-between'>
                                    <p className='font-semibold'>Tên</p>
                                    <p className='pr-3 font-semibold'>Số lượng (g)</p>
                                </div>
                            </div>
                            <div className="overflow-y-auto px-4">
                                {currentIngredients?.map((item: any, index: number) => item.qty_on_hand < 0 ? (

                                    <div key={index} className='flex justify-between' >
                                        <p className=''>{item.ingredient_name}</p>
                                        <p className=''>{item.qty_on_hand.toFixed(0)}</p>
                                    </div>
                                ) : "")
                                }
                            </div>

                        </div>
                    </div>
                </CardContent>

                {/* Sử dụng */}
                {ingredientsData?.length != 0 ?
                    (<>
                        {/* <CardHeader>
                            <CardTitle>Số lượng sử dụng và tồn kho theo nhóm nguyên liệu</CardTitle>
                        </CardHeader> */}
                        <CardContent className='h-[3000px]'>
                            <CardTitle> Nguyên liệu cần sử dụng và tồn kho theo nhóm</CardTitle>
                            <div className='gap-5 w-full py-3'>
                                <div className='rounded-2xl bg-red-200 p-3'>
                                    <ChartContainer
                                        config={CHART_CONFIG}
                                        className=" w-full px-5"
                                    >
                                        <ResponsiveContainer width="100%" height="100%" className="select-none">
                                            <BarChart
                                                data={ingredientsByCategory}
                                                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                                                // barCategoryGap="20%"
                                                barSize={25}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />

                                                <XAxis
                                                    type="category"
                                                    dataKey="category"
                                                />
                                                <YAxis
                                                    // dataKey="dishName"
                                                    type="number"
                                                    // interval={0}
                                                    width={150}
                                                    padding={{ bottom: 10 }}
                                                    tick={{
                                                        fontWeight: "600",
                                                    }}
                                                />
                                                <ChartTooltip content={<ChartTooltipContent chartType='ingredient' />} />
                                                <ChartLegend content={<ChartLegendContent />} className='lg:grid-cols-1 justify-center flex gap-10' />
                                                <Bar key="totalOnHand" dataKey="totalOnHand" fill="#ff7300" name="Tồn kho" ></Bar>
                                                <Bar key="totalIsUsed" dataKey="totalIsUsed" fill="#8884d8" name="Sử dụng" ></Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </div>
                                {/* <div className='flex flex-1 rounded-2xl flex-col overflow-clip bg-blue-100 pb-2'>
                                    <div className='px-4 pt-1'>
                                        <div className='flex justify-between py-2'>
                                            <p className='font-semibold'>Số nguyên sử dụng hết</p>
                                            <p className='font-semibold pr-3'>{currentIngredients?.reduce((acc: any, i: any) => acc + (i.ending_inventory < 0 ? 1 : 0), 0)}</p>
                                        </div>
                                        <div className='py-[1px] w-full bg-blue-200'></div>
                                    </div>
                                    <div className='py-2 px-4'>
                                        <div className='flex justify-between'>
                                            <p className='font-semibold'>Tên</p>
                                            <p className='pr-3 font-semibold'>Số lượng (g)</p>
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto px-4">
                                        {currentIngredients?.map((item: any, index: number) => item.ending_inventory < 0 ? (

                                            <div key={index} className='flex justify-between' >
                                                <p className=''>{item.ingredient_name}</p>
                                                <p className=''>{item.on_hand > 0 ? "" : ""}</p>
                                            </div>
                                        ) : "")
                                        }
                                    </div>

                                </div> */}
                            </div>
                            {/*  CHI TIẾT */}
                            <Card className='p-4 gap-3 my-5'>
                                <CardTitle>Thông tin chi tiết</CardTitle>
                                <div className='flex justify-between font-semibold'>
                                    <p className='flex-1'>ID</p>
                                    <p className='flex-1'>Tên nguyên liệu</p>
                                    <p className='flex-1 text-end'>Tồn kho</p>
                                    <p className='flex-1 text-end'>ROP</p>
                                    <p className='flex-1 text-end'>Tồn kho chuẩn</p>
                                    <p className='flex-1 text-end'>Cảnh báo</p>
                                </div>
                                <div className='h-[400px]'>
                                    <div className='h-full overflow-y-auto'>
                                        {currentIngredients?.slice()
                                            ?.sort((a: any, b: any) => {
                                                const numA = parseInt(a.ingredient_id.replace(/\D/g, ""), 10); // lấy số
                                                const numB = parseInt(b.ingredient_id.replace(/\D/g, ""), 10);
                                                return numA - numB; // tăng dần
                                            })
                                            .map((ingredient: any, index: number) => (
                                                <div key={index} className='flex justify-between'>
                                                    <p className='flex-1'> {ingredient.ingredient_id}</p>
                                                    <p className='flex-1'>{ingredient.ingredient_name}</p>
                                                    <p className='flex-1 text-end'> {ingredient.qty_on_hand} </p>
                                                    <p className='flex-1 text-end'> {ingredient.ROP} </p>
                                                    <p className='flex-1 text-end'> {ingredient.order_up_to_level} </p>
                                                    <p className='flex flex-1 justify-end items-center'> {ingredient.qty_on_hand > ingredient.ROP ? "" : <AlertTriangle size="18" className=" text-yellow-500 mt-0" />} Đặt hàng </p>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </Card>

                            {/* <div className='flex gap-5'> */}
                            <Card className='gap-1 py-3 p-4 w-[50%]'>
                                <CardTitle>Nguyên liệu nhận trong ngày {currentIngredients?.[0]?.["date"].split("T")[0]}

                                </CardTitle>
                                <div className='header flex justify-between font-semibold pt-2'>
                                    {/* <p className='w-10'>STT</p> */}
                                    <p className='w-[100px]'>ID</p>
                                    <p className='flex-1'>Tên nguyên liệu</p>
                                    <p className='flex-1 text-end pr-4'>Số lượng nhận</p>
                                </div>
                                <div className='h-[285px] overflow-y-auto my-0'>
                                    <div>
                                        {currentIngredients?.map((ingredient: any, index: number) => ingredient.qty_received > 0 && (
                                            <div key={index} className="flex justify-between">
                                                {/* <p className='w-10'>{index}</p> */}
                                                <p className='w-[100px]'>{ingredient.ingredient_id}</p>
                                                <p className="flex-1">{ingredient.ingredient_name}</p>
                                                <p className="flex-1 text-end">{ingredient.qty_received}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className='font-semibold flex justify-start gap-3'>
                                    <p className=''>Tổng cộng:</p>
                                    <p>{currentIngredients?.reduce(
                                        (count: number, ingredient: any) => count + (ingredient.qty_received > 0 ? 1 : 0),
                                        0
                                    )} nguyên liệu</p>
                                </div>
                            </Card>
                            {/* </div> */}
                            <Card className='flex-1 gap-3 py-3 p-4 my-5'>
                                <CardTitle>Nguyên liệu cần đặt</CardTitle>

                                <div className='header flex justify-between font-semibold'>
                                    {/* <p className='w-10'>STT</p> */}
                                    <p className='w-[100px]'>ID</p>
                                    <p className='flex-1'>Tên nguyên liệu</p>
                                    <p className='flex-1 text-end'>Ngày đặt</p>
                                    <p className='flex-1 text-end'>Số lượng đặt</p>
                                    <p className='flex-1 text-end pr-4'>Ngày nhận</p>
                                </div>
                                <div className='h-[285px] overflow-y-auto my-0'>
                                    <div>
                                        {currentIngredients?.map((ingredient: any, index: number) => ingredient.order_qty > 0 && (
                                            <div key={index} className="flex justify-between">
                                                {/* <p className='w-10'>{index}</p> */}
                                                <p className='w-[100px]'>{ingredient.ingredient_id}</p>
                                                <p className="flex-1">{ingredient.ingredient_name}</p>
                                                <p className="flex-1 text-end">{ingredient.date.split("T")[0]}</p>
                                                <p className="flex-1 text-end">{ingredient.order_qty}</p>
                                                <p className="flex-1 text-end">{ingredient.expected_receipt_date}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className='font-semibold flex justify-start gap-3'>
                                    <p className=''>Tổng cộng:</p>
                                    <p>{currentIngredients?.reduce(
                                        (count: number, ingredient: any) => count + (ingredient.order_qty > 0 ? 1 : 0),
                                        0
                                    )} nguyên liệu</p>
                                </div>
                            </Card>


                        </CardContent>

                    </>
                    ) : <></>}
            </Card>
        </div >
    )
}

export default DailyChart