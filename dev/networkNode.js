
const express = require('express');
const app = express();
const blockchain = require('./blockchain');
const port = process.argv[2];
const { v4: uuid } = require('uuid');
const rp = require('request-promise');


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const bitcoin = new blockchain();
const nodeAddress = uuid().split('-').join('');

app.get('/blockchain', function (req, res) {
	res.send(bitcoin);
});

app.post('/transaction', function(req, res) {
	const blockIndex = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
	bitcoin.createNewTransaction(12.5, "00", nodeAddress);
	res.json({note: `transaction will be added to the block ${blockIndex} `});
});

app.post('/receive-new-block', function(req, res) {
	const newBlock = req.body.newBlock;
	const lastBlock = bitcoin.getLastBlock();
	const correctHash = lastBlock.hash === newBlock.previousBlockHash; 
	const correctIndex = lastBlock['index'] + 1 === newBlock['index'];

	if (correctHash && correctIndex) {
		bitcoin.chain.push(newBlock);
		bitcoin.pendingTransactions = [];
		res.json({
			note: 'New block received and accepted.',
			newBlock: newBlock
		});
	} else {
		res.json({
			note: 'New block rejected.',
			newBlock: newBlock
		});
	}
});

app.get('/mine', function(req, res) {

	const lastBlock = bitcoin.getLastBlock();
	const previousHash = lastBlock['hash'];
	const currentBlockData = {
		transactions: bitcoin.pendingTransactions,
		index: lastBlock['index'] + 1
	};
	const nonce = bitcoin.ProofOfWork(previousHash,currentBlockData);
	const hash = bitcoin.createHash(previousHash,currentBlockData,nonce);
	const newBlock = bitcoin.createNewBlock(nonce,previousHash,hash);

	const requestPromises = [];
	bitcoin.networkNodes.forEach(networkNodeUrl => {
		const requestOptions = {
			uri: networkNodeUrl + '/receive-new-block',
			method: 'POST',
			body: { newBlock: newBlock },
			json: true
		};

		requestPromises.push(rp(requestOptions));
	});

	Promise.all(requestPromises)
	.then(data => {
		const requestOptions = {
			uri: bitcoin.currentNodeUrl + '/transaction/broadcast',
			method: 'POST',
			body: {
				amount: 12.5,
				sender: "00",
				recipient: nodeAddress
			},
			json: true
		};

		return rp(requestOptions);
	})
	.then(data => {
		res.json({
			note: "New block mined & broadcast successfully",
			block: newBlock
		});
	});
});

app.post('/register-and-broadcast-node', function(req, res) {
	const newNodeUrl = req.body.newNodeUrl;
	if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1) bitcoin.networkNodes.push(newNodeUrl);

	const regNodesPromises = [];
	bitcoin.networkNodes.forEach(networkNodeUrl => {
		const requestOptions = {
			uri: networkNodeUrl + '/register-node',
			method: 'POST',
			body: { newNodeUrl: newNodeUrl },
			json: true
		};

		regNodesPromises.push(rp(requestOptions));
	});

	Promise.all(regNodesPromises)
	.then(data => {
		const bulkRegisterOptions = {
			uri: newNodeUrl + '/register-nodes-bulk',
			method: 'POST',
			body: { allNetworkNodes: [ ...bitcoin.networkNodes, bitcoin.currentNodeUrl ] },
			json: true
		};

		return rp(bulkRegisterOptions);
	})
	.then(data => {
		res.json({ note: 'New node registered with network successfully.' });
	});
});


// register a node with the network
app.post('/register-node', function(req, res) {
	const newNodeUrl = req.body.newNodeUrl;
	const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
	const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl;
	if (nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(newNodeUrl);
	res.json({ note: 'New node registered successfully.' });
});


// register multiple nodes at once
app.post('/register-nodes-bulk', function(req, res) {
	const allNetworkNodes = req.body.allNetworkNodes;
	allNetworkNodes.forEach(networkNodeUrl => {
		const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;
		const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl;
		if (nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(networkNodeUrl);
	});

	res.json({ note: 'Bulk registration successful.' });
});

app.post('/register-node-bulk', function (req, res) {
	const allNetworkNodes = req.body.allNetworkNodes;
	allNetworkNodes.forEach(networkNodeUrl => {
		const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;
		const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl;
		if (nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(networkNodeUrl);
	});
	res.json({note: 'Bulk registration successful.' });
});

app.post('/transaction/broadcast',function(req,res){
	const newTransaction = bitcoin.createNewTransaction(req.body.amount,req.body.sender,req.body.recipient);
	bitcoin.addTransactiontoPendingTransaction(newTransaction);
	const requestPromises = [];
	bitcoin.networkNodes.forEach(networkNodeUrl=>{
		const requestOptions = {
			uri : networkNodeUrl + '/transaction',
			body : newTransaction,
			method : 'POST',
			json : true
		};
		requestPromises.push(rp(requestOptions));
	});
	Promise.all(requestPromises)
	.then(data=>{
		res.json({note : 'Transaction and Broadcast was Successfull.'})
	});
});

app.post('/transaction',function(req,res){
	const blockIndex = bitcoin.addTransactiontoPendingTransaction(newTransaction);
	res.json({note : `Transaction will be added to the ${blockIndex}.`});
})

app.listen(port,function(){
	console.log(`Listening on port ${port}...`);
});