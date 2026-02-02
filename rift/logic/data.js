/**
 * Service for handling local data persistence and export/import in multiple formats.
 */
export const DataService = {
    parseCSV: (text) => {
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (char === ',' && !inQuotes) {
                row.push(field);
                field = '';
                continue;
            }

            if ((char === '\n' || char === '\r') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') i++;
                row.push(field);
                field = '';
                if (row.length > 1 || row[0]?.trim()) rows.push(row);
                row = [];
                continue;
            }

            field += char;
        }

        row.push(field);
        if (row.length > 1 || row[0]?.trim()) rows.push(row);
        return rows;
    },
    /**
     * Levenshtein distance for fuzzy string matching
     */
    levenshteinDistance: (str1, str2) => {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        return matrix[len1][len2];
    },

    /**
     * Detects duplicate books with fuzzy matching (80% similarity threshold)
     * @param {Array} books - The library to check
     * @param {Object} newBook - The book being added/edited
     * @returns {Array} Array of potential duplicates
     */
    detectDuplicates: (books, newBook) => {
        const threshold = 80; // 80% similarity required
        const matches = [];

        books.forEach(book => {
            if (book.id === newBook.id) return; // Skip self

            // Exact title match (case-insensitive)
            if (book.title.toLowerCase() === newBook.title.toLowerCase()) {
                matches.push({ book, similarity: 100, reason: 'Exact title match' });
                return;
            }

            // Fuzzy title matching
            const title1 = newBook.title.toLowerCase();
            const title2 = book.title.toLowerCase();
            const maxLen = Math.max(title1.length, title2.length);
            const distance = DataService.levenshteinDistance(title1, title2);
            const similarity = Math.round((1 - distance / maxLen) * 100);

            if (similarity >= threshold) {
                const sameAuthor = newBook.author && book.author && 
                    newBook.author.toLowerCase() === book.author.toLowerCase();
                matches.push({ 
                    book, 
                    similarity, 
                    reason: sameAuthor ? 'Similar title + same author' : 'Similar title' 
                });
            }
        });

        return matches.sort((a, b) => b.similarity - a.similarity);
    },

    /**
     * Exports data to a JSON file. 
     * Prioritizes the native Web Share API (mobile) with a download fallback (desktop).
     */
    exportJSON: async (data) => {
        const fileName = `rift-library-${new Date().toISOString().slice(0, 10)}.json`;
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });

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
                console.log("Web Share unavailable or cancelled, using download link.");
            }
        }

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

    /**
     * Exports data to CSV format
     */
    exportCSV: async (data) => {
        const fileName = `rift-library-${new Date().toISOString().slice(0, 10)}.csv`;
        
        const headers = ['Title', 'Author', 'Status', 'Rating', 'Tracking Type', 'Progress', 'URL', 'Notes', 'Favorite'];
        const rows = data.map(book => [
            `"${(book.title || '').replace(/"/g, '""')}"`,
            `"${(book.author || '').replace(/"/g, '""')}"`,
            book.status || 'Reading',
            book.rating || 'Unrated',
            book.trackingType || 'chapter',
            book.currentCount || '',
            `"${(book.url || '').replace(/"/g, '""')}"`,
            `"${(book.notes || '').replace(/"/g, '""')}"`,
            book.isFavorite ? 'Yes' : 'No'
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
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

    /**
     * Exports data to Markdown format
     */
    exportMarkdown: async (data) => {
        const fileName = `rift-library-${new Date().toISOString().slice(0, 10)}.md`;
        
        let mdContent = `# My Book Library\n\nExported on ${new Date().toLocaleString()}\n\n`;
        
        const statusGroups = {
            'Reading': [],
            'Plan to Read': [],
            'Completed': [],
            'Dropped': [],
            'Other': []
        };

        data.forEach(book => {
            const group = statusGroups[book.status] || statusGroups['Other'];
            group.push(book);
        });

        Object.entries(statusGroups).forEach(([status, books]) => {
            if (books.length === 0) return;
            mdContent += `## ${status}\n\n`;
            
            books.forEach(book => {
                mdContent += `- **${book.title}**`;
                if (book.author) mdContent += ` by ${book.author}`;
                mdContent += `\n`;
                
                if (book.rating && book.rating !== 'Unrated') {
                    mdContent += `  - Rating: ${'★'.repeat(parseInt(book.rating))}${'☆'.repeat(5 - parseInt(book.rating))}\n`;
                }
                if (book.currentCount) {
                    const label = (book.trackingType || 'chapter').charAt(0).toUpperCase() + (book.trackingType || 'chapter').slice(1);
                    mdContent += `  - Progress: ${book.currentCount} ${label}s\n`;
                }
                if (book.notes) {
                    mdContent += `  - Notes: ${book.notes.replace(/\n/g, ' ')}\n`;
                }
                if (book.url) {
                    mdContent += `  - [Source](${book.url})\n`;
                }
                if (book.isFavorite) {
                    mdContent += `  - ⭐ Favorite\n`;
                }
            });
            mdContent += '\n';
        });

        const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
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

    /**
     * Reads and parses a JSON file from a file input.
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
    },

    /**
     * Parses CSV file and converts to book format
     */
    importCSV: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const rows = DataService.parseCSV(e.target.result);
                    if (rows.length === 0) throw new Error('Empty CSV');

                    const headers = rows[0].map(h => h.trim().toLowerCase());
                    
                    const books = [];
                    let id = Date.now();

                    const getValue = (values, header) => {
                        const index = headers.indexOf(header);
                        return index > -1 ? (values[index] || '') : '';
                    };

                    for (let i = 1; i < rows.length; i++) {
                        const values = rows[i].map(v => v.trim());
                        if (values.length === 1 && !values[0]) continue;

                        const book = {
                            id: id++,
                            title: getValue(values, 'title'),
                            author: getValue(values, 'author'),
                            status: getValue(values, 'status') || 'Reading',
                            rating: getValue(values, 'rating') || 'Unrated',
                            trackingType: getValue(values, 'tracking type') || 'chapter',
                            currentCount: parseInt(getValue(values, 'progress')) || 0,
                            url: getValue(values, 'url'),
                            notes: getValue(values, 'notes'),
                            isFavorite: getValue(values, 'favorite').toLowerCase() === 'yes'
                        };
                        
                        if (book.title) books.push(book);
                    }

                    resolve(books);
                } catch (err) {
                    reject("Invalid CSV file: " + err.message);
                }
            };
            
            reader.onerror = () => reject("File reading failed");
            reader.readAsText(file);
        });
    },

    /**
     * Parses Markdown file and converts to book format
     */
    importMarkdown: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const books = [];
                    let id = Date.now();
                    let currentStatus = 'Reading';
                    let currentBook = null;

                    const lines = content.split('\n');

                    const normalizeTrackingType = (label) => {
                        if (!label) return 'chapter';
                        const cleaned = label.toLowerCase().trim();
                        if (cleaned.startsWith('page')) return 'page';
                        return 'chapter';
                    };

                    lines.forEach((rawLine) => {
                        const line = rawLine.trimEnd();

                        // Check for status header (## Status)
                        if (line.startsWith('## ')) {
                            const status = line.replace('## ', '').trim();
                            if (['Reading', 'Plan to Read', 'Completed', 'Dropped'].includes(status)) {
                                currentStatus = status;
                            }
                            currentBook = null;
                            return;
                        }

                        // Check for book entry (- **Title**)
                        if (line.startsWith('- **') && line.includes('**')) {
                            const titleMatch = line.match(/- \*\*([^*]+)\*\*/);
                            if (titleMatch) {
                                const book = {
                                    id: id++,
                                    title: titleMatch[1].trim(),
                                    author: '',
                                    status: currentStatus,
                                    rating: 'Unrated',
                                    trackingType: 'chapter',
                                    currentCount: 0,
                                    url: '',
                                    notes: '',
                                    isFavorite: false
                                };

                                // Extract author if present (by Author Name)
                                const authorMatch = line.match(/\*\*\s*by\s+([^\n]+)/i) || line.match(/by\s+([^\n]+)/i);
                                if (authorMatch) {
                                    book.author = authorMatch[1].trim();
                                }

                                books.push(book);
                                currentBook = book;
                            }
                            return;
                        }

                        // Parse details for the most recent book
                        if (!currentBook) return;

                        const detailLine = line.replace(/^[-*]\s+/, '');
                        if (!detailLine.startsWith('Rating:') &&
                            !detailLine.startsWith('Progress:') &&
                            !detailLine.startsWith('Notes:') &&
                            !detailLine.startsWith('[Source]') &&
                            !detailLine.includes('Favorite')) {
                            return;
                        }

                        if (detailLine.startsWith('Rating:')) {
                            const stars = detailLine.match(/Rating:\s*([★☆]+)/);
                            if (stars && stars[1]) {
                                const filled = (stars[1].match(/★/g) || []).length;
                                currentBook.rating = filled > 0 ? filled : 'Unrated';
                            }
                            return;
                        }

                        if (detailLine.startsWith('Progress:')) {
                            const progressMatch = detailLine.match(/Progress:\s*(\d+)\s+([A-Za-z]+)/);
                            if (progressMatch) {
                                currentBook.currentCount = parseInt(progressMatch[1], 10) || 0;
                                currentBook.trackingType = normalizeTrackingType(progressMatch[2]);
                            }
                            return;
                        }

                        if (detailLine.startsWith('Notes:')) {
                            currentBook.notes = detailLine.replace('Notes:', '').trim();
                            return;
                        }

                        const sourceMatch = detailLine.match(/\[Source\]\(([^)]+)\)/);
                        if (sourceMatch) {
                            currentBook.url = sourceMatch[1].trim();
                            return;
                        }

                        if (detailLine.includes('Favorite')) {
                            currentBook.isFavorite = true;
                        }
                    });

                    if (books.length === 0) {
                        reject("No valid books found in Markdown file");
                    } else {
                        resolve(books);
                    }
                } catch (err) {
                    reject("Invalid Markdown file: " + err.message);
                }
            };
            
            reader.onerror = () => reject("File reading failed");
            reader.readAsText(file);
        });
    }
};