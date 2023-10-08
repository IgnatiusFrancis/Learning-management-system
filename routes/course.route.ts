import express from "express";
import { isAuthenticated } from "../middleware/auth";
import {
  editCourse,
  getAllCourses,
  getSingleCourse,
  uploadCourse,
} from "../controllers/course.controller";
import { authorizeRoles } from "../controllers/user.controller";
const courseRouter = express.Router();

courseRouter.post(
  "/create-course",
  isAuthenticated,
  authorizeRoles("admin"),
  uploadCourse
);

courseRouter.put(
  "/edit-course/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  editCourse
);

courseRouter.get("/get-course/:id", getSingleCourse);
courseRouter.get("/get-courses", getAllCourses);

export default courseRouter;
