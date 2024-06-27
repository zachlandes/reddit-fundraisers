import { Context } from "@devvit/public-api";
import { getCachedForm, setCachedForm } from "./Redis.js";
import { TypeKeys } from "./typeHelpers.js";
import { EveryFundraiserRaisedDetails } from "../types/index.js";

/**
 * Splits a long text into pages based on the given dimensions and formatting constraints.
 * @param description The text to paginate.
 * @param totalHeight Total available height for the text.
 * @param lineHeight Height of each line of text.
 * @param lineWidth Width available for text on each line.
 * @param charWidth Average character width.
 * @param imageHeight Height of any images above the text.
 * @param logoHeight Height of any logos above the text.
 * @returns An array of arrays of strings, where each inner array represents a page of text.
 */
export function paginateText(description: string, totalHeight: number, lineHeight: number, lineWidth: number, charWidth: number, imageHeight: number, logoHeight: number): string[][] {
    const maxLinesPerPage = Math.floor((totalHeight - imageHeight - logoHeight) / lineHeight) - 1;
    const maxCharsPerLine = Math.floor(lineWidth / charWidth);
    const lines = description.split('\n');
    const pages: string[][] = [];
    let currentPage: string[] = [];
    let consecutiveBlankLines = 0;

    lines.forEach(line => {
        if (line.trim().length === 0) {
            // Preserve empty lines, but limit consecutive blank lines
            if (consecutiveBlankLines < 2) {
                currentPage.push('');
                consecutiveBlankLines++;
            }
        } else {
            consecutiveBlankLines = 0;
            let remainingLine = line;
            while (remainingLine.length > 0) {
                if (remainingLine.length <= maxCharsPerLine) {
                    currentPage.push(remainingLine);
                    remainingLine = '';
                } else {
                    let splitIndex = remainingLine.lastIndexOf(' ', maxCharsPerLine);
                    if (splitIndex === -1) splitIndex = maxCharsPerLine;
                    currentPage.push(remainingLine.substring(0, splitIndex).trim());
                    remainingLine = remainingLine.substring(splitIndex).trim();
                }
            }
        }

        if (currentPage.length >= maxLinesPerPage) {
            pages.push(currentPage.slice(0, maxLinesPerPage));
            currentPage = currentPage.slice(maxLinesPerPage);
        }
    });

    // Add any remaining lines to the last page
    if (currentPage.length > 0) {
        // Pad the last page with empty lines if necessary
        while (currentPage.length < maxLinesPerPage) {
            currentPage.push('');
        }
        pages.push(currentPage);
    }

    return pages;
}

/**
 * Updates the cached details of a fundraiser and logs the changes.
 * @param context The execution context.
 * @param postId The ID of the post associated with the fundraiser.
 * @param updatedDetails The updated details of the fundraiser.
 * @param fundraiserRaisedDetails The current cached fundraiser details.
 */
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

/**
 * Sends real-time updates about a fundraiser to subscribers.
 * @param context The execution context.
 * @param postId The ID of the post associated with the fundraiser.
 * @param updatedDetails The updated details to be sent.
 */
export async function sendFundraiserUpdates(context: Context, postId: string, updatedDetails: EveryFundraiserRaisedDetails) {
    await context.realtime.send('fundraiser_updates', {
        postId: postId,
        raised: updatedDetails.raised,
        goalAmount: updatedDetails.goalAmount
    });
    console.log(`Sent real-time update for postId: ${postId}`);
}

