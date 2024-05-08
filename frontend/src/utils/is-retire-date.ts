export const isRetireDateSoonEnding = (date: string): boolean => {
  const today = new Date();
  const retireDate = new Date(date);
  const diffInTime = retireDate.getTime() - today.getTime();
  const diffInDays = diffInTime / (1000 * 3600 * 24);

  return diffInDays <= 30 && diffInDays >= 0;
};
