import {NextFunction, Request, Response} from 'express'
import sendMail from '../utils/sendMail'
import mongoose from 'mongoose'
import path from 'path'
import ejs from 'ejs'
import ErrorHandler from '../utils/errorHandler'
import {CatchAsyncError} from '../middleware/catchAsyncErrors'
import userModel from '../models/user.model'
import CourseModel, {Icourse} from '../models/course.model'
import {getAllOrdersService, newOrder} from '../services/order.service'
import {IOrder} from '../models/orderModel'
import NotificationModel from '../models/notificationModel'
import {redis} from '../utils/redis'

export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {courseId, payment_info} = req.body as IOrder
      const user = await userModel.findById(req.user?._id)

      if (!courseId) {
        return next(new ErrorHandler('Enter a courseID', 400))
      }

      const courseExistInUser = user?.courses.some(
        (course: any) => course._id.toString() === courseId
      )

      if (courseExistInUser) {
        return next(
          new ErrorHandler('You have already purchased this course', 400)
        )
      }
      const course: Icourse | null = await CourseModel.findById(courseId)

      //   const course = await CourseModel.findById(courseId)

      if (!course) {
        return next(new ErrorHandler('Course not found', 400))
      }

      const data: any = {
        courseId: course._id,
        userId: user?._id,
        payment_info,
      }

      const mailData = {
        order: {
          _id: course._id.toString().slice(0, 6),
          name: course.name,
          price: course.price,
          date: new Date().toLocaleDateString('en-us', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        },
      }

      const html = ejs.renderFile(
        path.join(__dirname, '../mails/order-confirmation.ejs'),
        {order: mailData}
      )

      try {
        if (user) {
          await sendMail({
            email: user.email,
            subject: 'Order Confirmation',
            template: 'order-confirmation.ejs',
            data: mailData,
          })
        }
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
      }

      user?.courses.push(course?._id)
      await user?.save()

      // await redis.set(req.user?._id, JSON.stringify(userRes))

      await NotificationModel.create({
        userId: user?._id,
        title: 'New Order',
        message: `You have a new order from ${course?.name}`,
      })

      if (course.purchased !== null && course.purchased !== undefined) {
        course.purchased = (course.purchased || 0) + 1
      }
      await course.save()
      //await redis.set(req.user?._id, JSON.stringify(courseRes))
      newOrder(data, res, next)
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500))
    }
  }
)

// Get All Orders Only For Admin
export const getAllOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllOrdersService(req, res, next)
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)
