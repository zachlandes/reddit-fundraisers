export function paginateText(description: string, maxHeight: number, lineHeight: number, lineWidth: number, charWidth: number): string[] {
    const maxLinesPerPage = Math.floor(maxHeight / lineHeight);
    const maxCharsPerLine = Math.floor(lineWidth / charWidth);
    const words = description.split(' ');
    const pages: string[] = [];
    let currentPage = '';
    let currentLine = '';

    words.forEach(word => {
        //checking line length
        if ((currentLine + word).length > maxCharsPerLine) {
            //checking page length i.e. handling line overflow
            if (currentPage.split('\n').length >= maxLinesPerPage) {
                pages.push(currentPage);
                currentPage = '';
            }
            currentPage += currentLine + '\n';
            currentLine = word + ' ';
        } else {
            currentLine += word + ' ';
        }
    });

    if (currentLine) {
        if (currentPage.split('\n').length >= maxLinesPerPage) {
            pages.push(currentPage);
            currentPage = '';
        }
        currentPage += currentLine;
    }

    if (currentPage) {
        pages.push(currentPage);
    }

    return pages;
}