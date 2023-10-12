import {NextFunction, Request, Response} from 'express'
import jwt, {JwtPayload, Secret} from 'jsonwebtoken'
import ejs from 'ejs'
import cloudinary from 'cloudinary'
import path from 'path'
import userModel, {IUser} from '../models/user.model'
import sendMail from '../utils/sendMail'
import ErrorHandler from '../utils/errorHandler'
import {CatchAsyncError} from '../middleware/catchAsyncErrors'
import {accessTokenOptions, refreshTokenOptions, sendToken} from '../utils/jwt'
import {redis} from '../utils/redis'
import {
  getAllUsersService,
  getUserById,
  updateUserRoleService,
} from '../services/user.service'

require('dotenv').config()

interface IRegistrationBody {
  name: string
  email: string
  password: string
  avatar?: string
}

interface IActivationToken {
  token: string
  activationCode: string
  user: IRegistrationBody
}

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {name, email, password} = req.body

      const isEmailExist = await userModel.findOne({email})
      if (isEmailExist) {
        return next(new ErrorHandler('Email already exists', 400))
      }

      const activationToken = createActivationToken({name, email, password})

      await sendActivationEmail(activationToken)

      res.status(201).json({
        success: true,
        message: `Please check your email: ${email} to activate your account`,
        activationToken: activationToken.token,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)

const createActivationToken = (user: IRegistrationBody): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString()

  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET as Secret,
    {expiresIn: '5m'}
  )

  return {token, activationCode, user}
}

const sendActivationEmail = async (activationToken: IActivationToken) => {
  const {user, activationCode} = activationToken
  const data = {user: {name: user.name}, activationCode}
  const html = await ejs.renderFile(
    path.join(__dirname, '../mails/activation-mail.ejs'),
    data
  )

  await sendMail({
    email: user.email,
    subject: 'Activate your account',
    template: 'activation-mail.ejs',
    data,
  })
}

interface IActivationRequest {
  activation_token: string
  activate_code: string
}

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {activate_code, activation_token} = req.body as IActivationRequest

      const newUser = verifyActivationToken(activation_token)

      if (newUser.activationCode !== activate_code) {
        return next(new ErrorHandler('Invalid activation code', 400))
      }

      const {name, email, password} = newUser.user

      const existUser = await userModel.findOne({email})

      if (existUser) {
        return next(new ErrorHandler('Email already exists', 400))
      }

      const user = await userModel.create({name, email, password})

      res.status(201).json({
        success: true,
        user,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)

const verifyActivationToken = (
  token: string
): {user: IUser; activationCode: string} => {
  return jwt.verify(token, process.env.ACTIVATION_SECRET as string) as {
    user: IUser
    activationCode: string
  }
}

// LOGIN USER
interface IloginRequest {
  email: string
  password: string
}

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {email, password} = req.body as IloginRequest
      if (!email || !password) {
        return next(new ErrorHandler('Please enter eamil and password', 400))
      }
      const user = await userModel.findOne({email}).select('+password')
      if (!user) {
        return next(new ErrorHandler('Invalid email or password', 400))
      }

      const isPasswordMatch = await user.comparePassword(password)

      if (!isPasswordMatch) {
        return next(new ErrorHandler('Invalid email or password', 400))
      }

      sendToken(user, 200, res)
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)

export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie('accessToken', '', {maxAge: 1})
      res.cookie('refreshToken', '', {maxAge: 1})

      redis.del(req.user?._id)

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)

// Validate user role

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || '')) {
      return next(
        new ErrorHandler(
          `Role: ${req.user?.role} is not allowed to access this resource`,
          403
        )
      )
    }

    next()
  }
}

