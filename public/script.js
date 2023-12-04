
function transliterateText() {
    const inputText = document.getElementById("inputText").value;

    fetch('/api/v1/transliterate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputText: inputText }),
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById("outputText").value = data.outputText;
        })
        .catch(error => {
            console.error('Error:', error);
        });
}
