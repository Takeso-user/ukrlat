// transliteration.js

function transliterate(text) {
    var translitMap = {
        а: "a",
        А: "A",
        б: "b",
        Б: "B",
        в: "v",
        В: "V",
        г: "g",
        Г: "G",
        ґ: "ĝ",
        Ґ: "Ĝ",
        д: "d",
        Д: "D",
        дь: "ď",
        ДЬ: "Ď",
        Дь: "Ď",
        е: "e",
        Е: "E",
        є: "ê",
        Є: "Ê",
        ж: "ž",
        Ж: "Ž",
        з: "z",
        З: "Z",
        зь: "ź",
        ЗЬ: "Ź",
        Зь: "Ź",
        и: "y",
        И: "Y",
        і: "i",
        І: "I",
        ї: "î",
        Ї: "Î",
        й: "j",
        Й: "J",
        к: "k",
        К: "K",
        л: "l",
        Л: "L",
        ль: "ĺ",
        ЛЬ: "Ĺ",
        Ль: "Ĺ",
        м: "m",
        М: "M",
        н: "n",
        Н: "N",
        нь: "ń",
        НЬ: "Ń",
        Нь: "Ń",
        о: "o",
        О: "O",
        п: "p",
        П: "P",
        р: "r",
        Р: "R",
        рь: "ŕ",
        РЬ: "Ŕ",
        Рь: "Ŕ",
        с: "s",
        С: "S",
        сь: "ś",
        СЬ: "Ś",
        Сь: "Ś",
        т: "t",
        Т: "T",
        ть: "ť",
        ТЬ: "Ť",
        Ть: "Ť",
        у: "u",
        У: "U",
        ф: "f",
        Ф: "F",
        х: "h",
        Х: "H",
        ц: "c",
        Ц: "C",
        ць: "ć",
        ЦЬ: "Ć",
        Ць: "Ć",
        ч: "č",
        Ч: "Č",
        ш: "š",
        Ш: "Š",
        щ: "šč",
        Щ: "Šč",
        ю: "û",
        Ю: "Û",
        я: "â",
        Я: "Â",
    };

    var result = "";
    for (var i = 0; i < text.length; i++) {
        var currentChar = text[i];
        var nextChar = i < text.length - 1 ? text[i + 1] : "";
        var currentPair = currentChar + nextChar;

        if (translitMap.hasOwnProperty(currentPair)) {
            result += translitMap[currentPair];
            i++; // Skip the next character since it's already processed
        } else {
            result += translitMap[currentChar] || currentChar;
        }
    }

    return result;
}

// Export the transliterate function to make it available to other files
module.exports = transliterate;
