// src/index.ts
import app from './app';
import { env } from './config/env';
import { startAllJobs, stopAllJobs } from './jobs';

const PORT = process.env.PORT || 4005;

// Start scheduled jobs
let scheduledJobs: ReturnType<typeof startAllJobs>;

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`✅ Budget Request Microservice running on port ${PORT}`);
  console.log(`📍 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/api/health`);
  console.log('='.repeat(60));

  // Initialize scheduled jobs after server starts
  try {
    scheduledJobs = startAllJobs();
  } catch (error) {
    console.error('Failed to start scheduled jobs:', error);
  }
});

// Graceful shutdown
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  // Stop all scheduled jobs
  if (scheduledJobs) {
    stopAllJobs(scheduledJobs);
  }

  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
