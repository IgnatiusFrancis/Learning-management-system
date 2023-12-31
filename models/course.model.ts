import mongoose, {Document, Model, model, Schema} from 'mongoose'
import {IUser} from './user.model'

interface IComment extends Document {
  user: IUser
  question: string
  questionReplies: IComment[]
}

interface IReview extends Document {
  user: IUser
  comment: string
  rating: number
  commentReplies?: IComment[]
}

interface ILink extends Document {
  title: string
  url: string
}

interface ICourseData extends Document {
  title: string
  description: string
  videoUrl: string
  videoThumbnail: object
  videoSection: string
  videoLength: number
  videoPlayer: string
  links: ILink[]
  suggestion: string
  questions: IComment[]
}

export interface Icourse extends Document {
  name: string
  description: string
  price: number
  estimatedPrice?: number
  thumbnail: object
  tags: string
  level: string
  demoUrl: string
  benefits: {title: string}[]
  prerequisites: {title: string}
  reviews: IReview[]
  courseData: ICourseData[]
  ratings?: number
  purchased?: number
}

const reviewSchema = new Schema<IReview>({
  user: Object,
  rating: {
    type: Number,
    default: 0,
  },
  comment: String,
  commentReplies: [Object],
})

const linkSchema = new Schema<ILink>({
  title: String,
  url: String,
})

const commentSchema = new Schema<IComment>({
  user: Object,
  question: String,
  questionReplies: [Object],
})

const courseDataSchema = new Schema<ICourseData>({
  videoUrl: String,
  // videoThumbnail: String,
  title: String,
  videoSection: String,
  description: String,
  videoLength: Number,
  links: [linkSchema],
  suggestion: String,
  questions: [commentSchema],
})

const courseSchema = new Schema<Icourse>({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  estimatedPrice: {
    type: Number,
  },
  thumbnail: {
    public_id: {
      // required: true,
      type: String,
    },
    url: {
      // required: true,
      type: String,
    },
  },
  tags: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    required: true,
  },
  demoUrl: {
    type: String,
    required: true,
  },
  benefits: [{title: String}],
  prerequisites: [{title: String}],
  reviews: [reviewSchema],
  courseData: [courseDataSchema],
  ratings: {
    type: Number,
    default: 0,
  },
  purchased: {
    type: Number,
    default: 0,
  },
})

const CourseModel: Model<Icourse> = mongoose.model('Course', courseSchema)
export default CourseModel
