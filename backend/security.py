from web3 import Web3

def hash_identifier(identifier: str) -> str:
    if not identifier:
        raise ValueError("Identifier cannot be empty.")
        
    return Web3.keccak(text=identifier).hex()

