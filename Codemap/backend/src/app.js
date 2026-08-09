import express from 'express';

const app = express();

// middlewares
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// routes

export default app;
