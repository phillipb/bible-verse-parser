"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Parser = require("..");
describe('Single Pharse Verse Parsing', function () {
    test('Does not parse book only', function () {
        expect(Parser.parseText("Genesis    ").length).toBe(0);
    });
    test('parses chapters', function () {
        expect(Parser.parseText("Genesis 1").length).toBe(1);
        expect(Parser.parseText("Genesis 1")[0].osis).toBe('Gen.1');
        expect(Parser.parseText("Genesis 1   ").length).toBe(1);
        expect(Parser.parseText("Genesis 1   ")[0].text).toBe('Genesis 1');
        expect(Parser.parseText("Genesis 1   ")[0].osis).toBe('Gen.1');
    });
    test('Shouldn\'t match book reference that are apart of another word', function () {
        expect(Parser.parseText("Ahab. 2 kings 1").length).toBe(1);
    });
    test('Should match reference wrapped in delimiters', function () {
        expect(Parser.parseText("(2 kings 1)").length).toBe(1);
        expect(Parser.parseText("[2 kings 1:2]").length).toBe(1);
        expect(Parser.parseText("[2 kings 1:2-4]").length).toBe(1);
    });
    test('parses verses', function () {
        expect(Parser.parseText("Genesis 1:1")[0].osis).toBe('Gen.1.1');
        expect(Parser.parseText("1 John 1:1")[0].osis).toBe('1John.1.1');
        expect(Parser.parseText("Gen 1:1")[0].osis).toBe('Gen.1.1');
        expect(Parser.parseText("sins: Deut 17:14–20")[0].osis).toBe('Deut.17.14-Deut.17.20');
    });
    test('parses ranges', function () {
        expect(Parser.parseText("Genesis 1-2")[0].osis).toBe('Gen.1-Gen.2');
        expect(Parser.parseText("Genesis 1:1-2:1")[0].osis).toBe('Gen.1.1-Gen.2.1');
        expect(Parser.parseText("Genesis 1:1-2:1")[0].osis).toBe('Gen.1.1-Gen.2.1');
        expect(Parser.parseText("Genesis 1:1 - Genesis 2:1")[0].osis).toBe('Gen.1.1-Gen.2.1');
        expect(Parser.parseText("1 John 1:1 - 1 John 2:3")[0].osis).toBe('1John.1.1-1John.2.3');
    });
    test('parse range unrolling', function () {
        expect(Parser.parseText("1 John 1:1--")[0].osis).toBe('1John.1.1');
        expect(Parser.parseText("Song of Solomon 1--2 Singing Songs haha ")[0].osis).toBe('Song.1');
    });
    test('handle multi word books', function () {
        expect(Parser.parseText("John 1")[0].osis).toBe('John.1');
        expect(Parser.parseText("1 John 1")[0].osis).toBe('1John.1');
        expect(Parser.parseText("1 John 1-1 John 2")[0].osis).toBe('1John.1-1John.2');
        expect(Parser.parseText("Songs of solomon 1-Songs of solomon 2")[0].osis).toBe('Song.1-Song.2');
        var t = Parser.parseText("2 Timothy 2 Timothy");
        expect(t.length).toBe(1);
        expect(t[0].osis).toBe('2Tim.2');
    });
    test('handle short books', function () {
        expect(Parser.parseText("Gen 1")[0].osis).toBe('Gen.1');
        expect(Parser.parseText("Ex 1")[0].osis).toBe('Exod.1');
        expect(Parser.parseText("Exod. 1-2")[0].osis).toBe('Exod.1-Exod.2');
        expect(Parser.parseText("Ex. 1-2")[0].osis).toBe('Exod.1-Exod.2');
        expect(Parser.parseText("Josh 1:1-2")[0].osis).toBe('Josh.1.1-Josh.1.2');
    });
});
describe('Parse Verses in Sentence', function () {
    test("parse sentence", function () {
        expect(Parser.parseText("Gen 1 and the lord loves us all")[0].osis).toBe('Gen.1');
        expect(Parser.parseText("Ex 1-2 and the lord loves us all")[0].osis).toBe('Exod.1-Exod.2');
        expect(Parser.parseText("1 Sam 1 and the lord loves us all")[0].osis).toBe('1Sam.1');
    });
    test("parse multiple verses in a sentence", function () {
        expect(Parser.parseText("Gen 1 and Mark 10:1 the lord loves us all").map(function (m) { return m.osis; })).toContain('Gen.1');
        expect(Parser.parseText("Gen 1 and Mark 10:1 the lord loves us all").map(function (m) { return m.osis; })).toContain('Mark.10.1');
        expect(Parser.parseText("Gen 1 and Mark 10:1 the lord loves us all").length).toBe(2);
        expect(Parser.parseText("Gen 1--- and Mark 10:1-12:11 the lord ----loves us all")
            .map(function (m) { return m.osis; })).toContain('Mark.10.1-Mark.12.11');
    });
});
describe('Handles whitespace', function () {
    test("Ignores whitespace in book name", function () {
        expect(Parser.parseText("1Samuel 1")[0].osis).toBe('1Sam.1');
        expect(Parser.parseText("1 Sam 1")[0].osis).toBe('1Sam.1');
        expect(Parser.parseText("1Peter 1")[0].osis).toBe('1Pet.1');
        expect(Parser.parseText("1 Peter 1")[0].osis).toBe('1Pet.1');
    });
});
describe('Works in spanish', function () {
    test("parses chapters", function () {
        expect(Parser.parseText("1Reyes 1")[0].osis).toBe('1Kgs.1');
        expect(Parser.parseText("Mateo 1")[0].osis).toBe('Matt.1');
    });
});
describe('Handles Whitespace', function () {
    test("Line endings", function () {
        expect(Parser.parseText("1Pedro" + String.fromCharCode(160) + "1")[0].osis).toBe('1Pet.1');
        expect(Parser.parseText("Mateo 1")[0].osis).toBe('Matt.1');
        var parsed = Parser.parseText("1 peter 1:1  \n");
        expect(parsed[0].text).toBe('1 peter 1:1');
        expect(parsed[0].osis).toBe('1Pet.1.1');
    });
    test("Range white space", function () {
        var parsed = Parser.parseText("1 peter 1:1 - 2\n");
        expect(parsed[0].text).toBe('1 peter 1:1 - 2');
        expect(parsed[0].osis).toBe('1Pet.1.1-1Pet.1.2');
    });
    test("Doesn't match across line breaks", function () {
        var parsed = Parser.parseText("1 peter 1:1 - \n2");
        expect(parsed[0].text).toBe('1 peter 1:1');
        expect(parsed[0].osis).toBe('1Pet.1.1');
    });
    test("Doesn't match refrences that are apart of another word", function () {
        expect(Parser.parseText("ex 4")[0].osis).toBe('Exod.4');
        expect(Parser.parseText("tex 4").length).toBe(0);
    });
});
describe('Handles commas', function () {
    test("Doesn't match solo book names next to range delimiters ", function () {
        expect(Parser.parseText('Arrepentíos, y bautícese .‭').length).toBe(0);
    });
    test("verse only commas ", function () {
        var parsed = Parser.parseText("1 peter 1:1, John 2:2");
        expect(parsed[0].osis).toBe('1Pet.1.1,John.2.2');
    });
    test.skip("Verse comma, chapter reference", function () {
        var parsed = Parser.parseText("Mark 1:1, 1 Peter 2");
        expect(parsed[0].osis).toBe('Mark.1.1,1Pet.2');
    });
    test.skip("More than two verses in a string", function () {
        var parsed = Parser.parseText("John 1:1, Revelation 19:13, John 17:5");
        expect(parsed[0].osis).toBe('John.1.1,Rev.19.13,John.17.5');
    });
    test("verse only commas ", function () {
        var parsed = Parser.parseText("1 peter 1:1,2:2");
        expect(parsed[0].osis).toBe('1Pet.1.1,1Pet.2.2');
    });
    test("handles more than one comma ", function () {
        var parsed = Parser.parseText("1 peter 1:1,2,2:3");
        expect(parsed[0].osis).toBe('1Pet.1.1,1Pet.1.2,1Pet.2.3');
    });
    test('Parses gen.1.1 properly', function () {
        expect(Parser.parseText('gen.1.1')[0].osis).toBe('Gen.1.1');
    });
});
