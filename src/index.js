/*  packages */
import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";

/* project imports */
import connectDB from "./configuration/databaseConfig.js";
import userRouter from "./routes/user.route.js";

/* set variable */
const app = express();

/*  set built-in middleware */
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.CROSS_ORIGIN,
    credentials: true,
  })
);

/* set dotenv config */
dotenv.config({
  path: "../.env",
});

/* set routes */
app.use("/api/v1/users", userRouter);

/* set gloabal level error middleware */

/* database connection and app listen to port */
(() =>
  connectDB().then((resolve) => {
    try {
      app.listen(process.env.PORT, () => {
        const { port } = resolve.connection;
        console.log(`db connect at port ${port}`);
        console.log(`app working => ${process.env.PORT}`);
      });
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  }))();
