import { format, parseISO, differenceInDays, subDays } from "date-fns";

export function calculateStreak(quizDays: string[]): number {
  if (!quizDays || quizDays.length === 0) return 0;

  // Filter out any invalid dates and ensure they are parsed, then sort in descending order
  const validAndSortedDates = [...quizDays]
    .filter((d) => d && !isNaN(parseISO(d).getTime())) // Filter out invalid date strings
    .map((dateStr) => format(parseISO(dateStr), "yyyy-MM-dd")) // Standardize format
    .sort((a, b) => b.localeCompare(a)); // Sort strings lexicographically (descending)

  if (validAndSortedDates.length === 0) return 0;

  let streak = 0;
  const today = format(new Date(), "yyyy-MM-dd"); // Get today's date in 'yyyy-MM-dd' format

  // If the most recent recorded activity is not today, the streak is 0.
  // This handles cases where the user missed a day or hasn't done anything today yet.
  if (validAndSortedDates[0] !== today) {
    return 0;
  }

  // Start counting the streak from today
  let currentDate = new Date();
  for (const dateStr of validAndSortedDates) {
    const formattedCurrentDate = format(currentDate, "yyyy-MM-dd");

    if (formattedCurrentDate === dateStr) {
      streak++;
      currentDate = subDays(currentDate, 1); // Move to the previous day
    } else {
      // If the date is not consecutive (or is a future date from the sorted list, which shouldn't happen)
      // then the streak is broken.
      break;
    }
  }

  return streak;
}

export function formatDateForStorage(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getLast7Days(): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(format(subDays(new Date(), i), "yyyy-MM-dd"));
  }
  return dates.reverse(); // Return in ascending order for streak bar display
}
