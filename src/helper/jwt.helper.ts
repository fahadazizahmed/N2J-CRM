import jwt from 'jsonwebtoken';
export const isValidJWT = (token: string, secretKey: string): any | null => {
  try {
    return jwt.verify(token, secretKey);
  } catch (e) {
    return null;
  }
};