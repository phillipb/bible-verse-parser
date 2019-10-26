// Known bugs:
// Enhancements:
// Add unit test (x)
// Perfomance test (x)
// Handle commas properly Acts 12:4,17,2 (x)
// Skip parsing valid osis ids for example, if a string has: `Gen.1.1 and god is good` Gen.1.1 should be parsed as is (x)
// Validate chapter and verse are valid chapters and verses for the book
// Add support for more than 2 comma seperated hits. For example (Gen 1:1, Mark 1:1, Mark 1:2)

import BookMap from './ValidBookNames';

export interface Hit {
  startIdx: number;
  endIdx: number;
  osis: string;
  text: string;
}

const OSIS_INGORED_CHARS = /[.|\s]/u
const ALLOWED_CHARS = /[0|:|.|1|2|3|4|5|6|7|8|9|\s]/u
const RANGE_DELIMITER_REGEX = /([-|,|;])/

export class Parser {
  static parse(text: string) {
    text = sanitizeText(text);
    // Always look for the longer text first, so you can get the complete reference 1 John vs John
    // TODO: Length can be a bit fuzzy because of regex
    const bookNameHits = getBookHits(text).slice().sort((a , b) => a.startIdx - b.startIdx);
    return buildHits(text, bookNameHits);
  }
}

const buildHits = (text: string, potentialHits: Hit[]) => {
  const hits: Hit[] = [];
  let shouldMerge = false;
  potentialHits.forEach((hit, i) => {
    let adjText = text.substring(potentialHits[i].endIdx);

    if (shouldMerge) {
      // Don't create a new hit, Append to the last hit
      hit = potentialHits[i - 1];
      adjText = text.substring(hit.endIdx);
      shouldMerge = false;
    }

    for (let i = 0; i < adjText.length; i++) {
      // Loop over every adjacent character and see if it's valid.
      const char = adjText[i].replace(/\u2013|\u2014/g, "-");
      const prevChar = adjText[i - 1];
      const nextChar = adjText[i + 1];
      if (canRange(hit) && char.search(RANGE_DELIMITER_REGEX) > -1 ) {
        if (!nextChar) { break; };
        // If the range is next to a hit, we're in a range, so break out and continue
        const adjHit = getAdjBookHit(hit.endIdx + 1, text, potentialHits)
        if (adjHit) {
          // Merge hits if they're adjacent.
          hit.text += `${char}${adjHit.text}`;
          hit.endIdx += (1 + adjHit.text.length);
          hit.osis += `${char}${adjHit.osis}`
          shouldMerge = true;
          break;
        } else {
          if (!nextChar || !ALLOWED_CHARS.test(nextChar)) {
            // If the `-` is not next to a valid hit or the next char is not viable.
            //  We're in an in valid range and we should move on to the next hit
            break;
          }
          hit.text += char;
          hit.osis += `${char}`
          hit.endIdx += 1;
        }
      } else if (ALLOWED_CHARS.test(char)) {
        hit.text += char;
        hit.endIdx += 1;
        if (char === ':') {
          hit.osis += '.';
        } else if (char === '.' && !isNaN(nextChar as any) && !isNaN(prevChar as any)) {
          // checks to see if '.' is surronded by numbers for example `gen.1.1`. If it is, don't ignore it, add it to the osis
          // However, this should ignore Gen.1. since the trailing dot changes the meaning of the osis.
          hit.osis += '.';
        } else if (!OSIS_INGORED_CHARS.test(char)) {
          // Filter out chars that we don't want to necessarily add to the osis identifier.
          // For example, a period means something in an osis
          hit.osis += char;
        }
      } else {
        // This character is invalid, so break out of the loop,
        // and see if this is a qualified hit.
        break;
      }
    }

    if (!shouldMerge) {
      // Info: a normalized hit has a book and at least a chapter.
      const h = normalizeHits(hit);
      if (h) {
        hits.push(h);
      }
    }
  });

  return hits;
}

// Get the indexes for all of the valid book names in a string
const getBookHits = (text: string) => {
  const hits: Hit[] = []
  var books = Object.keys(BookMap).sort((a, b) => b.length - a.length);
  for (const book of books) {
    if (!text.length) {
      break;
    }
    var matches = allIndexesOfBook(text, book);
    for (const match of matches) {
      if (match.index > 0) {
        if (/^[a-z0-9]+$/i.test(text[match.index - 1]) === true) {
          // Only match book names that are not apart of another word.
          continue;
        }
      }
      var hit: Hit = {
        startIdx: match.index,
        endIdx: match.index + match.match.length,
        osis: `${BookMap[book]}.`,
        text: match.match
      }
      text = text.slice(0, hit.startIdx) + getSpacers(hit.endIdx - hit.startIdx) + text.slice(hit.endIdx);
      hits.push(hit);
    }
  }
  return hits;
}

