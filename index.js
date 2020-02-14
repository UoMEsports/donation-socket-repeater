/* eslint-disable babel/new-cap, new-cap */
'use strict';

const app = require('express')();
const server = require('http').Server(app);
const bodyParser = require('body-parser');
const io = require('socket.io')(server);
const convict = require('convict');
let conf = convict({
	port: {
		doc: 'The port on which to listen for POSTs from the tracker.',
		format: 'port',
		default: 8080,
		env: 'PORT',
		arg: 'port'
	},
	secretKey: {
		doc: 'The secret key that must be provided in POST requests for them to be accepted.',
		format: String,
		default: '',
		env: 'SECRET_KEY',
		arg: 'secretKey'
	},
	debug: {
		doc: 'Whether or not to enable debug logging.',
		format: Boolean,
		default: false,
		env: 'DEBUG',
		arg: 'debug'
	}
})
	.loadFile('./config.json')
	.getProperties();

app.use(bodyParser.json());
server.listen(conf.port, '127.0.0.1');
console.log(`Listening on port ${conf.port}.`);

app.get('/', (req, res) => {
	if (conf.debug) {
		res.send('Running DEBUG');
	} else {
		res.send('Running OK');
	}
});

// PayPal donations from the tracker are POSTed to us as they come in.
app.post(`/donation`, (req, res) => {
	if (req.body.key !== conf.secretKey) {
		if (conf.debug) {
			console.log('failed to post donation with body: ');
			console.log(req.body);
		}
		res.sendStatus(403);
		return;
	}

	if (conf.debug) {
		console.log(req.body);
	}

	const data = {
		name: req.body.donor__visiblename,
		visibility: req.body.donor__visibility,
		comment: req.body.comment,
		rawAmount: req.body.amount,
		newTotal: req.body.new_total,
		domain: req.body.domain
	};

	io.emit('donation', data);
	console.log('Emitted donation:', data);

	res.sendStatus(200);
});
