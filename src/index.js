const path = require('path')
const fs = require('fs')
const Sqex03DataMessage = require('./modules/Sqex03DataMessage')
const Archives = require('./modules/ArchiveInfo')

const D3Sqex03DataMessage = {
    Export(source, destination) {
        return new Promise(async (resolve, reject) => {
            try {
                const files = fs.readdirSync(source).filter(file => Archives.some(e => e.Name.includes(path.basename(file))));
                for (let file of files) {
                    const file_path = path.join(source, file);
                    await Sqex03DataMessage.Export(file_path, destination);
                }
                resolve(`Export sucessfully: ${files.join(', ')}`);
            } catch (err) {
                return reject(err);
            }
        })
    },
    Import(source, export_dir, import_dir) {
        return new Promise(async (resolve, reject) => {
            try {
                const files = fs.readdirSync(source).filter(file => Archives.some(e => e.Name.includes(path.basename(file))));
                for (let file of files) {
                    const new_file = path.join(import_dir, file);
                    const file_path = path.join(source, file);
                    await Sqex03DataMessage.Import(export_dir, file_path, new_file);
                }
                resolve(`Re-import sucessfully: ${files.join(', ')}`);
            } catch (err) {
                return reject(err);
            }
        })
    }
}

//D3Sqex03DataMessage.Export("./Source", "./Export").catch(err => console.log(err))
D3Sqex03DataMessage.Import("./Source", "./Export", "./Import").catch(err => console.log(err))

//module.exports = D3Sqex03DataMessage;