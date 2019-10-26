"use strict";
// Known bugs:
// Enhancements:
// Add unit test (x)
// Perfomance test (x)
// Handle commas properly Acts 12:4,17,2 (x)
// Skip parsing valid osis ids for example, if a string has: `Gen.1.1 and god is good` Gen.1.1 should be parsed as is (x)
// Validate chapter and verse are valid chapters and verses for the book
// Add support for more than 2 comma seperated hits. For example (Gen 1:1, Mark 1:1, Mark 1:2)
Object.defineProperty(exports, "__esModule", { value: true });
var ValidBookNames_1 = require("./ValidBookNames");
var OSIS_INGORED_CHARS = /[.|\s]/u;
var ALLOWED_CHARS = /[0|:|.|1|2|3|4|5|6|7|8|9|\s]/u;
var RANGE_DELIMITER_REGEX = /([-|,|;])/;
exports.parseText = function (text) {
    text = sanitizeText(text);
    // Always look for the longer text first, so you can get the complete reference 1 John vs John
    // TODO: Length can be a bit fuzzy because of regex
    var bookNameHits = getBookHits(text).slice().sort(function (a, b) { return a.startIdx - b.startIdx; });
    return buildHits(text, bookNameHits);
};
var buildHits = function (text, potentialHits) {
    var hits = [];
    var shouldMerge = false;
    potentialHits.forEach(function (hit, i) {
        var adjText = text.substring(potentialHits[i].endIdx);
        if (shouldMerge) {
            // Don't create a new hit, Append to the last hit
            hit = potentialHits[i - 1];
            adjText = text.substring(hit.endIdx);
            shouldMerge = false;
        }
        for (var i_1 = 0; i_1 < adjText.length; i_1++) {
            // Loop over every adjacent character and see if it's valid.
            var char = adjText[i_1].replace(/\u2013|\u2014/g, "-");
            var prevChar = adjText[i_1 - 1];
            var nextChar = adjText[i_1 + 1];
            if (canRange(hit) && char.search(RANGE_DELIMITER_REGEX) > -1) {
                if (!nextChar) {
                    break;
                }
                ;
                // If the range is next to a hit, we're in a range, so break out and continue
                var adjHit = getAdjBookHit(hit.endIdx + 1, text, potentialHits);
                if (adjHit) {
                    // Merge hits if they're adjacent.
                    hit.text += "" + char + adjHit.text;
                    hit.endIdx += (1 + adjHit.text.length);
                    hit.osis += "" + char + adjHit.osis;
                    shouldMerge = true;
                    break;
                }
                else {
                    if (!nextChar || !ALLOWED_CHARS.test(nextChar)) {
                        // If the `-` is not next to a valid hit or the next char is not viable.
                        //  We're in an in valid range and we should move on to the next hit
                        break;
                    }
                    hit.text += char;
                    hit.osis += "" + char;
                    hit.endIdx += 1;
                }
            }
            else if (ALLOWED_CHARS.test(char)) {
                hit.text += char;
                hit.endIdx += 1;
                if (char === ':') {
                    hit.osis += '.';
                }
                else if (char === '.' && !isNaN(nextChar) && !isNaN(prevChar)) {
                    // checks to see if '.' is surronded by numbers for example `gen.1.1`. If it is, don't ignore it, add it to the osis
                    // However, this should ignore Gen.1. since the trailing dot changes the meaning of the osis.
                    hit.osis += '.';
                }
                else if (!OSIS_INGORED_CHARS.test(char)) {
                    // Filter out chars that we don't want to necessarily add to the osis identifier.
                    // For example, a period means something in an osis
                    hit.osis += char;
                }
            }
            else {
                // This character is invalid, so break out of the loop,
                // and see if this is a qualified hit.
                break;
            }
        }
        if (!shouldMerge) {
            // Info: a normalized hit has a book and at least a chapter.
            var h = normalizeHits(hit);
            if (h) {
                hits.push(h);
            }
        }
    });
    return hits;
};
// Get the indexes for all of the valid book names in a string
var getBookHits = function (text) {
    var hits = [];
    var books = Object.keys(ValidBookNames_1.default).sort(function (a, b) { return b.length - a.length; });
    for (var _i = 0, books_1 = books; _i < books_1.length; _i++) {
        var book = books_1[_i];
        if (!text.length) {
            break;
        }
        var matches = allIndexesOfBook(text, book);
        for (var _a = 0, matches_1 = matches; _a < matches_1.length; _a++) {
            var match = matches_1[_a];
            if (match.index > 0) {
                if (/^[a-z0-9]+$/i.test(text[match.index - 1]) === true) {
                    // Only match book names that are not apart of another word.
                    continue;
                }
            }
            var hit = {
                startIdx: match.index,
                endIdx: match.index + match.match.length,
                osis: ValidBookNames_1.default[book] + ".",
                text: match.match
            };
            text = text.slice(0, hit.startIdx) + getSpacers(hit.endIdx - hit.startIdx) + text.slice(hit.endIdx);
            hits.push(hit);
        }
    }
    return hits;
};
var normalizeHits = function (hit) {
    // TODO: ************** FIlter out intersecting hits **************
    if (hit.osis[hit.osis.length - 1] === '.') {
        // DOn't match books only
        return;
    }
    if (hit.osis.indexOf('.') === -1) {
        // DOn't match books only
        return;
    }
    hit = normalizeHitText(hit);
    hit = normalizeOsis(hit);
    if (hit.osis.search(RANGE_DELIMITER_REGEX) > -1) {
        hit.osis = normalizeRange(hit.osis);
    }
    return hit;
};
/**
 * Takes a osis and cleans it up
 *
 **/
