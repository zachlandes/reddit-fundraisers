import { Context } from "@devvit/public-api";
import { getCachedForm, setCachedForm } from "./Redis.js";
import { TypeKeys } from "./typeHelpers.js";
import { EveryFundraiserRaisedDetails } from "../types/index.js";
import { CachedForm } from "./CachedForm.js";

/**
 * Splits a long text into pages based on the given dimensions and formatting constraints.
 * @param description The text to paginate.
 * @param totalHeight Total available height for the text.
 * @param lineHeight Height of each line of text.
 * @param lineWidth Width available for text on each line.
 * @param charWidth Average character width.
 * @returns An array of arrays of strings, where each inner array represents a page of text.
 */
export function paginateText(description: string, totalHeight: number, lineHeight: number, lineWidth: number, charWidth: number): string[] {
    const maxLinesPerPage = Math.floor((totalHeight) / lineHeight);
    //console.log("maxLinesPerPage:", maxLinesPerPage);
    const approxCharsPerPage = maxLinesPerPage * Math.floor(lineWidth / charWidth);
    //console.log("approxCharsPerPage:", approxCharsPerPage);
    const charsPerLine = Math.floor(lineWidth / charWidth);
    //console.log("charsPerLine:", charsPerLine);
    const lastLineBuffer = 0; // Buffer for the last line
    const pages: string[] = [];
    let currentPage = '';
    let charCount = 0;
    let currentParagraphWords: string[] = [];

    function addContentToPage(content: string, isNewline: boolean = false) {
        if (isNewline) {
            if (charCount + charsPerLine > approxCharsPerPage && currentPage.trim()) {
                finalizePage();
            } else {
                currentPage += '\n';
                charCount += charsPerLine;
            }
        } else {
            const wordWithSpace = content + ' ';
            
            if (charCount + wordWithSpace.length > approxCharsPerPage - lastLineBuffer && currentPage.trim()) {
                // Try to fit more words from the current paragraph
                let tempCharCount = charCount;
                let tempContent = '';
                let i = currentParagraphWords.indexOf(content);
                
                while (i < currentParagraphWords.length && 
                       tempCharCount + (currentParagraphWords[i] + ' ').length <= approxCharsPerPage - lastLineBuffer) {
                    tempContent += currentParagraphWords[i] + ' ';
                    tempCharCount += (currentParagraphWords[i] + ' ').length;
                    i++;
                }
                
                if (tempContent) {
                    currentPage += tempContent;
                    charCount = tempCharCount;
                    currentParagraphWords.splice(0, i);
                    finalizePage();
                } else {
                    finalizePage();
                    currentPage = wordWithSpace;
                    charCount = wordWithSpace.length;
                }
            } else {
                currentPage += wordWithSpace;
                charCount += wordWithSpace.length;
            }
        }
    }

    function finalizePage() {
        pages.push(currentPage.trim());
        //console.log(`Page ${pages.length} finalized with ${charCount} characters`);
        currentPage = '';
        charCount = 0;
    }

    description.split('\n').forEach((paragraph, index) => {
        const isEmptyParagraph = paragraph.trim().length === 0;
        
        // Skip empty paragraphs at the start of a page
        if (isEmptyParagraph && currentPage.trim().length === 0) {
            return;
        }
        
        if (isEmptyParagraph) {
            addContentToPage('', true);
            currentParagraphWords = [];
        } else {
            currentParagraphWords = paragraph.split(' ');
            while (currentParagraphWords.length > 0) {
                addContentToPage(currentParagraphWords.shift()!);
            }
            // Only add a newline if it's not the last paragraph
            if (index < description.split('\n').length - 1) {
                addContentToPage('', true);
            }
        }
    });

    if (currentPage.trim()) {
        finalizePage();
    }

    //console.log(`Pagination complete. Total pages: ${pages.length}`);
    return pages;
}

/**
 * Updates the cached details of a fundraiser and logs the changes.
 * @param context The execution context.
 * @param postId The ID of the post associated with the fundraiser.
 * @param updatedDetails The updated details of the fundraiser.
 * @param fundraiserRaisedDetails The current cached fundraiser details.
 */
export async function updateCachedFundraiserDetails(context: Pick<Context, "redis">, postId: string, updatedDetails: EveryFundraiserRaisedDetails, fundraiserRaisedDetails: EveryFundraiserRaisedDetails): Promise<CachedForm | null> {
    let cachedForm;
    try {
        cachedForm = await getCachedForm(context, postId);
    } catch (error) {
        console.error(`Error retrieving cached form for postId: ${postId}`, error);
        return null;
    }

    if (!cachedForm) {
        console.error(`No cached form found for postId: ${postId}`);
        return null;
    }

    const currentStatus = cachedForm.getStatus();
    if (currentStatus === 'expired') {
        // If the fundraiser is already expired, don't update its details
        return null;
    }

    let hasChanges = false;

    if (updatedDetails.raised !== fundraiserRaisedDetails.raised) {
        console.log("Updating the cached form amount raised for postId: " + postId);
        cachedForm.setProp(TypeKeys.fundraiserDetails, 'raised', updatedDetails.raised);
        hasChanges = true;
    }

    if (updatedDetails.goalAmount !== fundraiserRaisedDetails.goalAmount) {
        console.log("Updating the cached form goal amount for postId: " + postId);
        cachedForm.setProp(TypeKeys.fundraiserDetails, 'goalAmount', updatedDetails.goalAmount);
        hasChanges = true;
    }

    if (updatedDetails.supporters !== fundraiserRaisedDetails.supporters) {
        console.log("Updating the cached form supporters count for postId: " + postId);
        cachedForm.setProp(TypeKeys.fundraiserDetails, 'supporters', updatedDetails.supporters);
        hasChanges = true;
    }

    if (hasChanges) {
        try {
            await setCachedForm(context, postId, cachedForm);
        } catch (error) {
            console.error(`Failed to update cached form for postId: ${postId}`, error);
            return null;
        }
    }

    return hasChanges ? cachedForm : null;
}

/**
 * Sends real-time updates about a fundraiser to subscribers.
 * @param context The execution context.
 * @param postId The ID of the post associated with the fundraiser.
 * @param updatedDetails The updated details to be sent.
 */
export async function sendFundraiserUpdates(
    context: Pick<Context, "realtime">,
    postId: string,
    updatedDetails: EveryFundraiserRaisedDetails
) {
    await context.realtime.send('fundraiser_updates', {
        postId: postId,
        updatedDetails: {
            raised: updatedDetails.raised,
            goalAmount: updatedDetails.goalAmount,
            supporters: updatedDetails.supporters,
            goalType: updatedDetails.goalType
        }
    });
    console.log(`Sent real-time update for postId: ${postId}`);
}