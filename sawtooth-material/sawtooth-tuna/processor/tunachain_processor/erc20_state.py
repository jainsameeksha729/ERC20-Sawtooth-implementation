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


LOGGER = logging.getLogger(__name__)

token_name = 'erc20token'
total_supply = 10000

ERC20_NAMESPACE = hashlib.sha512(
    'transfer-chain'.encode('utf-8')).hexdigest()[0:6]

def get_user_address(user):
    return hashlib.sha512((user).encode('utf-8')).hexdigest()[:62]


def _get_asset_address(asset_name):
    return ERC20_NAMESPACE + '00' + get_user_address(asset_name)


def _get_token_address(asset_name):
    return ERC20_NAMESPACE + '01' + get_user_address(asset_name)

def _get_allowance_address(asset_name):
    return ERC20_NAMESPACE + '02' + get_user_address(asset_name)


def _deserialize(data):
    return json.loads(data.decode('utf-8'))


def _serialize(data):
    return json.dumps(data, sort_keys=True).encode('utf-8')



class ERC20State(object):

    TIMEOUT = 3
    

    def __init__(self, context):
        self._context = context

    def set_token_details(self):
        global token_name
        token_address = _get_token_address(token_name)
        state_data = _serialize(
            {
                "tokenName" : 'erc20token',
                "totalSupply": 1000000
            })
        return self._context.set_state(
                {token_address: state_data}, timeout=self.TIMEOUT)

    def get_token_details(self):
        return self.set_token_details()


    def get_balance(self, owner):
        owner_address = _get_asset_address(owner)
        state_entries = self._context.get_state(
            [owner_address], timeout=self.TIMEOUT)
        if state_entries:
            entry = _deserialize(data=state_entries[0].data)
            return entry.get('amount')
        else:
            return 0

    def get_nonce(self, owner):
        owner_address = _get_asset_address(owner)
        state_entries = self._context.get_state(
            [owner_address], timeout=self.TIMEOUT)
        if state_entries:
            entry = _deserialize(data=state_entries[0].data)
            return entry.get('nonce')
        else:
            return 0

    # Check for previous balance           
    def set_balance(self, amount, user, nonce):
        
        address = _get_asset_address(user)
        state_data = _serialize(
            {
                "nonce": nonce,
                "amount": amount
            })
        
        return self._context.set_state(
            {address: state_data}, timeout=self.TIMEOUT)
    
    
        
    def approve(self, amount, owner, spender):
        allowance_address = _get_allowance_address(owner + spender)

        state_data = _serialize(
            {
                "owner":owner,
                "spender":spender,
                "amount": amount
            })

        return self._context.set_state(
            {allowance_address: state_data}, timeout=self.TIMEOUT)
    
    def get_approve(self, owner, spender):
        address = _get_allowance_address(owner+spender)
        state_entries = self._context.get_state(
            [address], timeout=self.TIMEOUT)
        if state_entries:
            entry = _deserialize(data=state_entries[0].data)
            return entry.get('amount')
        else:
            return 0


    
    def get_transfer(self, name):
        return self._get_state(_get_asset_address(name))

    def _get_state(self, address):
        state_entries = self._context.get_state(
            [address], timeout=self.TIMEOUT)
        if state_entries:
            entry = _deserialize(data=state_entries[0].data)
        else:
            entry = None
        return entry
