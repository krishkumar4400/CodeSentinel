// services/prService.js — SIRF business logic, HTTP ka koi concept nahi
import prisma from "../config/db.js";

export const getRecentPRs = async (repoId, { page, limit }) => {
  return prisma.pullRequest.findMany({
    where: { repoId },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
};

export const getReviewComments = async (prId) => {
  return prisma.reviewComment.findMany({ where: { prId } });
};
