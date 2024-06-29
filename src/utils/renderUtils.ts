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
 * @returns An array of arrays of strings, where each inner array represents a page of text.
 */
export function paginateText(description: string, totalHeight: number, lineHeight: number, lineWidth: number, charWidth: number): string[] {
    const maxLinesPerPage = Math.floor((totalHeight) / lineHeight);
    console.log('maxLinesPerPage', maxLinesPerPage);
    const approxCharsPerPage = maxLinesPerPage * Math.floor(lineWidth / charWidth);
    console.log('approxCharsPerPage', approxCharsPerPage);
    const charsPerLine = Math.floor(lineWidth / charWidth);
    console.log('charsPerLine', charsPerLine);
    const lastLineBuffer = 9; // Buffer for the last line
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
            console.log(`Trying to add word: "${content}", Current char count: ${charCount}, Word length: ${wordWithSpace.length}`);
            
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
                    console.log(`Fitting additional words: ${tempContent}`);
                    currentPage += tempContent;
                    charCount = tempCharCount;
                    currentParagraphWords.splice(0, i);
                    finalizePage();
                } else {
                    finalizePage();
                    console.log(`Starting new page with word: "${content}"`);
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
        console.log(`Page ${pages.length} character count: ${charCount}`);
        console.log(`Page ${pages.length} content:\n${currentPage.replace(/\n/g, '\\n\n')}`);
        currentPage = '';
        charCount = 0;
    }

    description.split('\n').forEach((paragraph, index) => {
        const isEmptyParagraph = paragraph.trim().length === 0;
        
        // Skip empty paragraphs at the start of a page
        if (isEmptyParagraph && currentPage.trim().length === 0) {
            console.log(`Skipping empty paragraph ${index + 1} at start of page`);
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
        console.log(`Processed paragraph ${index + 1}: "${paragraph.substring(0, 20)}..." (${isEmptyParagraph ? 'empty' : paragraph.length + ' chars'})`);
    });

    if (currentPage.trim()) {
        finalizePage();
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
