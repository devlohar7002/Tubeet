import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

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

// Access client cokkies from server
app.use(cookieParser());

export { app };
