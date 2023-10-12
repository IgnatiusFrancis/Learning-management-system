import express from 'express'
import {isAuthenticated} from '../middleware/auth'
import {
  addAnswer,
  addQuestion,
  addReplyToReview,
  addReview,
  deleteCourse,
  editCourse,
  getAllCourses,
  getCourseByUser,
  getCourses,
  getSingleCourse,
  uploadCourse,
} from '../controllers/course.controller'
import {authorizeRoles} from '../controllers/user.controller'
const courseRouter = express.Router()

courseRouter.post(
  '/create-course',
  isAuthenticated,
  authorizeRoles('admin'),
  uploadCourse
)

courseRouter.put(
  '/edit-course/:id',
  isAuthenticated,
  authorizeRoles('admin'),
  editCourse
)

courseRouter.get('/get-course/:id', getSingleCourse)
courseRouter.get('/get-courses', getAllCourses)
courseRouter.get('/get-course-content/:id', isAuthenticated, getCourseByUser)

courseRouter.put('/add-question', isAuthenticated, addQuestion)
courseRouter.put('/add-answer', isAuthenticated, addAnswer)
courseRouter.put('/add-review/:id', isAuthenticated, addReview)
courseRouter.put(
  '/add-reply',
  isAuthenticated,
  authorizeRoles('admin'),
  addReplyToReview
)

courseRouter.get(
  '/get-all-courses',
  isAuthenticated,
  authorizeRoles('admin'),
  getCourses
)

courseRouter.delete(
  '/delete-course/:id',
  isAuthenticated,
  authorizeRoles('admin'),
  deleteCourse
)

export default courseRouter
