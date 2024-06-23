import { Context } from "@devvit/public-api";
import { getCachedForm, setCachedForm } from "./Redis.js";
import { TypeKeys } from "./typeHelpers.js";
import { EveryFundraiserRaisedDetails } from "../types/index.js";

export function paginateText(description: string, totalHeight: number, lineHeight: number, lineWidth: number, charWidth: number, imageHeight: number, logoHeight: number): string[] {
    // Calculate the maximum number of lines per page considering the heights of images and logos
    const maxLinesPerPage = Math.floor((totalHeight - imageHeight - logoHeight) / lineHeight) - 1;
    console.log(`Total height available: ${totalHeight}px, Max lines per page: ${maxLinesPerPage}`);

    const maxCharsPerLine = Math.floor(lineWidth / charWidth);
    const words = description.split(' ');
    const pages: string[] = [];
    let currentPage = '';
    let currentLine = '';
    let currentLineCount = 0;

    words.forEach(word => {
        // Check if adding this word would exceed the max characters per line
        if (currentLine.length + word.length + 1 > maxCharsPerLine) {
            // If adding this word exceeds the line, add the current line to the page
            currentPage += currentLine + '\n';
            currentLine = word + ' '; // Start a new line with the current word
            currentLineCount++;

            // Check if adding this line exceeds the max lines per page
            if (currentLineCount >= maxLinesPerPage) {
                pages.push(currentPage.trim());
                console.log(`Page added with ${currentLineCount} lines.`);
                currentPage = '';
                currentLineCount = 0;
            }
        } else {
            // If not, add the word to the current line
            currentLine += word + ' ';
        }
    });

    // Add the last line and page if not empty
    if (currentLine) {
        currentPage += currentLine;
    }
    if (currentPage) {
        pages.push(currentPage.trim());
        console.log(`Last page added with ${currentLineCount + 1} lines (including the last line).`);
    }

    return pages;
}

export async function updateCachedFundraiserDetails(context: Context, postId: string, updatedDetails: EveryFundraiserRaisedDetails, fundraiserRaisedDetails: EveryFundraiserRaisedDetails) {
    let cachedForm;
    try {
        cachedForm = await getCachedForm(context, postId);
    } catch (error) {
        console.error(`Error retrieving cached form for postId: ${postId}`, error);
        return; // Exit if we cannot retrieve the form
    }

    if (!cachedForm) {
        console.error(`No cached form found for postId: ${postId}`);
        return;
    }

    if (updatedDetails.raised !== fundraiserRaisedDetails.raised) {
        console.log("Updating the cached form amount raised for postId: " + postId);
        cachedForm.setProp(TypeKeys.fundraiserDetails, 'raised', updatedDetails.raised);
    }

    if (updatedDetails.goalAmount !== fundraiserRaisedDetails.goalAmount) {
        console.log("Updating the cached form goal amount for postId: " + postId);
        cachedForm.setProp(TypeKeys.fundraiserDetails, 'goalAmount', updatedDetails.goalAmount);
    }

    try {
        await setCachedForm(context, postId, cachedForm);
    } catch (error) {
        console.error(`Failed to update cached form for postId: ${postId}`, error);
    }
}

export async function sendFundraiserUpdates(context: Context, postId: string, updatedDetails: EveryFundraiserRaisedDetails) {
    await context.realtime.send('fundraiser_updates', {
        postId: postId,
        raised: updatedDetails.raised,
        goalAmount: updatedDetails.goalAmount
    });
    console.log(`Sent real-time update for postId: ${postId}`);
}
