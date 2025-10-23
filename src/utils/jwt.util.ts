// src/utils/jwt.util.ts
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/constants';
import { JWTPayload } from '../types/api';

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
