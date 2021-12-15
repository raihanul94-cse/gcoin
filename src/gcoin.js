const SHA256 = require("crypto-js/sha256");
const EC = require("elliptic").ec;
const ec = EC("secp256k1");

class Blockchain {
  constructor() {
    this.chain = [this.create_genesis_block()];
    this.difficulty = 4;
    this.pending_transactions = [];
    this.mining_rewards = 100;
  }

  create_genesis_block() {
    return new Block(Date.parse("2017-01-01"), [], "0");
  }

  get_latest_block() {
    return this.chain[this.chain.length - 1];
  }

  mine_pending_transactions(mining_reward_address) {
    const reward_transaction = new Transaction(
      null,
      mining_reward_address,
      this.mining_rewards
    );
    this.pending_transactions.push(reward_transaction);

    let block = new Block(Date.now(), this.pending_transactions);
    block.previous_hash = this.get_latest_block().hash;
    block.mine_block(this.difficulty);

    console.log("Mined Succesfully done!");
    this.chain.push(block);

    this.pending_transactions = [];
  }

  add_transaction(transaction) {
    if (!transaction.from_address || !transaction.to_address) {
      throw new Error("Transaction must include from and to address");
    }

    if (!transaction.is_valid()) {
      throw new Error("Cannot add invalid transaction");
    }
    
    this.pending_transactions.push(transaction);
  }

  get_balance_of_address(address) {
    let balance = 0;

    for (let block of this.chain) {
      for (let transaction of block.transactions) {
        if (transaction.from_address === address) {
          balance -= transaction.amount;
        }

        if (transaction.to_address === address) {
          balance += transaction.amount;
        }
      }
    }

    return balance;
  }

  is_chain_valid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current_block = this.chain[i];
      const previous_block = this.chain[i - 1];

      if (!current_block.has_valid_transaction()) {
        return false;
      }

      if (current_block.hash !== current_block.calculate_hash()) {
        return false;
      }

      if (current_block.previous_hash !== previous_block.hash) {
        return false;
      }
    }

    return true;
  }
}

class Block {
  constructor(timestamp, transactions, previous_hash = "") {
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previous_hash = previous_hash;
    this.hash = this.calculate_hash();
    this.nonse = 0;
  }

  calculate_hash() {
    return SHA256(
      this.previous_hash +
        this.timestamp +
        JSON.stringify(this.data) +
        this.nonse
    ).toString();
  }

  mine_block(difficulty) {
    while (
      this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")
    ) {
      this.nonse++;
      this.hash = this.calculate_hash();
    }

    console.log(`Block mined: ${this.hash}`);
    console.log(Date());
  }

  has_valid_transaction() {
    for (let transaction of this.transactions) {
      if (!transaction.is_valid()) {
        return false;
      }
    }

    return true;
  }
}

class Transaction {
  constructor(from_address, to_address, amount) {
    this.from_address = from_address;
    this.to_address = to_address;
    this.amount = amount;
    this.timestamp = Date.now();
  }

  calculate_hash() {
    return SHA256(this.from_address + this.to_address + this.amount).toString();
  }

  sign_transaction(signing_key) {
    if (signing_key.getPublic("hex") !== this.from_address) {
      throw new Error("You cannot sign transaction for other wallet.");
    }

    const hashed_transaction = this.calculate_hash();
    const signature = signing_key.sign(hashed_transaction, "base64");
    this.signature = signature.toDER("hex");
  }

  is_valid() {
    if (this.from_address === null) return true;

    if (!this.signature || this.signature.length === 0) {
      throw new Error("No signature in this transaction");
    }

    const public_key = ec.keyFromPublic(this.from_address, "hex");
    return public_key.verify(this.calculate_hash(), this.signature);
  }
}

module.exports.Blockchain = Blockchain;
module.exports.Transaction = Transaction;
