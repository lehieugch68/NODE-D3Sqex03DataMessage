const fs = require('fs')
const path = require('path')
const file_to_buffer = require('./FileToBuffer')
const Archives = require('./ArchiveInfo')
const utf16le_bom = "\ufeff";

const trim_Start = (str, char) => {
	if (str.startsWith(char)) str = str.substr(char.length);
	return str;
}

const Sqex03DataMessage = {
    Export (file, extract_dir) {
        let archive_info = Archives.find(e => e.Name.includes(path.basename(file)));
        let data_info = {
            name_table: [],
            name_import: [],
            data: []
        };
        return new Promise(async (resolve, reject) => {
            try {
                let i = 0;
                let buffer = await file_to_buffer(file);
                data_info.name_count = buffer.slice(i += archive_info.Offset, i += 4).readUInt32BE();
                data_info.name_offset = buffer.slice(i, i += 4).readUInt32BE();
                data_info.export_count = buffer.slice(i, i += 4).readUInt32BE();
                data_info.export_offset = buffer.slice(i, i += 4).readUInt32BE();
                data_info.import_count = buffer.slice(i, i += 4).readUInt32BE();
                data_info.import_offset = buffer.slice(i, i += 4).readUInt32BE();

                i = data_info.name_offset;
                for (let x = 0; x < data_info.name_count; x++) {
                    let length = buffer.slice(i, i+=4).readUInt32BE();
                    let name = buffer.slice(i, i+=(length-1)).toString('utf8');
                    data_info.name_table.push(name.trim());
                    i += 9;
                }

                i = data_info.import_offset;
                for (let x = 0; x < data_info.import_count; x++) {
                    i += 20;
                    let index = buffer.slice(i, i+=4).readUInt32BE();
                    i += 4;
                    data_info.name_import[x] = data_info.name_table[index];
                }
                
                i = data_info.export_offset;
                for (let x = 0; x < data_info.export_count; x++) {
                    let data = {};
                    let index_negative = buffer.slice(i, i += 4).readInt32BE();
                    data.type = data_info.name_import[index_negative^0xFFFFFFFF];
                    i += 8;
                    let name_index = buffer.slice(i, i += 4).readUInt32BE();
                    data.name = data_info.name_table[name_index];
                    i += 16;
                    data.size = buffer.slice(i, i += 4).readUInt32BE();
                    data.offset = buffer.slice(i, i += 4).readUInt32BE();
                    i += 4;
                    if (buffer.slice(i, i += 4).readUInt32BE() > 0) i += 4;
                    i += 20;

                    if (data.type === "Sqex03DataMessage") {
                        let p = 0;
                        let real_data = buffer.subarray(data.offset, data.offset+data.size);
                        data.order = real_data.slice(p, p += 4).readUInt32BE();
                        if (archive_info.Skip.includes(data.order)) continue;
                        p += 68;
                        data.length_property = Number(real_data.slice(p, p += 8).readBigUInt64BE());
                        p += data.length_property + 4 + 12;
                        data.strings = [];
                        p += 8; //size of strings
                        data.lines = Number(real_data.slice(p, p += 8).readBigUInt64BE());
                        for (let s = 0; s < data.lines; s++)
                        {
                            let str_length = real_data.slice(p, p+=4).readInt32BE();
                            let zero_bytes = 1;
                            if (str_length < 0) {
                                str_length = str_length ^0xFFFFFFFF;
                                zero_bytes = 2;
                            }
                            let str = zero_bytes < 2 ? real_data.slice(p, p+=(str_length - zero_bytes)).toString('utf8') : real_data.slice(p, p+=(str_length)).toString('utf16le');
                            str = str.replace(/\u0005/g, "{5}").replace(/\u0001/g, "{1}").replace(/\u0004/g, "{4}").replace(/\r\n/g, "{CRLF}").replace(/\r/g, "{CR}").replace(/\n/g, "{LF}");
                            data.strings.push(str);
                            p += zero_bytes;
                        }
                        data_info.data.push(data);
                    }
                }
                const dir = path.join(extract_dir, "MESSAGE");
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                const json_file = path.join(extract_dir, `${path.parse(file).name}.json`);
                for (let data of data_info.data) {
                    const data_file = path.join(dir, `[${data.order}] ${data.name}.txt`);
                    fs.writeFileSync(data_file, data.strings.join("\r\n"), { encoding: 'ucs2' });
                    delete data.strings;
                    delete data.offset;
                    delete data.size;
                }
                fs.writeFileSync(json_file, JSON.stringify(data_info, null, 2), {encoding:'utf8'});
                resolve();

            } catch (err) { return reject(err) }
        })
    },

    Import (dir, source_file, new_file) {
        let archive_info = Archives.find(e => e.Name.includes(path.basename(source_file)));
        return new Promise(async (resolve, reject) => {
            try {
                const json_file = path.join(dir, `${path.parse(source_file).name}.json`);
                let export_info = JSON.parse(fs.readFileSync(json_file, 'utf8'));
                for (let data of export_info.data) {
                    const txt_file = path.join(path.join(dir, "MESSAGE"), `[${data.order}] ${data.name}.txt`);
                    data.strings = trim_Start(fs.readFileSync(txt_file, 'ucs2'), utf16le_bom).replace(/\r/g, "").split("\n").map(e => {
                        return e.replace(/\{5\}/g, "\u0005").replace(/\{1\}/g, "\u0001").replace(/\{4\}/g, "\u0004").replace(/\{CRLF\}/g, "\r\n").replace(/\{CR\}/g, "\r").replace(/\{LF\}/g, "\n");
                    });
                    if (data.strings.length !== data.lines) return reject(`Total number of lines does not match in [${data.order}] ${data.name}.txt`);
                }

                let i = export_info.export_offset, new_buffer = [];
                let buffer = await file_to_buffer(source_file);

                new_buffer.push(buffer.subarray(0, export_info.export_offset)); //header
                let new_data = [];
                let bytes_changed = 0;

                for (let x = 0; x < export_info.export_count; x++) {
                    let data = {};
                    let bytes_size = i;
                    bytes_size += 12;
                    let name_index = buffer.slice(bytes_size, bytes_size += 4).readUInt32BE();
                    data.name = export_info.name_table[name_index];
                    bytes_size += 16;
                    data.size = buffer.slice(bytes_size, bytes_size += 4).readUInt32BE();
                    data.offset = buffer.slice(bytes_size, bytes_size += 4).readUInt32BE();
                    data.new_offset = data.offset + bytes_changed;
                    bytes_size += 4;
                    if (buffer.slice(bytes_size, bytes_size += 4).readUInt32BE() > 0) bytes_size += 4;
                    bytes_size += 20;

                    data.header_length = bytes_size - i;
                    data.real_data = buffer.subarray(data.offset, (data.offset + data.size));
                    data.order = data.real_data.slice(0, 4).readUInt32BE();
                    
                    let export_data = export_info.data.find(e => e.order === data.order && e.name === data.name);

                    if (export_data) {
                        data.new_data = [];
                        let p = (80 + export_data.length_property + 16);
                        data.new_data.push(data.real_data.subarray(0, p));
                        let old_size = Number(data.real_data.slice(p, p+=8).readBigUInt64BE());
                        let lines = data.real_data.subarray(p, p += 8);
                        let temp = [];
                        for (let line of export_data.strings) {
                            let str_length = line.length^0xFFFFFFFF;
                            let buf_length = Buffer.alloc(4);
                            buf_length.writeInt32BE(str_length);
                            let buf_str = Buffer.from(line, 'ucs2');
                            temp.push(buf_length);
                            temp.push(buf_str);
                            temp.push(Buffer.alloc(2));
                        }
                        let string_data = Buffer.concat(temp);
                        let string_length = string_data.length + 4;
                        let new_length = Buffer.alloc(8);
                        new_length.writeBigInt64BE(BigInt(string_length));
                        data.new_data.push(new_length);
                        data.new_data.push(lines);
                        data.new_data.push(string_data);
                        p += (old_size - 4);
                        data.new_data.push(data.real_data.subarray(p, data.real_data.length))
                        data.string_bytes_changed = string_length - old_size;
                        bytes_changed += data.string_bytes_changed;
                        data.new_buffer = Buffer.concat(data.new_data);
                    }

                    new_buffer.push(buffer.subarray(i, i+=32));
                    if (data.string_bytes_changed) {
                        let new_size = Buffer.alloc(4);
                        new_size.writeInt32BE(data.size + data.string_bytes_changed);
                        new_buffer.push(new_size);
                        i += 4;
                    } else {
                        new_buffer.push(buffer.subarray(i, i+=4));
                    }
                    let new_offset = Buffer.alloc(4);
                    new_offset.writeInt32BE(data.new_offset);
                    i += 4;
                    new_buffer.push(new_offset);
                    new_buffer.push(buffer.subarray(i, bytes_size));
                    i = bytes_size;
                    new_data.push(data);
                }
                if (archive_info.Table_to_Data) new_buffer.push(Buffer.alloc(archive_info.Table_to_Data));
                for (let data of new_data) {
                    data.new_buffer ? new_buffer.push(data.new_buffer) : new_buffer.push(data.real_data);
                }
                new_buffer.push(Buffer.alloc(4));

                if (!fs.existsSync(path.dirname(new_file))) fs.mkdirSync(path.dirname(new_file), { recursive: true });

                let buf = Buffer.concat(new_buffer);
                fs.writeFileSync(new_file, buf);

                let toc_file = path.join(path.dirname(new_file), "PS3TOC.TXT");
                let new_toc_file = toc_file;
                if (!fs.existsSync(toc_file)) toc_file = path.join(path.dirname(source_file), "PS3TOC.TXT");
                if (fs.existsSync(toc_file)) {
                    let all_lines = fs.readFileSync(toc_file, 'utf8').replace(/\r/g, "").split("\n");
                    let new_lines = [];
                    for (let line of all_lines) {
                        let info = line.split(" ");
                        if (info[2] && info[2].toLowerCase().match(`(.*)${path.basename(source_file).toLowerCase()}`)) info[0] = buf.length;
                        new_lines.push(info.join(" "));
                    }
                    fs.writeFileSync(new_toc_file, new_lines.join("\r\n", { encoding: 'utf8' }));
                } else {
                    //TOC file not found
                }

                resolve();
            } catch (err) { return reject(err) }

        })
    }
}

module.exports = Sqex03DataMessage;