import express from 'express';

const app = express();

// middlewares
app.use(express.json({limit: "16kb"}));

export default app;