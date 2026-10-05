import { Router } from "express";

const prRouter = Router();

// routes/prs.js
prRouter.get('/repos/:repoId/prs', async (req, res) => {
  const prs = await prService.getRecentPRs(req.params.repoId);
  res.json(prs);
});

export default prRouter;
