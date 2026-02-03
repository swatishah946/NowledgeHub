/**
 * Downloads the given markdown content as a .md file.
 * @param {string} content - The markdown content to download.
 * @param {string} filename - The name of the file to save (without extension, or with).
 */
export const downloadMarkdown = (content, filename = 'research-report.md') => {
    if (!content) return;

    if (!filename.endsWith('.md')) {
        filename += '.md';
    }

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
