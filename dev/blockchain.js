
const currentNodeUrl = process.argv[3];
const sha256 = require('sha256');
const { v4: uuidv4 } = require('uuid');



function Blockchain(){

	this.chain = [];
	this.pendingTransactions = [];

	this.currentNodeUrl = currentNodeUrl;
	this.networkNodes = [];
	this.createNewBlock();

}


Blockchain.prototype.createNewBlock = function(nonce,previousHash,hash){
	
	const newBlock = {
		index: this.chain.length + 1,
		timestamp: Date.now(),
		transactions: this.pendingTransactions,
		nonce: nonce,
		previousHash: previousHash,
		hash: hash
	};
	
	this.pendingTransactions=[];
	this.chain.push(newBlock);

	return newBlock;
}

Blockchain.prototype.getLastBlock = function(){

	return this.chain[this.chain.length-1];
}

Blockchain.prototype.createNewTransaction = function(amount,sender,recepient){

	const newTransaction = {
		amount: amount,
		sender: sender,
		recepient: recepient,
		transactionId: uuidv4().split('-').join('')
	};

	return newTransaction;
}

Blockchain.prototype.addTransactiontoPendingTransaction = function(transactionObj){
	this.pendingTransactions.push(transactionObj);
	return this.getLastBlock()['index'] + 1;
}

Blockchain.prototype.createHash = function(previousHash,currentBlockData,nonce){

	const DataAsString = previousHash + nonce.toString() + JSON.stringify(currentBlockData);
	const hash = sha256(DataAsString);

	return hash;
}

Blockchain.prototype.ProofOfWork = function(previousHash,currentBlockData){

	let nonce = 0;
	let hash = this.createHash(previousHash,currentBlockData,nonce);
	while (hash.substring(4,8) !== '0000'){
		nonce++;
		hash = this.createHash(previousHash,currentBlockData,nonce);
	}
	return nonce;
}


module.exports = Blockchain;	