async function loadCapabilities() {
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzysDd9uNw41kPXaOFxeATxFyh3c3QvASrNk11I-n8gIo3TgRAE2i_1rFuzhaTi7hsa/exec'; 
    const container = document.getElementById('capabilities-container');

    try {
        const response = await fetch(scriptURL);
        const rawText = await response.text();

        const sections = rawText.split('\n\n');
        let htmlContent = '';

        sections.forEach(section => {
            if (section.trim().length > 0) {
                // Modified line: Added class="cap-header" to the strong tag
                let formattedSection = section.replace(/\[(.*?)\]/, '<strong class="cap-header" style="color: #00ff00;">[$1]</strong><br>');
                
                htmlContent += `<div class="obj-item">${formattedSection}</div>`;
            }
        });

        container.innerHTML = htmlContent;
    } catch (error) {
        console.error('Fetch Error:', error);
        container.innerHTML = `<div class="obj-item" style="color: red;">Error: Connection failed.</div>`;
    }
}

window.onload = loadCapabilities;
