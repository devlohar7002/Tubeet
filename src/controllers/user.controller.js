import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { z } from "zod";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details form frontend - OK
  // check Validation - OK
  // if username and email exists throw error - OK
  // check for images, check for avatar
  // upload on cloudinary, avatar
  // create user object - create user in db
  // remove password and refresh token field from respinse
  //check for user creation
  // return response

  const { fullname, username, email, password } = req.body;

  if (
    [fullname, email, username, password].some((entry) => entry.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const validationSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(6),
  });

  const emailValidation = z.string().trim().email().safeParse(email);
  const passwordValidation = z.string().trim().min(6).safeParse(password);
  if (emailValidation.success == false) {
    throw new ApiError(400, "email is not valid");
  }
  if (passwordValidation.success == false) {
    throw new ApiError(400, "minimum 6 characters are required in password");
  }

  // User check in DB
  const existingUser = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });

  if (existingUser) {
    throw new ApiError(409, "user with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  let coverImage = "";
  if (coverImageLocalPath) {
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  }

  if (!avatar) {
    throw new ApiError(400, "Avatar file is not supported");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage,
    username: username.toLowerCase(),
    email,
    password,
  });

  // remove password and refreshToken from the user when you find it.
  // password and refereshToken are in the DB but not in the varibale
  const createdUser = await User.findById(user._id).select(
    "-password -refereshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

export { registerUser };
