import { Context } from "@devvit/public-api";
import { getCachedForm, setCachedForm } from "./Redis.js";
import { TypeKeys } from "./typeHelpers.js";
import { EveryFundraiserRaisedDetails } from "../types/index.js";

export function paginateText(description: string, maxHeight: number, lineHeight: number, lineWidth: number, charWidth: number, imageHeight: number, logoHeight: number): string[] {
    const maxLinesPerPage = Math.floor(maxHeight / lineHeight);
    const maxCharsPerPage = maxLinesPerPage * Math.floor(lineWidth / charWidth);
    const words = description.split(' ');
    const pages: string[] = [];
    let currentPage = '';
    let currentCharCount = 0;

    words.forEach(word => {
        const wordLength = word.length + 1; // +1 for the space after the word
        if (currentCharCount + wordLength > maxCharsPerPage) {
            pages.push(currentPage.trim());
            currentPage = word + ' ';
            currentCharCount = wordLength;
        } else {
            currentPage += word + ' ';
            currentCharCount += wordLength;
        }
    });

    if (currentPage) {
        pages.push(currentPage.trim());
    }

    // Adjust the first page to account for the combined image and logo height
    if (pages.length > 0) {
        const combinedImageLines = Math.ceil((imageHeight + logoHeight) / lineHeight);
        const firstPageLines = pages[0].split('\n');
        if (firstPageLines.length > combinedImageLines) {
            pages[0] = firstPageLines.slice(0, firstPageLines.length - combinedImageLines).join('\n');
            const remainingText = firstPageLines.slice(firstPageLines.length - combinedImageLines).join(' ');
            if (remainingText) {
                pages[1] = remainingText + (pages[1] ? '\n' + pages[1] : '');
            }
        }
    }

    return pages;
}

export async function updateCachedFundraiserDetails(context: Context, postId: string, updatedDetails: EveryFundraiserRaisedDetails, fundraiserRaisedDetails: EveryFundraiserRaisedDetails) {
    const cachedForm = await getCachedForm(context, postId);
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

    await setCachedForm(context, postId, cachedForm);
}

export async function sendFundraiserUpdates(context: Context, postId: string, updatedDetails: EveryFundraiserRaisedDetails) {
    await context.realtime.send('fundraiser_updates', {
        postId: postId,
        raised: updatedDetails.raised,
        goalAmount: updatedDetails.goalAmount
    });
    console.log(`Sent real-time update for postId: ${postId}`);
}
