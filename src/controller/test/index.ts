import { NextFunction, Request, Response } from "express";

export const TestRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.status(200).json({ message: "all Okay" });
  } catch (err) {
    next(err);
  }
};
