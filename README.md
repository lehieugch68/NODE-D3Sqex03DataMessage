# Node Drakengard 3 Sqex03DataMessage

Library for exporting and re-importing text from Drakengard 3 archives (Unreal 3).

## Install

```
npm i drakengard3-sqex03datamessage
```

## Usage:

- Use [Unreal Package Decompressor](https://www.gildor.org/downloads) on .xxx archives (ALLMESSAGE_SF.XXX and MISSIONMESSAGE_SF.XXX);
- Copy the uncompressed files and PS3TOC.TXT (in the game folder) to the same folder.
- Use this library to export and re-import text.

```js
const D3Sqex03DataMessage = require("drakengard3-sqex03datamessage")

//Export
D3Sqex03DataMessage.Export(source, destination).catch(er => console.log(err))

//Import
D3Sqex03DataMessage.Import(source, export_directory, import_directory).catch(er => console.log(err))
})
```
