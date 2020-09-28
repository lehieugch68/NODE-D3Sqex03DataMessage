# Node BDO LanguageData

Library for exporting and re-importing text from Drakengard 3 archives (Unreal 3).

##Usage:

- Use [Unreal Package Decompressor](https://www.gildor.org/downloads) on .xxx archives (ALLMESSAGE_SF.XXX and MISSIONMESSAGE_SF.XXX);
- Copy the uncompressed files and PS3TOC.TXT (in the game folder) to the same folder.
- Use this library to export and re-import text.

```js
const D3Sqex03DataMessage = require("D3Sqex03DataMessage")

//Export
D3Sqex03DataMessage.Export(source, destination).catch(er => console.log(err))

//Import
D3Sqex03DataMessage.Import(source, export_directory, import_directory).catch(er => console.log(err))
})
```