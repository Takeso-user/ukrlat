const express = require('express');
const bodyParser = require('body-parser');
const transliterate = require('./transliterate');
const {join} = require("path");
const app = express();
const port = process.env.PORT || 3000; // Use the port provided by the environment or default to 3000

app.use(bodyParser.json());


// REST API endpoint for transliteration
app.post('/api/v1/transliterate', (req, res) => {
    const inputText = req.body.inputText;

    if (!inputText) {
        return res.status(400).json({ error: 'Missing inputText in the request body' });
    }

    const words = inputText.split(' ');

    const outputWords = words.map((word) => {
        // Check if the word is all-uppercase
        const isAllUppercase = word === word.toUpperCase();

        // Transliterate the word using your custom logic
        let transliteratedWord = customTransliterate(word);

        // If the original word is all-uppercase, make the transliterated word uppercase
        if (isAllUppercase) {
            transliteratedWord = transliteratedWord.toUpperCase();
        }

        return transliteratedWord;
    });

    const outputText = outputWords.join(' ');

    res.json({ outputText });
});

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Custom transliteration logic
function customTransliterate(word) {
    // Assuming 'transliterate' is your existing function
    // You can use it directly without modification
    return transliterate(word);
}

// Serve static files from the 'public' directory
app.use(express.static('public'));




app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
