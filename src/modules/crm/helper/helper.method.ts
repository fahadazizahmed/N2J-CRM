
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
export function isValidABN(abn: string): boolean {
    // Remove spaces
    const cleaned = abn.replace(/\s+/g, '');
    // Must be exactly 11 digits
    if (!/^\d{11}$/.test(cleaned)) {
        return false;
    }

    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

    const digits = cleaned.split('').map(Number);

    // Subtract 1 from first digit
    digits[0] = digits[0] - 1;

    const total = digits.reduce((sum, digit, index) => {
        return sum + digit * weights[index];
    }, 0);

    return total % 89 === 0;
}


export function isValidPhone(phone: string, countryCode: CountryCode): boolean {
    const parsed = parsePhoneNumberFromString(phone, countryCode);
    console.log("parsed", parsed, "phone", phone, "countryCode", countryCode, "vvv", parsed.isValid())
    return parsed ? parsed.isValid() : false;
}