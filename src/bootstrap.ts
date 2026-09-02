import chalk from "chalk"
import cors from "cors"
import express from "express"
import morgan from "morgan"
import { connectDB } from "./DB/mongoose.connection"
import { redisClient } from "./DB/redis.connection"
import authRouter, { routes as authRoutes } from "./modules/auth/auth.controller"
import chatRouter, { routes as chatRoutes } from "./modules/chat/chat.controller"
import commentRouter, { routes as commentRoutes } from "./modules/comment/comment.controller"
import { initializeIo } from "./modules/gateway/gateway"
import postRouter, { routes as postRoutes } from "./modules/post/post.controller"
import userRouter, { routes as userRoutes } from "./modules/user/user.controller"
import { globalErrorHandler } from "./utils/error.exceptions"

export const bootstrap = async()=> {
  const app = express()
  const port = process.env.PORT
  
  await connectDB()
  await redisClient.connect()

  app.use(cors())
  app.use(express.json())
  app.use(morgan("dev"))
  
  app.use(authRoutes.base, authRouter)
  app.use(userRoutes.base, userRouter)
  app.use(postRoutes.base, postRouter)
  app.use(chatRoutes.base, chatRouter)
  app.use(commentRoutes.base, commentRouter)

  app.use(globalErrorHandler)
  const httpServer = app.listen(port, ()=> {
    console.log(chalk.bgGreen(`Server is running on port ${port}`))
  })
  initializeIo(httpServer)
}