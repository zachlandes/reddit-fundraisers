export function paginateText(description: string, maxHeight: number, lineHeight: number, lineWidth: number, charWidth: number, imageHeight: number, logoHeight: number): string[] {
    const maxLinesPerPage = Math.floor(maxHeight / lineHeight);
    const maxCharsPerLine = Math.floor(lineWidth / charWidth);
    const words = description.split(' ');
    const pages: string[] = [];
    let currentPage = '';
    let currentLine = '';
    let linesUsed = 0;

    words.forEach(word => {
        // Check if adding the word exceeds the max characters per line
        if ((currentLine + word).length > maxCharsPerLine) {
            // Check if adding the line exceeds the max lines per page
            if (linesUsed >= maxLinesPerPage) {
                pages.push(currentPage);
                currentPage = '';
                linesUsed = 0;
            }
            currentPage += currentLine + '\n';
            currentLine = word + ' ';
            linesUsed++;
        } else {
            currentLine += word + ' ';
        }
    });

    // Add any remaining text to the current page
    if (currentLine) {
        if (linesUsed >= maxLinesPerPage) {
            pages.push(currentPage);
            currentPage = '';
            linesUsed = 0;
        }
        currentPage += currentLine;
    }

    if (currentPage) {
        pages.push(currentPage);
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