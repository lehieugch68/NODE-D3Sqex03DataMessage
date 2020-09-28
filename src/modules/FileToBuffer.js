const fs = require('fs')

module.exports = (file) => {
	return new Promise(async (resolve, reject) => {
		let readStream = fs.createReadStream(file);
    	let chunks = [];
    	readStream.on('error', err => { return reject(err) });
   		readStream.on('data', chunk => chunks.push(chunk) );
    	readStream.on('close', () => { return resolve(Buffer.concat(chunks)) });
	})
}