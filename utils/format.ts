import dayjs from "dayjs";

export interface Breakdown {
  years: number;
  months: number;
  days: number;
  hours: number;
}

export const daysSince = (isoDate: string | null): number => {
  if (!isoDate) return 0;
  const d = dayjs(isoDate);
  return d.isValid() ? dayjs().diff(d, "days") : 0;
};

export const breakdown = (isoDate: string | null): Breakdown => {
  if (!isoDate) return { years: 0, months: 0, days: 0, hours: 0 };
  const d = dayjs(isoDate);
  if (!d.isValid()) return { years: 0, months: 0, days: 0, hours: 0 };

  let current = d;
  const now = dayjs();

  const years = now.diff(current, "years");
  current = current.add(years, "years");

  const months = now.diff(current, "months");
  current = current.add(months, "months");

  const days = now.diff(current, "days");
  current = current.add(days, "days");

  const hours = now.diff(current, "hours");

  return { years, months, days, hours };
};

export const parseSavings = (value: string | null): number => {
  if (!value) return 0;
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
};

export const formatAmount = (value: number): string => {
  const roundedValue = Math.round(value * 100) / 100;
  const formattedValue =
    roundedValue % 1 === 0
      ? roundedValue.toFixed(0)
      : roundedValue.toFixed(2);
  return `${formattedValue}€`;
};