var normalizeRange = function (osis) {
    var match = osis.match(RANGE_DELIMITER_REGEX);
    if (!match) {
        return osis;
    }
    var delimiter = match[0];
    var ids = osis.split(delimiter).filter(function (i) { return !!i; }); // Remove false values ie (1Peter.1-) === [1Peter.1, '']
    var startOsis = ids[0];
    var startOsisParts = startOsis.split('.');
    if (ids.length === 1) {
        return startOsis;
    }
    var otherOsisIds = ids.splice(1);
    return otherOsisIds.reduce(function (acc, osis) {
        var endOsisParts = osis.split('.');
        var otherOsis = osis;
        if (endOsisParts.length === 1 && startOsisParts.length > 1) {
            // if the context of the start osis is a chapter, then only take book (John 1-5), but if start Osis context is a
            // verse, then take the book and chapter as context (john 1:1-5).
            otherOsis = startOsisParts.slice(0, startOsisParts.length - 1).join('.') + "." + osis;
        }
        else if (endOsisParts.length === 2 && startOsisParts.length > 2) {
            // Only take the book name
            otherOsis = startOsisParts[0] + "." + osis;
        }
        return "" + acc + delimiter + otherOsis;
    }, startOsis);
};
var normalizeHitText = function (hit) {
    while (hit.text && hit.text[hit.text.length - 1].search(/[0-9]/) === -1) {
        hit.text = hit.text.substring(0, hit.text.length - 1);
        hit.endIdx = hit.startIdx + hit.text.length;
    }
    return hit;
};
var normalizeOsis = function (hit) {
    while (hit.osis && hit.osis[hit.osis.length - 1].search(/[0-9]/) === -1) {
        hit.osis = hit.osis.substring(0, hit.osis.length - 1);
        hit.endIdx = hit.startIdx + hit.text.length;
    }
    return hit;
};
var canRange = function (hit) {
    if (hit.osis[hit.osis.length - 1] === '.') {
        // DOn't match books only
        return false;
    }
    if (hit.osis.indexOf('.') === -1) {
        // DOn't match books only
        return false;
    }
    return true;
};
var allIndexesOfBook = function (s, test) {
    var regex = new RegExp("\\b(" + test + ")\\b", 'ig');
    var matches = [];
    var match;
    while ((match = regex.exec(s)) != null) {
        matches.push({
            index: match.index,
            match: match[0] // JAVASCRIPT REGEXS are stupid....
        });
    }
    return matches;
};
var getAdjBookHit = function (idx, text, hits) {
    var myText = text.substring(idx);
    var leadingWhiteSpace = myText.length - myText.trimLeft().length;
    var h = hits.find(function (m) { return m.startIdx === idx + leadingWhiteSpace; });
    if (h) {
        // Because this text is adjacent to another book, be sure to append any spacing to the text
        h.text = "" + myText.substr(0, leadingWhiteSpace) + h.text;
    }
    return h;
};
var getSpacers = function (length, spacer) {
    if (spacer === void 0) { spacer = "*"; }
    var s = '';
    while (length--) {
        s += spacer;
    }
    return s;
};
var sanitizeText = function (text) {
    return text
        .replace(new RegExp(String.fromCharCode(8236) + "|" + String.fromCharCode(8237), 'g'), ' ')
        .replace(/(\r\n|\r|\n)/g, '*'); // Replce line breaks with invalid char to halt verse recognigiton at line breaks
};
