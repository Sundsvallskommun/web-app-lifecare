export const validateEmail = (emailText: string): boolean => {
  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  return emailPattern.test(emailText);
};

export const validatePhone = (phoneNumber: string): boolean => {
  const phonePattern = /^\+46\d{9}$/;
  return phonePattern.test(phoneNumber);
};

export const luhnCheck = (str: string): boolean => {
  // Remove dashes and any other non-numeric characters
  const cleanStr = str.replace(/[^0-9]/g, '');

  // Consider only the last 10 digits for Luhn check
  const last10Digits = cleanStr.slice(-10);

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let v = parseInt(last10Digits[i]);
    // Alternate doubling starting from the rightmost (second last in zero-based index)
    v *= 2 - (i % 2);
    if (v > 9) {
      v -= 9;
    }
    sum += v;
  }

  return sum % 10 === 0;
};
