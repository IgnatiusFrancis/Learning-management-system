import {Request, Response} from 'express'
import userModel from '../models/user.model'
import {redis} from '../utils/redis'
import {CatchAsyncError} from '../middleware/catchAsyncErrors'

//get user by id
export const getUserById = async (id: string, res: Response) => {
  const userJson = await redis.get(id)

  if (userJson) {
    const user = JSON.parse(userJson)
    res.status(200).json({
      success: true,
      user,
    })
  }
}

// Get All Users
export const getAllUsersService = async (req: Request, res: Response) => {
  const user = await userModel.find().sort({createdAt: -1})

  if (user) {
    res.status(200).json({
      success: true,
      user,
    })
  }
}

// Get All Users
export const updateUserRoleService = async (
  res: Response,
  id: string,
  role: string
) => {
  const user = await userModel.findByIdAndUpdate(id, {role}, {new: true})

  if (user) {
    res.status(200).json({
      success: true,
      user,
    })
  }
}
