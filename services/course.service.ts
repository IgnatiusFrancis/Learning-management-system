import {Response} from 'express'
import {CatchAsyncError} from '../middleware/catchAsyncErrors'
import CourseModel from '../models/course.model'

//Create course
export const createCourse = CatchAsyncError(
  async (data: any, res: Response, req: Request) => {
    const course = await CourseModel.create(data)
    // await redis.set(req.user?._id, JSON.stringify(course))

    res.status(200).json({
      success: true,
      course,
    })
  }
)

// Get All Courses
export const getAllCoursesService = CatchAsyncError(async (res: Response) => {
  const courses = await CourseModel.find().sort({createdAt: -1})

  res.status(201).json({
    Success: true,
    courses,
  })
})
