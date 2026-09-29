import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  createMoodForUser,
  deleteMoodForUser,
  getMoodsForUser,
  updateMoodForUser,
} from "../services/moodService";
import { sendControllerError } from "../utils/controllerError";

// Create Mood
export const createMood = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // The controller reads data from the HTTP request and passes it to the service.
    // req.user?.id comes from the JWT middleware; req.body.mood comes from the app.
    const mood = await createMoodForUser(req.user?.id, req.body.mood);

    return res.status(201).json({
      success: true,
      mood,
    });
  } catch (error) {
    return sendControllerError(res, error, "Failed to save mood");
  }
};

// Get All Moods
export const getMoods = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // The service only returns moods that belong to the logged-in user.
    const moods = await getMoodsForUser(req.user?.id);

    return res.json({
      success: true,
      moods,
    });
  } catch (error) {
    return sendControllerError(res, error, "Failed to fetch moods");
  }
};

export const updateMood = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // req.params.id comes from the URL, for example PUT /api/moods/12.
    const mood = await updateMoodForUser(
      req.user?.id,
      Number(req.params.id),
      req.body.mood
    );

    return res.status(200).json({
      success: true,
      mood,
    });
  } catch (error) {
    return sendControllerError(res, error, "Failed to update mood");
  }
};

export const deleteMood = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // Deleting also checks user_id, so a user cannot delete another user's mood.
    await deleteMoodForUser(req.user?.id, Number(req.params.id));

    return res.status(204).send();
  } catch (error) {
    return sendControllerError(res, error, "Failed to delete mood");
  }
};
