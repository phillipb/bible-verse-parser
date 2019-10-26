# Bible Verse Parser

Parses out verse references in a block of text.

```ts
import {parseText} from 'bible-verse-parser';

parseText('I love Romans 10:9')
// [{"startIdx":7, "endIdx":18, "osis":"Rom.10.9", "text":"Romans 10:9"}]
```

It supports ranges
```ts
import {parseText} from 'bible-verse-parser';

parseText('I love Romans 10:9-10')
// [{"startIdx":7,"endIdx":21,"osis":"Rom.10.9-Rom.10.10","text":"Romans 10:9-10"}]
```

It supports comma spanish
```ts
import {parseText} from 'bible-verse-parser';

parseText('I love Romanos 10:9-10')
// [{"startIdx":7,"endIdx":22,"osis":"Rom.10.9-Rom.10.10","text":"Romanos 10:9-10"}]
```

#### Todo
1. Add ability to customizing the list of valid book names.
1. Add better localization support



