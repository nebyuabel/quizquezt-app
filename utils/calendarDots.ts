import { format, parseISO } from "date-fns";

export function buildQuizDots(dates: string[]) {
  const dots: Record<string, { dots: { color: string }[] }> = {};

  // Filter out invalid dates and format
  const validDates = dates
    .filter((d) => d && !isNaN(new Date(d).getTime()))
    .map((d) => format(parseISO(d), "yyyy-MM-dd"));

  validDates.forEach((date) => {
    dots[date] = { dots: [{ color: "#a78bfa" }] };
  });

  return dots;
}
