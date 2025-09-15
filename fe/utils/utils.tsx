import { PresetRange } from "@/types"

export function getDateRangeOfPast(presetRange: PresetRange) {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // reset về đầu ngày

  // hôm qua = hôm nay - 1
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  let startDate = new Date(yesterday)
  let endDate = new Date(yesterday)

  const { count, type, time_status } = presetRange

  if (time_status === "today") {
    startDate = new Date(0)
    endDate = yesterday
  } else if (time_status === "past") {
    if (type === "day") {
      startDate.setDate(yesterday.getDate() - count + 1)
    }
    if (type === "week") {
      startDate.setDate(yesterday.getDate() - count * 7 + 1)
    }
    if (type === "month") {
      const yesterdayMonth = yesterday.getMonth()
      const todayMonth = today.getMonth()
      let targetMonth = new Date(yesterday)
      // Nếu hôm qua vẫn là tháng hiện tại → lùi về tháng trước
      if (yesterdayMonth === todayMonth) {
        targetMonth.setMonth(targetMonth.getMonth() - count)
      } else {
        // hôm qua đã là tháng trước → giữ nguyên nhưng vẫn lùi thêm (count - 1) tháng
        targetMonth.setMonth(targetMonth.getMonth() - count + 1)
      }

      // Đặt start là ngày đầu tháng
      startDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)

      // Đặt end là ngày cuối tháng
      endDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0)
    }
    if (type === "year") {
      startDate.setFullYear(yesterday.getFullYear() - count + 1)
      startDate.setMonth(0, 1) // 01/01
    }

  }
  const startDateStr = startDate.toLocaleDateString("en-CA")
  const endDateStr = endDate.toLocaleDateString("en-CA")

  return { "startDate": startDateStr, "endDate": endDateStr }
}

export const formatDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0"); // JS month 0-11
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};


export function getDateRangeOfFuture(presetRange: PresetRange) {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // reset về đầu ngày

  // hôm qua = hôm nay - 1
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  let startDate = new Date(tomorrow)
  let endDate = new Date(tomorrow)

  const { count, type, time_status } = presetRange

  // if (time_status === "today") {
  //   startDate = new Date(0)
  //   endDate = yesterday
  // } else
  if (time_status === "future") {
    // endDate = startDate + count theo type
    switch (type) {
      case "day":
        endDate.setDate(startDate.getDate() + count - 1);
        break;
      case "week":
        endDate.setDate(startDate.getDate() + count * 7 - 1);
        break;
      // case "month":
      //   endDate.setMonth(startDate.getMonth() + count);
      //   endDate.setDate(0); // ngày cuối tháng trước tháng target
      //   break;
      // case "year":
      //   endDate.setFullYear(startDate.getFullYear() + count - 1);
      //   endDate.setMonth(11, 31); // 31/12 của năm cuối
      //   break;
      default:
        break;
    }

  }

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
}

// Tạo ticks dựa trên dữ liệu và params
export const generateTicks = (data: any, params: any) => {
  const time_status = params?.presetRange?.time_status
  const type = params?.presetRange?.type
  console.log(time_status);

  if (time_status === 'today') {
    // Lấy tháng đầu mỗi dữ liệu (chỉ 1 tick mỗi tháng)
    const seenMonths = new Set<string>();
    return data
      .map((d: any) => {
        const dt = new Date(d.date);
        const monthKey = `${dt.getFullYear()}-${dt.getMonth()}`;
        if (!seenMonths.has(monthKey)) {
          seenMonths.add(monthKey);
          return d.date;
        }
        return null;
      })
      .filter(Boolean) as string[];
  } else if (time_status === 'past' && type === "month") {

  }
  // Các trường hợp khác hiển thị tất cả
  return data.map((d: any) => d.date);
};

export function removeVietnameseTones(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export function formatTimestampVN(timestamp: string | Date) {
  const date = new Date(timestamp);
  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false, // 24h
  });
}

export function getRandomColor() {
  const hue = Math.floor(Math.random() * 360) // 0 - 359
  const saturation = 70 + Math.random() * 30   // 70% - 100%
  const lightness = 50 + Math.random() * 10    // 50% - 60%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}