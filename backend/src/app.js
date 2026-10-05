import 'dotenv/config';
import express from "express";
import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import { App } from "@octokit/app";

const app = express();

const webhooks = new Webhooks({
  secret: process.env.WEBHOOK_SECRET
});

const githubApp = new App({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
});

// Sabse pehla event handle karo — pull request open hua
webhooks.on('pull_request.opened', async ({ payload }) => {
  console.log(`PR #${payload.pull_request.number} opened in ${payload.repository.full_name}`);
  
  const octokit = await githubApp.getInstallationOctokit(payload.installation.id);
  
  // STEP 1 KA GOAL: Bas ek dummy comment post karo
  await octokit.rest.issues.createComment({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.pull_request.number,
    body: '🤖 CodeSheriff is analyzing this PR...'
  });
});

// Installation events
webhooks.on('installation.created', async ({ payload }) => {
  console.log(`App installed on ${payload.installation.account.login}`);
  // TODO: Database mein org create karo (Week 2 mein)
});

app.use(createNodeMiddleware(webhooks, { path: '/webhooks/github' }));

export default app;
