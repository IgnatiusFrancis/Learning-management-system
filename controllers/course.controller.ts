import {NextFunction, Request, Response} from 'express'
import cloudinary from 'cloudinary'
import {CatchAsyncError} from '../middleware/catchAsyncErrors'
import ErrorHandler from '../utils/errorHandler'
import {createCourse} from '../services/course.service'
import CourseModel from '../models/course.model'
import {redis} from '../utils/redis'
import mongoose from 'mongoose'
import path from 'path'
import ejs from 'ejs'
import sendMail from '../utils/sendMail'
import NotificationModel from '../models/notificationModel'

export const uploadCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id
      const data = req.body
      const thumbnail = data.thumbnail

      if (thumbnail) {
        const cloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: 'course',
        })

        data.thumbnail = {
          public_id: cloud.public_id,
          url: cloud.secure_url,
        }
      }

      createCourse(data, res, next)
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)

export const editCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body
      const thumbnail = data.thumbnail

      if (thumbnail) {
        await cloudinary.v2.uploader.destroy(thumbnail.public_id)

        const cloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: 'course',
        })

        data.thumbnail = {
          public_id: cloud.public_id,
          url: cloud.secure_url,
        }
      }

      const courseId = req.params.id
      const course = await CourseModel.findByIdAndUpdate(
        courseId,
        {
          $set: data,
        },
        {new: true}
      )

      res.status(201).json({
        success: true,
        course,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500))
    }
  }
)

export const getSingleCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id
      const catchedData = await redis.get(courseId)

      if (catchedData) {
        const course = JSON.parse(catchedData)
        res.status(200).json({
          success: true,
          course,
        })
      } else {
        const course = await CourseModel.findById(req.params.id).select(
          '-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links'
        )

        await redis.set(courseId, JSON.stringify(course))

        res.status(201).json({
          success: true,
          course,
        })
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500))
    }
  }
)

export const getAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const catchedData = await redis.get('allCourses')

      if (catchedData) {
        const courses = JSON.parse(catchedData)
        res.status(200).json({
          success: true,
          courses,
        })
      } else {
        const courses = await CourseModel.find().select(
          '-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links'
        )

        await redis.set('allCourses', JSON.stringify(courses))

        res.status(201).json({
          success: true,
          courses,
        })
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500))
    }
  }
)

export const getCourseByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses
      const courseId = req.params.id

      const courseExist = userCourseList?.find(
        (course: any) => course._id === courseId
      )

      if (!courseExist) {
        return next(
          new ErrorHandler('You are not eligible to access this course', 404)
        )
      }

      const course = await CourseModel.findById(courseId)

      const content = course?.courseData
      res.status(200).json({
        success: true,
        content,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500))
    }
  }
)

// Add Question in course
interface IAddQuestionData {
  question: string
  courseId: string
  contentId: string
}

export const addQuestion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {question, courseId, contentId}: IAddQuestionData = req.body
      const course = await CourseModel.findById(courseId)

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler('Invalid content id', 400))
      }
      const courseContent = course?.courseData?.find((item: any) =>
        item._id.equals(contentId)
      )
      if (!courseContent) {
        return next(new ErrorHandler('Invalid content id', 400))
      }

      const newQuestion: any = {
        user: req.user,
        question,
        questionReplies: [],
      }

      // add question to course content
      courseContent.questions.push(newQuestion)

      await NotificationModel.create({
        user: req.user?._id,
        title: 'New Question Received',
        message: `You have a new question in your course title ${courseContent?.title}`,
      })

      // save the updated course
      await course?.save()

      res.status(200).json({
        success: true,
        course,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500))
    }
  }
)

interface IaddAnswerData {
  answer: string
  courseId: string
  contentId: string
  questionId: string
}

// add answer in course question
export const addAnswer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {answer, courseId, contentId, questionId}: IaddAnswerData = req.body

      const course = await CourseModel.findById(courseId)

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler('Invalid content id', 400))
      }

      const courseContent = course?.courseData?.find((item: any) =>
        item._id.equals(contentId)
      )

      if (!courseContent) {
        return next(new ErrorHandler('Invalid content id', 400))
      }

      const question = courseContent?.questions?.find((item: any) =>
        item._id.equals(questionId)
      )

      if (!question) {
        return next(new ErrorHandler('Invalid question id', 400))
      }

      // Create a new answer object
      const newAnswer: any = {
        user: req.user,
        answer,
      }

      // add question to course content
      question.questionReplies.push(newAnswer)

      // save the updated course
      await course?.save()

      if (req.user?._id === question.user._id) {
        // create a notification
        await NotificationModel.create({
          user: req.user?._id,
          title: 'New Question Reply Received',
          message: `You have a new question reply in ${courseContent?.title}`,
        })
      } else {
        const data = {
          name: question.user.name,
          title: courseContent.title,
        }

        const html = await ejs.renderFile(
          path.join(__dirname, '../mails/question-reply.ejs')
        )

        try {
          await sendMail({
            email: question.user.email,
            subject: 'Question Reply',
            template: 'question-reply.ejs',
            data,
          })
        } catch (error: any) {
          return next(new ErrorHandler(error.message, 500))
        }
      }

      res.status(200).json({
        success: true,
        course,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500))
    }
  }
)

// add review in course

interface IAddReviewData {
  review: string
  rating: number
  userId: string
}

export const addReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userContentList = req.user?.courses
      const courseId = req.params.id

      // Check if courseId already exist in userCourseList
      const courseExist = userContentList?.some(
        (course: any) => course._id === courseId
      )

      if (!courseExist) {
        return next(
          new ErrorHandler('You are not eligible to access this course', 404)
        )
      }
      const course = await CourseModel.findById(courseId)

      const {review, rating} = req.body as IAddReviewData

      const reviewData: any = {
        user: req.user,
        comment: review,
        rating,
      }

      course?.reviews.push(reviewData)

      let avg = 0

      course?.reviews.forEach((rev: any) => {
        avg += rev.rating
      })

      if (course) {
        course.ratings = avg / course.reviews.length
      }

      await course?.save()

      const notification = {
        title: 'New Review Received',
        message: `${req.user?.name} has given a review in ${course?.name}`,
      }

      // create notification

      res.status(200).json({
        success: true,
        course,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500))
    }
  }
)

// Add review reply

interface IAddReviewData {
  comment: string
  courseId: string
  reviewId: string
}

export const addReplyToReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {comment, courseId, reviewId} = req.body as IAddReviewData
      const course = await CourseModel.findById(courseId)

      if (!course) {
        return next(new ErrorHandler('Course not found', 404))
      }

      const review = course?.reviews?.find((rev: any) => {
        return rev._id.toString() === reviewId
      })

      if (!review) {
        return next(new ErrorHandler('Review not found', 404))
      }

      const replyData: any = {
        user: req.user,
        comment,
      }

      if (!review.commentReplies) {
        review.commentReplies = []
      }

      review.commentReplies?.push(replyData)
      await course?.save()

      res.status(200).json({
        success: true,
        course,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500))
    }
  }
)

// Get All Courses Only For Admin
export const getCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllCourses(req, res, next)
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)

// Delete Course for admin
export const deleteCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {id} = req.params
      const course = await CourseModel.findById(id)

      if (!course) {
        return next(new ErrorHandler('Course not found', 400))
      }

      await course.deleteOne({id})

      await redis.del(id)

      res.status(200).json({
        success: true,
        message: 'Course deleted',
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
  }
)
