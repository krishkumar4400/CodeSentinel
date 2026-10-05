// controllers/prController.js — HTTP layer (request/response handling)
import * as prService from "../services/prService.js";

export const listPRs = async (req, res, next) => {
  try {
    const { repoId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const prs = await prService.getRecentPRs(repoId, { page, limit });

    res.status(200).json({ success: true, data: prs });
  } catch (error) {
    next(error); // errorHandler middleware handle karega
  }
};

export const getPRComments = async (req, res, next) => {
  try {
    const { prId } = req.params;
    const comments = await prService.getReviewComments(prId);
    res.status(200).json({ success: true, data: comments });
  } catch (error) {
    next(error);
  }
};
