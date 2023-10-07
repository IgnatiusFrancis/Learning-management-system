// require("dotenv").config();
// import { Response } from "express";
// import { redis } from "./redis";
// import { IUser } from "../models/user.model";

// interface ITokenOptions {
//   expires: Date;
//   maxAge: number;
//   httpOnly: boolean;
//   sameSite: "lax" | "strict" | "none" | undefined;
//   secure?: boolean;
// }

// export const sendToken = (user: IUser, statusCode: number, res: Response) => {
//   const accessToken = user.signAccessToken();
//   const refreshToken = user.signRefreshToken();

//   // Upload session to redis
//   redis.set(user._id, JSON.stringify(user) as any);

//   // Parse env to integrate with fallback values
//   const accessTokenExpire = parseInt(
//     process.env.ACCESS_TOKEN_EXPIRE || "300",
//     10
//   );
//   const refreshTokenExpire = parseInt(
//     process.env.REFRESH_TOKEN_EXPIRE || "1200",
//     10
//   );

//   // uploads for cookies
//   const accessTokenOptions: ITokenOptions = {
//     expires: new Date(Date.now() + accessTokenExpire * 1000),
//     maxAge: accessTokenExpire * 1000,
//     httpOnly: true,
//     sameSite: "lax",
//   };

//   const refreshTokenOptions: ITokenOptions = {
//     expires: new Date(Date.now() + refreshTokenExpire * 1000),
//     maxAge: refreshTokenExpire * 1000,
//     httpOnly: true,
//     sameSite: "lax",
//   };

//   // set secure true in prod
//   if (process.env.NODE_ENV === "production") {
//     accessTokenOptions.secure = true;
//   }

//   res.cookie("access_token", accessToken, accessTokenOptions);
//   res.cookie("refresh_token", refreshToken, refreshTokenOptions);

//   console.log(res.cookie);

//   res.status(statusCode).json({
//     success: true,
//     user,
//     accessToken,
//   });
// };

import { Response } from "express";
import { IUser } from "../models/user.model";
import { redis } from "./redis";

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}

const getDefaultTokenOptions = (
  expireInSeconds: number,
  day: number
): ITokenOptions => ({
  expires: new Date(Date.now() + expireInSeconds * day * 60 * 60 * 1000),
  maxAge: expireInSeconds * day * 60 * 60 * 1000, // Convert to milliseconds
  httpOnly: true,
  sameSite: "lax",
});

const accessTokenExpire = parseInt(
  process.env.ACCESS_TOKEN_EXPIRE || "300",
  10
);
const refreshTokenExpire = parseInt(
  process.env.REFRESH_TOKEN_EXPIRE || "1200",
  10
);

export const accessTokenOptions: ITokenOptions = {
  ...getDefaultTokenOptions(accessTokenExpire, 1),
  secure: process.env.NODE_ENV === "production",
};

export const refreshTokenOptions: ITokenOptions = {
  ...getDefaultTokenOptions(refreshTokenExpire, 24),
  secure: process.env.NODE_ENV === "production",
};

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessToken = user.signAccessToken();
  const refreshToken = user.signRefreshToken();

  // Upload session to redis
  redis.set(user._id, JSON.stringify(user));

  // Set cookies
  res?.cookie("accessToken", accessToken, accessTokenOptions);
  res?.cookie("refreshToken", refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
  });
};
