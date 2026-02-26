let questionsData = {};
let searchTerm = '';

async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        questionsData = await response.json();
        renderQuestions();
    } catch (error) {
        console.error('Error loading questions:', error);
        document.getElementById('content').innerHTML = 
            '<div class="no-results">Error loading questions. Please check that questions.json exists.</div>';
    }
}

function renderSingleChoice(q) {
    return `
        <div class="question-card">
            <div class="question">${q.question}</div>
            <div class="answer">${q.answer}</div>
        </div>
    `;
}

function renderMultipleAnswer(q) {
    const answersHTML = q.answers.map(a => 
        `<div class="answer-item">✓ ${a}</div>`
    ).join('');
    
    return `
        <div class="question-card">
            <div class="question">${q.question}</div>
            <div class="answers-list">${answersHTML}</div>
        </div>
    `;
}

function renderMatching(q) {
    const pairsHTML = q.pairs.map(p => `
        <div class="match-pair">
            <div class="match-description">${p.description}</div>
            <div class="match-arrow">→</div>
            <div class="match-answer">${p.answer}</div>
        </div>
    `).join('');
    
    return `
        <div class="question-card">
            <div class="question">${q.question}</div>
            <div class="matching-grid">${pairsHTML}</div>
        </div>
    `;
}

function matchesSearch(q, type) {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    const questionText = q.question.toLowerCase();
    
    if (questionText.includes(term)) return true;
    
    if (type === 'single_choice') {
        return q.answer.toLowerCase().includes(term);
    } else if (type === 'multiple_answer') {
        return q.answers.some(a => a.toLowerCase().includes(term));
    } else if (type === 'matching') {
        return q.pairs.some(p => 
            p.description.toLowerCase().includes(term) || 
            p.answer.toLowerCase().includes(term)
        );
    }
    
    return false;
}

function renderQuestions() {
    const content = document.getElementById('content');
    let html = '';
    let hasResults = false;

    if (questionsData.single_choice) {
        const filtered = questionsData.single_choice.filter(q => matchesSearch(q, 'single_choice'));
        if (filtered.length > 0) {
            html += `
                <div class="section">
                    <h2 class="section-title">Single Choice Questions</h2>
                    ${filtered.map(renderSingleChoice).join('')}
                </div>
            `;
            hasResults = true;
        }
    }

    if (questionsData.multiple_answer) {
        const filtered = questionsData.multiple_answer.filter(q => matchesSearch(q, 'multiple_answer'));
        if (filtered.length > 0) {
            html += `
                <div class="section">
                    <h2 class="section-title">Multiple Answer Questions</h2>
                    ${filtered.map(renderMultipleAnswer).join('')}
                </div>
            `;
            hasResults = true;
        }
    }

    if (questionsData.matching) {
        const filtered = questionsData.matching.filter(q => matchesSearch(q, 'matching'));
        if (filtered.length > 0) {
            html += `
                <div class="section">
                    <h2 class="section-title">Matching Questions</h2>
                    ${filtered.map(renderMatching).join('')}
                </div>
            `;
            hasResults = true;
        }
    }

    if (!hasResults) {
        html = '<div class="no-results">No questions match your search criteria.</div>';
    }

    content.innerHTML = html;
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderQuestions();
});

loadQuestions();