const normalizeHits = (hit: Hit) => {
  // TODO: ************** FIlter out intersecting hits **************
  if (hit.osis[hit.osis.length - 1] === '.' ) {
    // DOn't match books only
    return;
  }

  if (hit.osis.indexOf('.') === -1) {
    // DOn't match books only
    return;
  }

  hit = normalizeHitText(hit);
  hit = normalizeOsis(hit);
  if (hit.osis.search(RANGE_DELIMITER_REGEX) > -1 ) {
    hit.osis = normalizeRange(hit.osis);
  }

  return hit;
}

/**
 * Takes a osis and cleans it up
 *
 **/
const normalizeRange = (osis: string) => {
  const match = osis.match(RANGE_DELIMITER_REGEX);
  if (!match) {
    return osis;
  }
  const [delimiter] = match;
  let ids = osis.split(delimiter).filter(i => !!i); // Remove false values ie (1Peter.1-) === [1Peter.1, '']
  const startOsis = ids[0];
  const startOsisParts = startOsis.split('.')
  if (ids.length === 1) {
    return startOsis;
  }
  const otherOsisIds = ids.splice(1);
  return otherOsisIds.reduce((acc, osis) => {
    const endOsisParts = osis.split('.');
    let otherOsis = osis;
    if (endOsisParts.length === 1 && startOsisParts.length > 1) {
      // if the context of the start osis is a chapter, then only take book (John 1-5), but if start Osis context is a
      // verse, then take the book and chapter as context (john 1:1-5).
      otherOsis = `${startOsisParts.slice(0, startOsisParts.length - 1).join('.')}.${osis}`
    } else if (endOsisParts.length === 2 && startOsisParts.length > 2) {
      // Only take the book name
      otherOsis = `${startOsisParts[0]}.${osis}`
    }
    return `${acc}${delimiter}${otherOsis}`;
  }, startOsis);
}

const normalizeHitText = (hit: Hit) => {
  while (hit.text && hit.text[hit.text.length - 1].search(/[0-9]/) === -1) {
    hit.text = hit.text.substring(0, hit.text.length - 1);
    hit.endIdx = hit.startIdx + hit.text.length;
  }
  return hit;
}

const normalizeOsis = (hit: Hit) => {
  while (hit.osis && hit.osis[hit.osis.length - 1].search(/[0-9]/) === -1) {
    hit.osis = hit.osis.substring(0, hit.osis.length - 1);
    hit.endIdx = hit.startIdx + hit.text.length;
  }
  return hit;
}

const canRange = (hit: Hit) => {
  if (hit.osis[hit.osis.length - 1] === '.' ) {
    // DOn't match books only
    return false;
  }
  if (hit.osis.indexOf('.') === -1) {
    // DOn't match books only
    return false;
  }

  return true
}

const allIndexesOfBook = (s: string, test: string) => {
  const regex = new RegExp(`\\b(${test})\\b`, 'ig')
  const matches: {index: number, match: string}[] = []
  let match: any;
  while ((match = regex.exec(s)) != null) {
    matches.push({
      index: match.index,
      match: match[0] // JAVASCRIPT REGEXS are stupid....
    })
  }
  return matches;
}

const getAdjBookHit = (idx: number, text: string, hits: Hit[]) => {
  const myText = text.substring(idx);
  const leadingWhiteSpace = myText.length - myText.trimLeft().length;
  const h = hits.find(m => m.startIdx === idx + leadingWhiteSpace)
  if (h) {
    // Because this text is adjacent to another book, be sure to append any spacing to the text
    h.text = `${myText.substr(0, leadingWhiteSpace)}${h.text}`
  }
  return h;
}

const getSpacers = (length: number, spacer = "*") => {
  let s = '';
  while (length--) {
    s += spacer
  }
  return s
}

const sanitizeText = (text: string) => {
  return text
    .replace(new RegExp(`${String.fromCharCode(8236)}|${String.fromCharCode(8237)}`, 'g'), ' ')
    .replace(/(\r\n|\r|\n)/g, '*') // Replce line breaks with invalid char to halt verse recognigiton at line breaks
}