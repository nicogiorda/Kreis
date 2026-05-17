import type { NextFunction, Request, Response } from "express";

type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export function sendNotFound(_request: Request, response: Response<ApiErrorBody>): void {
  response.status(404).json({
    error: {
      code: "not_found",
      message: "Route not found"
    }
  });
}

export function sendError(error: unknown, _request: Request, response: Response<ApiErrorBody>, _next: NextFunction): void {
  console.error(error);

  response.status(500).json({
    error: {
      code: "internal_error",
      message: "Internal server error"
    }
  });
}
