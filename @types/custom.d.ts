import { Request } from "express";
import { IUser } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: IUser; // This line should correctly declare the user property
    }
  }
}
