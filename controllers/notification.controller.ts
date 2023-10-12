import {NextFunction, Request, Response} from 'express'
import cron from 'node-cron'
import {CatchAsyncError} from '../middleware/catchAsyncErrors'
import NotificationModel from '../models/notificationModel'
import ErrorHandler from '../utils/errorHandler'

// Gell all notifications
export const getNotifications = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifications = await NotificationModel.find().sort({createdAt: -1})
      res.status(201).json({success: true, notifications})
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)

// Update notification status
export const updateNotification = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await NotificationModel.findById(req.params.id)

      if (!notification) {
        return next(new ErrorHandler('Notification not found', 404))
      } else {
        notification.status
          ? (notification.status = 'read')
          : notification?.status
      }

      await notification.save()
      const notifications = await NotificationModel.find().sort({createdAt: -1})
      res.status(201).json({success: true, notifications})
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)

cron.schedule('0 0 0 * * *', async () => {
  // 30min, 24hrs, 60min, 60sec, 1000mili
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  await NotificationModel.deleteMany({
    status: 'read',
    createdAt: {$lt: thirtyDaysAgo},
  })
})
