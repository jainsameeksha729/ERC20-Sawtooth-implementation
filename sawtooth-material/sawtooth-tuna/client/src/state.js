// SPDX-License-Identifier: Apache-2.0

/*
This code was written by Zac Delventhal @delventhalz.
Original source code can be found here: https://github.com/delventhalz/transfer-chain-js/blob/master/client/src/state.js
 */

'use strict'

const $ = require('jquery')
const {createHash} = require('crypto')
const protobuf = require('sawtooth-sdk/protobuf')
const {
  createContext,
  Signer
} = require('sawtooth-sdk/signing')
const secp256k1 = require('sawtooth-sdk/signing/secp256k1')

// Config variables
const KEY_NAME = 'transfer-chain.keys'
const API_URL = 'http://localhost:8000/api'

// const FAMILY = 'erc20transfer-chain'
const FAMILY = 'transfer-chain' //'erc20transfer-chain'
const VERSION = '0.0'
const PREFIX = '19d832' //'f7979b'
// const PREFIX = 'f7979b' 

// Fetch key-pairs from localStorage
const getKeys = () => {
  const storedKeys = localStorage.getItem(KEY_NAME)
  if (!storedKeys) return []

  return storedKeys.split(';').map((pair) => {
    const separated = pair.split(',')
    return {
      public: separated[0],
      private: separated[1]
    }
  })
}

// Create new key-pair
const makeKeyPair = () => {
  const context = createContext('secp256k1')
  const privateKey = context.newRandomPrivateKey()
  return {
    public: context.getPublicKey(privateKey).asHex(),
    private: privateKey.asHex()
  }
}

// Save key-pairs to localStorage
const saveKeys = keys => {
  const paired = keys.map(pair => [pair.public, pair.private].join(','))
  localStorage.setItem(KEY_NAME, paired.join(';'))
}

// Fetch current Sawtooth Tuna Chain state from validator
const getState = cb => {
  $.get(`${API_URL}/state?address=${PREFIX}`, ({ data }) => {
    cb(data.reduce((processed, datum) => {
      if (datum.data !== '') {
        const parsed = JSON.parse(atob(datum.data))
        if (datum.address[7] === '0') processed.assets.push(parsed)
        if (datum.address[7] === '1') processed.transfers.push(parsed)
      }
      return processed
    }, {assets: [], transfers: []}))
  })
}

const getbalance = (owner, cb) => {
  const namespace = createHash('sha512').update('transfer-chain').digest('hex').toLowerCase().substring(0, 6);
  const addhash = createHash('sha512').update(owner).digest('hex').toLowerCase().substring(0, 62);
  let address = namespace + '00' + addhash;
  
  $.get(`${API_URL}/state?address=${address}`, ({ data }) => {
    // console.log("data", data)
    if (data[0] || data[0].data !== '') {
      let b = new Buffer(data[0].data, 'base64')
      let s = b.toString();
      let parse = JSON.parse(s)
      console.log("parse.amount",parse.amount);
      console.log("parse.nonce",parse.nonce);
      cb(parse.amount)
    }
  });
}

const getNonce = (owner, cb) => {
  const namespace = createHash('sha512').update('transfer-chain').digest('hex').toLowerCase().substring(0, 6);
  // console.log("namespace", namespace)
  const addhash = createHash('sha512').update(owner).digest('hex').toLowerCase().substring(0, 62);
  // console.log("addhash", addhash)
  let address = namespace + '00' + addhash;
  // console.log("address2", address)
  $.get(`${API_URL}/state?address=${address}`, ({ data }) => {
    console.log("heyyy", data);
    if(data[0]){
      if (data[0].data !== '') {
        let b = new Buffer(data[0].data, 'base64')
        let s = b.toString();
        let parse = JSON.parse(s)
        // console.log("parse.nonce",parse.nonce);
        cb(parse.nonce + 1)
      }
    }
    else{
      cb(1)
    }
  });
}


// Submit signed Transaction to validator
const submitUpdate = (payload, privateKeyHex, cb) => {
  // Create signer
  const context = createContext('secp256k1')
  const privateKey = secp256k1.Secp256k1PrivateKey.fromHex(privateKeyHex)
  const signer = new Signer(context, privateKey)

  // Create the TransactionHeader
  const payloadBytes = Buffer.from(JSON.stringify(payload))
  const transactionHeaderBytes = protobuf.TransactionHeader.encode({
    familyName: FAMILY,
    familyVersion: VERSION,
    inputs: [PREFIX],
    outputs: [PREFIX],
    signerPublicKey: signer.getPublicKey().asHex(),
    batcherPublicKey: signer.getPublicKey().asHex(),
    dependencies: [],
    payloadSha512: createHash('sha512').update(payloadBytes).digest('hex')
  }).finish()

  // Create the Transaction
  const transactionHeaderSignature = signer.sign(transactionHeaderBytes)

  const transaction = protobuf.Transaction.create({
    header: transactionHeaderBytes,
    headerSignature: transactionHeaderSignature,
    payload: payloadBytes
  })

  // Create the BatchHeader
  const batchHeaderBytes = protobuf.BatchHeader.encode({
    signerPublicKey: signer.getPublicKey().asHex(),
    transactionIds: [transaction.headerSignature]
  }).finish()

  // Create the Batch
  const batchHeaderSignature = signer.sign(batchHeaderBytes)

  const batch = protobuf.Batch.create({
    header: batchHeaderBytes,
    headerSignature: batchHeaderSignature,
    transactions: [transaction]
  })

  // Encode the Batch in a BatchList
  const batchListBytes = protobuf.BatchList.encode({
    batches: [batch]
  }).finish()

  // console.log("batchList", batchListBytes);
  // Submit BatchList to Validator
  $.post({
    url: `${API_URL}/batches`,
    data: batchListBytes,
    headers: {'Content-Type': 'application/octet-stream'},
    processData: false,
    success: function( resp ) {
      var id = resp.link.split('?')[1]
      $.get(`${API_URL}/batch_statuses?${id}&wait`, ({ data }) => cb(true))
    },
    error: () => cb(false)
  })
}

module.exports = {
  getKeys,
  makeKeyPair,
  saveKeys,
  getState,
  getbalance,
  getNonce,
  submitUpdate
}
