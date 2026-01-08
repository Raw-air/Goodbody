
export interface WorkoutRecord {
  date: string; // ISO string YYYY-MM-DD
  completed: boolean;
}

export interface MonthData {
  year: number;
  month: number;
}

export interface AICoachResponse {
  message: string;
  advice: string;
  rating: number; // 1-5
}
