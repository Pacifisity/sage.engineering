/**
 * Service for handling local data persistence via JSON files.
 */
export const DataService = {
    /**
     * Exports data to a JSON file. 
     * Prioritizes the native Web Share API (mobile) with a download fallback (desktop).
     */
    exportJSON: async (data) => {
        const fileName = `rift-library-${new Date().toISOString().slice(0, 10)}.json`;
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Attempt to use the native OS share sheet (primary for Mobile)
        if (navigator.canShare && navigator.share) {
            try {
                const file = new File([blob], fileName, { type: 'application/json' });
                await navigator.share({
                    files: [file],
                    title: 'Export Data',
                    text: 'Your exported library data'
                });
                return; 
            } catch (err) {
                // Fallback triggered if user cancels or browser rejects share
                console.log("Web Share unavailable or cancelled, using download link.");
            }
        }

        // Standard download anchor fallback (Primary for Desktop)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        // Clean up DOM and memory
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    },

    /**
     * Reads and parses a JSON file from a file input.
     * @param {File} file - The file object from the input element.
     * @returns {Promise<Object>} The parsed JSON data.
     */
    importJSON: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    resolve(json);
                } catch (err) {
                    reject("Invalid JSON file");
                }
            };
            
            reader.onerror = () => reject("File reading failed");
            reader.readAsText(file);
        });
    }
};