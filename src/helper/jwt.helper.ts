import jwt from 'jsonwebtoken';
/**
 * Validates a JWT token and returns the decoded payload if valid.
 * Returns false if invalid or expired.
 * @param token The JWT token string to verify
 */
// export const isValidJWT = (token: string, secretKey: string): any | boolean => {
//     try {
//         const decoded = jwt.verify(token, secretKey, {
//             complete: false // 'json: true' in user code likely meant 'return payload', which is default behavior without 'complete: true'
//         });
//         return decoded;
//     } catch (e) {
//         return false;
//     }
// };
export const isValidJWT = (token: string, secretKey: string): any | null => {
    try {
      return jwt.verify(token, secretKey);
    } catch (e) {
      return null;
    }
  };