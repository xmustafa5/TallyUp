import { format } from '@/constants/theme';

const AR_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const AR_WEEKDAYS = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const arMonth = (d: Date) => AR_MONTHS[d.getMonth()];
export const arWeekday = (d: Date) => AR_WEEKDAYS[d.getDay()];

export const arMonthYear = (d: Date) =>
  `${AR_MONTHS[d.getMonth()]} ${format.toArabicDigits(d.getFullYear())}`;

export const arFullDate = (d: Date) =>
  `${format.toArabicDigits(d.getDate())} ${AR_MONTHS[d.getMonth()]} ${format.toArabicDigits(d.getFullYear())}`;

export const arWeekdayDate = (d: Date) =>
  `${AR_WEEKDAYS[d.getDay()]} ${format.toArabicDigits(d.getDate())} ${AR_MONTHS[d.getMonth()]}`;

export const arDateTime = (d: Date) => {
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  const period = d.getHours() >= 12 ? 'م' : 'ص';
  return `${format.toArabicDigits(d.getDate())} ${AR_MONTHS[d.getMonth()]} • ${format.toArabicDigits(h)}:${format.toArabicDigits(m)} ${period}`;
};
