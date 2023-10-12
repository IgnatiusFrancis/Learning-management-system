import {Request, Response} from 'express'
import {CatchAsyncError} from '../middleware/catchAsyncErrors'
import OrderModel from '../models/orderModel'

export const newOrder = CatchAsyncError(async (data: any, res: Response) => {
  const order = await OrderModel.create(data)

  res.status(201).json({
    success: true,
    order,
  })
})

// Get All Orders
export const getAllOrdersService = CatchAsyncError(
  async (req: Request, res: Response) => {
    const orders = await OrderModel.find().sort({createdAt: -1})

    res.status(201).json({
      Success: true,
      orders,
    })
  }
)
