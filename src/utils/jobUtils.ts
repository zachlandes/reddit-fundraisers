import { Devvit } from '@devvit/public-api';
import { TypeKeys } from './typeHelpers.js';
import { fetchPostsToUpdate, getCachedForm } from './Redis.js';

export async function getFundraiserSummary(context: Pick<Devvit.Context, 'redis' | 'reddit'>): Promise<string> {
  const { redis, reddit } = context;
  const postsToUpdate = await fetchPostsToUpdate(redis);
  let summary = '';

  // Get the subreddit name
  const subredditName = await reddit.getCurrentSubreddit().then(subreddit => subreddit.name);

  // Add the subreddit name and column headers to the summary
  summary += `Subreddit: r/${subredditName}\n\n`;
  summary += `PostID,FundraiserID,Raised,Timestamp\n`;

  for (const postId of postsToUpdate) {
    const cachedForm = await getCachedForm(context, postId);
    if (cachedForm) {
      const fundraiserInfo = cachedForm.getAllProps(TypeKeys.everyExistingFundraiserInfo);
      const fundraiserDetails = cachedForm.getAllProps(TypeKeys.fundraiserDetails);
      summary += `${postId},${fundraiserInfo.id},${fundraiserDetails.raised},${new Date().toISOString()}\n`;
    }
  }

  return summary;
}

export async function validateAndCreateJob(
  context: Pick<Devvit.Context, 'scheduler'>,
  jobName: string,
  cronSchedule: string
): Promise<boolean> {
  try {
    const allJobs = await context.scheduler.listJobs();
    const existingJobs = allJobs.filter((job) => job.name === jobName);

    if (existingJobs.length > 0) {
      const sortedJobs = existingJobs.sort((a, b) => 
        (b.data?.data?.timestamp || 0) - (a.data?.data?.timestamp || 0)
      );
      
      for (const job of sortedJobs.slice(1)) {
        try {
          await context.scheduler.cancelJob(job.id);
          console.log(`Deleted job: ${JSON.stringify(job)}`);
        } catch (deleteError) {
          console.error(`Error deleting job ${job.id}:`, deleteError);
          return false;
        }
      }

      // Update the existing job with the new cron schedule
      const existingJob = sortedJobs[0];
      try {
        await context.scheduler.cancelJob(existingJob.id);
        const updatedJobId = await context.scheduler.runJob({
          cron: cronSchedule,
          name: jobName,
          data: {
            type: jobName,
            data: {
              timestamp: Date.now(),
            },
          },
        });
        console.log(`Updated job: ${jobName} with new ID: ${updatedJobId}`);
      } catch (updateError) {
        console.error(`Error updating job ${jobName}:`, updateError);
        return false;
      }
    } else {
      const newJob = {
        cron: cronSchedule,
        name: jobName,
        data: {
          type: jobName,
          data: {
            timestamp: Date.now(),
          },
        },
      };
      const jobId = await context.scheduler.runJob(newJob);
      console.log(`Added new job:`, JSON.stringify({ id: jobId, ...newJob }));
    }

    return true;
  } catch (error) {
    console.error(`Error in validateAndCreateJob for ${jobName}:`, error);
    return false;
  }
}