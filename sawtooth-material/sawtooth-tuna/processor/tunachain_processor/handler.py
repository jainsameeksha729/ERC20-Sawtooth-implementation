# Copyright 2018 Intel Corporation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# -----------------------------------------------------------------------------
import hashlib
import json
import logging

from sawtooth_sdk.processor.handler import TransactionHandler
from sawtooth_sdk.processor.exceptions import InvalidTransaction

from tunachain_processor.erc20_payload import ERC20Payload
from tunachain_processor.erc20_state import ERC20State
from tunachain_processor.erc20_state import ERC20_NAMESPACE


LOGGER = logging.getLogger(__name__)

total_supply = 10000

class ERC20TransactionHandler(TransactionHandler):

    @property
    def family_name(self):
        return 'transfer-chain'

    @property
    def family_versions(self):
        return ['0.0']

    @property
    def encodings(self):
        return ['application/json']

    @property
    def namespaces(self):
        return [ERC20_NAMESPACE]

    

    def apply(self, transaction, context):

        header = transaction.header
        signer = header.signer_public_key

        payload = ERC20Payload(transaction.payload)
        state = ERC20State(context)
        

        LOGGER.info('Handling transaction: %s > %s %s:: %s',
                    payload.action,
                    payload.asset,
                    '> ' + payload.owner[:8] + '... ' if payload.owner else '',
                    signer[:8] + '... ')

        if payload.action == 'buy-token':
            _create_asset(asset=payload.asset,
                            signer=signer,
                            nonce=payload.nonce,
                            state=state)
        
        elif payload.action == 'transfer-token':
            _transfer_asset(amount=payload.asset,
                            signer=signer,
                            receiver=payload.owner,
                            nonce=payload.nonce,
                            state=state)

        elif payload.action == 'approve':
            _approve( amount = payload.asset,
                        owner=signer,
                        spender = payload.owner,
                        state=state)

        elif payload.action == 'transferFrom-token':
            _transferFrom(amount = payload.asset,
                            owner=payload.owner,
                            receiver = payload.receiver,
                            signer = signer,
                            nonce=payload.nonce,
                            state=state)

        elif payload.action == 'check-balance':
            _check_balance(owner=payload.owner,
                            state=state)

        else:
            raise InvalidTransaction('Unhandled action: {}'.format(
                payload.action))



def _create_asset(asset, signer, nonce, state): 
    global total_supply
    ownerBalance = state.get_balance(signer)
    # ownerNonce = state.get_nonce(signer)
    value = int(asset, 10)
    if (total_supply - value) >= 0:
        state.set_balance(value + ownerBalance, signer, nonce)
        total_supply = total_supply - value

        
def _transfer_asset(amount, signer, receiver, nonce, state):
    ownerBalance = state.get_balance(signer)
    # ownerNonce = state.get_nonce(signer)
    receiverBalance = state.get_balance(receiver)
    receiverNonce = state.get_nonce(receiver)
    value = int(amount, 10)
    if ownerBalance is 0:
        raise InvalidTransaction('User does not have sufficient amount')
    
    if ownerBalance >= value:
        state.set_balance(ownerBalance - value, signer, nonce)
        state.set_balance(receiverBalance + value, receiver, receiverNonce+1)
            
    else:
        raise InvalidTransaction('User does not have sufficient amount')

def _approve(amount, owner, spender, state):
    ownerBalance = state.get_balance(owner)
    if ownerBalance is 0 or ownerBalance < int(amount, 10):
        raise InvalidTransaction('User does not have sufficient amount')
    else:
        state.approve(int(amount, 10), owner, spender)
    

def _transferFrom(amount, owner, receiver, signer, nonce, state):
    approveAmount = state.get_approve(owner,signer)
    ownerBalance = state.get_balance(owner)
    receiverBalance = state.get_balance(receiver)

    # ownerNonce = state.get_nonce(owner)
    receiverNonce = state.get_nonce(receiver)

    value = int(amount, 10)
    if ownerBalance >= value and approveAmount >= value:
        state.approve(approveAmount - value, owner, signer)
        state.set_balance(ownerBalance - value, owner, nonce)
        state.set_balance(receiverBalance + value, receiver, receiverNonce+1)

def _check_balance(owner, state):
    state.get_balance(owner)

def getState(state):
    return state

