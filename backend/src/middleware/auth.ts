import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

export interface AuthenticatedRequest extends Request {
  user?: any;
  token?: string;
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authentication signature." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const jwtSecret = process.env.JWT_SECRET || "SUPER_SECURE_CYBER_JWT_SECRET";
    const decoded: any = jwt.verify(token, jwtSecret);
    
    const user = await User.findById(decoded.id);
    if (!user || !user.active) {
      return res.status(403).json({ error: "User is disabled or missing." });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid authentication credentials." });
  }
};
