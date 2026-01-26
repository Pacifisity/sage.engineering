export const DataService = {
    exportJSON: async (data) => {
        const fileName = `rift-library-${new Date().toISOString().slice(0, 10)}.json`;
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Check if the Web Share API is available and can handle files
        if (navigator.canShare && navigator.share) {
            try {
                const file = new File([blob], fileName, { type: 'application/json' });
                await navigator.share({
                    files: [file],
                    title: 'Export Data',
                    text: 'Your exported library data'
                });
                return; // Success!
            } catch (err) {
                // User cancelled or share failed, proceed to fallback
                console.log("Share failed, trying download fallback", err);
            }
        }

        // Fallback: Traditional download link (Desktop / Older Mobile)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    },

    importJSON: (file) => {
        // Your current import logic is actually quite mobile-friendly!
        // <input type="file"> works well across iOS/Android.
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