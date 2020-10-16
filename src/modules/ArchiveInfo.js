const archive_info = [
    {
        Name: ["ALLMESSAGE_SF.XXX", "MISSIONMESSAGE_SF.XXX"],
        Offset: 25,
        Table_to_Data: 456,
        Skip: [7,43,54],
        ChunkCountOffset: 113,
        TableOffset: 125,
        CompressionTypeOffset: 109,
        Replace: [
        	["\u0001", "{01}"],
        	["\u0003", "{03}"],
        	["\u0004", "{04}"],
        	["\u0005", "{05}"],
        	["\u0006", "{06}"],
        	["\u0008", "{08}"],
        	["\u0009", "{09}"],
        	["\u0010", "{10}"],
        	["\u000a", "{0A}"],
        	["\u000b", "{0B}"],
        	["\u000c", "{0C}"],
        	["\u000d", "{0D}"],
        	["\u000f", "{0F}"],
        	["\u25b2", "{25B2}"],
        	["\u25bc", "{25BC}"],
        ]
    }
]

module.exports = archive_info;