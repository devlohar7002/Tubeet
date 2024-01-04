import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { z } from "zod";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefereshAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

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

  // const { fullname, username, email, password } = req.body;
  const userDetails = [
    req.body.fullname,
    req.body.username,
    req.body.email,
    req.body.password,
  ].map((entry) => entry?.trim());
  console.log(userDetails);

  userDetails.forEach((user, index) => {
    if (user === "" || user === undefined) {
      throw new ApiError(400, "All fields are required");
    }
  });

  const [fullname, username, email, password] = userDetails;

  // if (
  //   [fullname, email, username, password].some(
  //     (entry) => entry?.trim() === "" || entry?.trim() === undefined
  //   )
  // ) {
  //   throw new ApiError(400, "All fields are required");
  // }
  const alphaRegex = /^[a-zA-Z\s]+$/;

  if (!alphaRegex.test(fullname)) {
    throw new ApiError(400, "fullname is not valid");
  }

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

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  console.log("hhh ", req.files?.coverImage?.[0]?.path);
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  console.log("sadhk", coverImageLocalPath);
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is not supported");
  }
  const fullnameReconstruct = fullname.split(/\s+/);
  const user = await User.create({
    fullname: (
      fullnameReconstruct[0] +
      " " +
      (fullnameReconstruct?.[1] || "")
    ).trim(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    username: username.toLowerCase(),
    email,
    password,
  });

  // remove password and refreshToken from the user when you find it.
  // password and refereshToken are in the DB but not in the varibale
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // extract username and password from req.body
  // validate that user exists with username
  // validate that password is correct
  // generate access token and refresh tokens
  // send tokens via secure cookies

  const [username, password] = [req.body.username, req.body.password].map(
    (entry) => entry?.trim()
  );
  if (!username || !password) {
    throw new ApiError(400, "username or password is required");
  }

  const existingUser = await User.findOne({ username: username });

  if (!existingUser) {
    throw new ApiError(404, "User does not exists");
  }

  const isPasswordCorrect = await existingUser.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    existingUser._id
  );

  const loggedInUser = await User.findById(existingUser._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refeshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
