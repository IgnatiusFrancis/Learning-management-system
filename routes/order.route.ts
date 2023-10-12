import express from 'express'
import {isAuthenticated} from '../middleware/auth'
import {authorizeRoles} from '../controllers/user.controller'
import {createOrder, getAllOrders} from '../controllers/order.controller'
const orderRouter = express.Router()

orderRouter.post(
  '/create-order',
  isAuthenticated,
  // authorizeRoles("admin"),
  createOrder
)

orderRouter.get(
  '/get-orders',
  isAuthenticated,
  // authorizeRoles("admin"),
  getAllOrders
)

export default orderRouter
