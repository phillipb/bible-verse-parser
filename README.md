# Bible Verse Parser

Parses out verse references in a block of text.

```ts
import {parseText} from 'bible-verse-parser';

parseText('I love Romans 10:9')
// [{"startIdx":7, "endIdx":18, "osis":"Rom.10.9", "text":"Romans 10:9"}]
```