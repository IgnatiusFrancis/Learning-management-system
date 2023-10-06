import { NextFunction, Request, Response } from "express";
import jwt, { Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import userModel, { IUser } from "../models/user.model";
import sendMail from "../utils/sendMail";
import ErrorHandler from "../utils/errorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import { sendToken } from "../utils/jwt";

require("dotenv").config();

interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

interface IActivationToken {
  token: string;
  activationCode: string;
  user: IRegistrationBody;
}

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        return next(new ErrorHandler("Email already exists", 400));
      }

      const activationToken = createActivationToken({ name, email, password });

      await sendActivationEmail(activationToken);

      res.status(201).json({
        success: true,
        message: `Please check your email: ${email} to activate your account`,
        activationToken: activationToken.token,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

const createActivationToken = (user: IRegistrationBody): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET as Secret,
    { expiresIn: "5m" }
  );

  return { token, activationCode, user };
};

const sendActivationEmail = async (activationToken: IActivationToken) => {
  const { user, activationCode } = activationToken;
  const data = { user: { name: user.name }, activationCode };
  const html = await ejs.renderFile(
    path.join(__dirname, "../mails/activation-mail.ejs"),
    data
  );

  await sendMail({
    email: user.email,
    subject: "Activate your account",
    template: "activation-mail.ejs",
    data,
  });
};

interface IActivationRequest {
  activation_token: string;
  activate_code: string;
}

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activate_code, activation_token } =
        req.body as IActivationRequest;

      const newUser = verifyActivationToken(activation_token);

      if (newUser.activationCode !== activate_code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const { name, email, password } = newUser.user;

      const existUser = await userModel.findOne({ email });

      if (existUser) {
        return next(new ErrorHandler("Email already exists", 400));
      }

      const user = await userModel.create({ name, email, password });

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

const verifyActivationToken = (
  token: string
): { user: IUser; activationCode: string } => {
  return jwt.verify(token, process.env.ACTIVATION_SECRET as string) as {
    user: IUser;
    activationCode: string;
  };
};

// LOGIN USER
interface IloginRequest {
  email: string;
  password: string;
}

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as IloginRequest;
      if (!email || !password) {
        return next(new ErrorHandler("Please enter eamil and password", 400));
      }
      const user = await userModel.findOne({ email }).select("+password");
      if (!user) {
        return next(new ErrorHandler("Invalid email or password", 400));
      }

      const isPasswordMatch = await user.comparePassword(password);

      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid email or password", 400));
      }

      sendToken(user, 200, res);

      const accessToken = user.signAccessToken();
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
