import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { router as userRouter } from "./routes/user.routes.js";

import { errorHandler } from "./middlewares/errorhandler.middleware.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(
  express.json({
    limit: "16kb",
  })
);
// encode data coming from the url
app.use(express.urlencoded({ limit: "16kb" }));
// Store static assets (pdf, images) on server
app.use(express.static("public"));
1;
// Access client cokkies from server
app.use(cookieParser());

// routes declaration
app.use("/api/v1/users", userRouter);

app.use("/", errorHandler);

export { app };
