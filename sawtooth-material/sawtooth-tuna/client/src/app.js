// SPDX-License-Identifier: Apache-2.0

/* 
This code was written by Zac Delventhal @delventhalz. 
Original source code can be found here: https://github.com/delventhalz/transfer-chain-js/blob/master/client/src/app.js
 */
 
'use strict'

const $ = require('jquery')
const {
  getKeys,
  makeKeyPair,
  saveKeys,
  getState,
  getbalance,
  getNonce,
  submitUpdate
} = require('./state')
const {
  addOption,
  addRow,
  addAction
} = require('./components')

const concatNewOwners = (existing, ownerContainers) => {
  return existing.concat(ownerContainers
    .filter(({ owner }) => !existing.includes(owner))
    .map(({ owner }) => owner))
}

// Application Object
const app = { user: null, keys: [], assets: [], transfers: [] }

app.refresh = function () {
  getState(({ assets, transfers }) => {
    this.assets = assets
    this.transfers = transfers

    // Clear existing data views
    // $('#assetList').empty()
    
    $('[name="receiverAddress"]').children().slice(1).remove()
    $('[name="addressToCheckBalance"]').children().slice(1).remove()
    $('[name="approveToAddress"]').children().slice(1).remove()
    $('[name="transferFromAddress"]').children().slice(1).remove()
    $('[name="transferToAddress"]').children().slice(1).remove()
    // Populate asset views
    assets.forEach(asset => {
      addRow('#assetList', asset.name, asset.owner)
      if (this.user && asset.owner === this.user.public) {
        addOption('[name="assetSelect"]', asset.name)
      }
    })

    // Populate transfer list for selected user
    transfers.filter(transfer => transfer.owner === this.user.public)
      .forEach(transfer => addAction('#transferList', transfer.asset, 'Accept'))

    // Populate transfer select with both local and blockchain keys
    let publicKeys = this.keys.map(pair => pair.public)
    publicKeys = concatNewOwners(publicKeys, assets)
    publicKeys = concatNewOwners(publicKeys, transfers)
    // publicKeys.forEach(key => addOption('[name="transferSelect"]', key))
    publicKeys.forEach(key => addOption('[name="receiverAddress"]', key))
    publicKeys.forEach(key => addOption('[name="addressToCheckBalance"]', key))
    publicKeys.forEach(key => addOption('[name="approveToAddress"]', key))
    publicKeys.forEach(key => addOption('[name="transferFromAddress"]', key))
    publicKeys.forEach(key => addOption('[name="transferToAddress"]', key))
    
  })
}

app.update = function (action, asset, owner, receiver) {
  if(action === 'check-balance') {
    getbalance(asset, (balance) => {
      $('#balance').empty();
      $('#balance').append(`<span>${balance}</span>`);
    });
  }
  if(action === 'approve') {
    let nonce = 1;
    submitUpdate(
      { nonce, action, asset, owner, receiver },
      this.user.private,
      success => success ? this.refresh() : null
    )
  }
  if (this.user && action !== 'check-balance') {
    let address;
    if(action === 'buy-token' || action === 'transfer-token') {
      address = this.user.public;
    }else if(action === 'transferFrom-token') {
      address = owner;
    }
    console.log("address", address);
    getNonce(address, (nonce) => {
      submitUpdate(
        { nonce, action, asset, owner, receiver },
        this.user.private,
        success => success ? this.refresh() : null
      )
      // console.log("nonce",nonce);
      // return nonce;
    }); 
    
  }
}

// app.update = function (action, asset, owner, receiver) {
//   if(action === 'check-balance') {
//     getbalance(asset, (balance) => {
//       $('#balance').empty();
//       $('#balance').append(`<span>${balance}</span>`);
//     });
//   }
//   let nonce = 1;
//   if (this.user) {
//     // getNonce()
//     submitUpdate(
//       { nonce, action, asset, owner, receiver },
//       this.user.private,
//       success => success ? this.refresh() : null
//     )
//   }
// }

// app.checkBalance = function () {
//   var balance = getbalance(owner);
//   $('#balance').empty();
//   $('#balance').append(`<span>${balance}</span>`);
// }

// Select User
$('[name="keySelect"]').on('change', function () {
  if (this.value === 'new') {
    app.user = makeKeyPair()
    app.keys.push(app.user)
    saveKeys(app.keys)
    addOption(this, app.user.public, true)
    // addOption('[name="transferSelect"]', app.user.public)
    addOption('[name="receiverAddress"]', app.user.public)
    addOption('[name="addressToCheckBalance"]', app.user.public)
    addOption('[name="approveToAddress"]', app.user.public)
    addOption('[name="transferFromAddress"]', app.user.public)
    addOption('[name="transferToAddress"]', app.user.public)
  } else if (this.value === 'none') {
    app.user = null
  } else {
    app.user = app.keys.find(key => key.public === this.value)
    app.refresh()
  }
})


$('#buyTokens').on('click', function () {
  const asset = $('[name="requireAmount"]').val()
  if (asset) app.update('buy-token', asset)
})

$('#transferTokens').on('click', function () {
  const asset = $('[name="amountToTransfer"]').val()
  const owner = $('[name="receiverAddress"]').val()
  if (asset && owner ) app.update('transfer-token', asset, owner)
})

$('#approveTokens').on('click', function () {
  const asset = $('[name="approveAmount"]').val()
  const owner = $('[name="approveToAddress"]').val()
  if (asset && owner) app.update('approve', asset, owner)
})

$('#tranferFromTokens').on('click', function () {
  const asset = $('[name="transferAmount"]').val()
  const owner = $('[name="transferFromAddress"]').val()
  const receiver = $('[name="transferToAddress"]').val()
  if (asset && owner && receiver ) app.update('transferFrom-token', asset, owner, receiver)
})

$('#checkBalance').on('click', function () {
  const owner = $('[name="addressToCheckBalance"]').val()
  if (owner) app.update('check-balance', owner)
})

// $('#checkTotalBalance').on('click', function () {
//   app.update('check-total-balance')
// })


// Initialize
app.keys = getKeys()
app.keys.forEach(pair => addOption('[name="keySelect"]', pair.public))
app.refresh()