// update access token
export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refreshToken as string

      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESHTOKEN as Secret
      ) as JwtPayload

      const message = 'Could not refresh token'
      if (!decoded) {
        return next(new ErrorHandler('Invalid refresh token', 403))
      }

      const session = await redis.get(decoded.id as string)

      if (!session) {
        return next(new ErrorHandler(message, 403))
      }
      const user = JSON.parse(session)

      const accessToken = jwt.sign(
        {id: user._id},
        process.env.ACCESSTOKEN as string,
        {
          expiresIn: '5m',
        }
      )

      const refreshToken = jwt.sign(
        {id: user._id},
        process.env.REFRESHTOKEN as string,
        {
          expiresIn: '3d',
        }
      )

      req.user = user

      // Set cookies
      res?.cookie('accessToken', accessToken, accessTokenOptions)
      res?.cookie('refreshToken', refreshToken, refreshTokenOptions)

      res.status(200).json({
        status: 'success',
        accessToken,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 403))
    }
  }
)

// get user info
export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id
      getUserById(userId, res)
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 403))
    }
  }
)

interface ISocialAuthBody {
  email: string
  name: string
  avatar: string
}

// social auth
export const socialAuth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {email, name, avatar} = req.body as ISocialAuthBody
      const user = await userModel.findOne({email})

      if (!user) {
        const newUser = await userModel.create({email, name, avatar})
        sendToken(newUser, 200, res)
      } else {
        sendToken(user, 200, res)
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)

interface IUpdateUserInfo {
  name?: string
  email?: string
}

export const updateUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {name, email} = req.body as IUpdateUserInfo
      const userId = req.user?._id
      const user = await userModel.findById(userId)

      if (email && user) {
        const isEmailExist = await userModel.findOne({email})
        if (isEmailExist) {
          return next(new ErrorHandler('Email already exist', 400))
        }

        user.email = email
      }

      if (name && user) {
        user.name = name
      }

      await user?.save()

      await redis.set(userId, JSON.stringify(user))

      res.status(201).json({
        success: true,
        user,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)

interface IUpdatePassword {
  oldPassword: string
  newPassword: string
}

export const updatePassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {oldPassword, newPassword} = req.body as IUpdatePassword

      if (!oldPassword || !newPassword) {
        return next(new ErrorHandler('Please enter old and new password', 400))
      }
      const user = await userModel.findById(req.user?._id).select('+password')

      if (user?.password === undefined) {
        return next(new ErrorHandler('Invalid user', 400))
      }

      const isPasswordMatch = await user?.comparePassword(oldPassword)
      if (!isPasswordMatch) {
        return next(new ErrorHandler('Invalid old password', 400))
      }

      user.password = newPassword
      await user?.save()

      await redis.set(req.user?._id, JSON.stringify(user))

      res.status(201).json({
        success: true,
        user,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)

interface IUpdateProfilePicture {
  avatar: string
}

export const updateProfilePicture = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {avatar} = req.body
      const userId = req.user?._id
      const user = await userModel.findById(userId)

      if (avatar && user) {
        if (user?.avatar?.public_id) {
          // Delete old image
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id)

          // set image
          const cloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: 'avatars',
            width: 150,
          })
          user.avatar = {
            public_id: cloud.public_id,
            url: cloud.secure_url,
          }
        } else {
          const cloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: 'avatars',
            width: 150,
          })
          user.avatar = {
            public_id: cloud.public_id,
            url: cloud.secure_url,
          }
        }
      }

      await user?.save()
      await redis.set(userId, JSON.stringify(user))

      res.status(200).json({
        success: true,
        user,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)

// Get All Users Only For Admin
export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllUsersService(req, res)
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)

// Update User Role
export const updateUserRole = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {id, role} = req.body
      updateUserRoleService(res, id, role)
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)

// Delete User Role
export const deleteUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {id} = req.params
      const user = await userModel.findById(id)

      if (!user) {
        return next(new ErrorHandler('User not found', 400))
      }

      await user.deleteOne({id})

      await redis.del(id)

      res.status(200).json({
        success: true,
        message: 'User deleted',
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)
