
export const developmentOnly = (req, res, next) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({
      success: false,
      message: "Route not found",
    });
  }

  next();
};
