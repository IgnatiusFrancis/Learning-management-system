import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utils/errorHandler";
import { redis } from "../utils/redis";
import jwt, { JwtPayload } from "jsonwebtoken";

export const isAuthenticated = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const accessToken = req.cookies?.accessToken as string;

    if (!accessToken) {
      return next(
        new ErrorHandler("Please login to access this resource", 400)
      );
    }

    try {
      const decoded = jwt.verify(
        accessToken,
        process.env.ACCESSTOKEN as string
      ) as JwtPayload;
      if (!decoded) {
        throw new Error("Access token is not valid");
      }

      const user = await redis.get(decoded.id);

      if (!user) {
        throw new Error("User not found");
      }

      req.user = JSON.parse(user);
      next();
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
