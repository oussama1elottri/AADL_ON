from web3 import Web3

class MerkleTree:
    def __init__(self, leaves, hash_alg='keccak_256'):
        # leaves expected as bytes-like objects
        self.leaves = [bytes(l) if isinstance(l, (bytes, bytearray)) else bytes.fromhex(l.replace('0x','')) for l in leaves]
        self.levels = []
        self._build_tree()

    def _build_tree(self):
        cur = self.leaves[:]
        if not cur:
            self.levels = [[b'']]
            return
        self.levels = [cur]
        while len(cur) > 1:
            if len(cur) % 2 == 1:
                cur = cur + [cur[-1]]
            nxt = []
            for i in range(0, len(cur), 2):
                a = cur[i]
                b = cur[i+1]
                node = Web3.keccak(a + b)
                nxt.append(node)
            cur = nxt
            self.levels.insert(0, cur)

    def get_root(self):
        root_level = self.levels[0]
        return root_level[0] if root_level else b''

    def get_proof(self, leaf):
        target = bytes(leaf) if isinstance(leaf, (bytes, bytearray)) else bytes.fromhex(leaf.replace('0x',''))
        try:
            index = self.leaves.index(target)
        except ValueError:
            raise ValueError("Leaf not in tree")
        proof = []
        idx = index
        # traverse from leaves up to root (skip root level)
        for level in reversed(self.levels[1:]):
            sibling_index = idx ^ 1
            if sibling_index < len(level):
                proof.append(level[sibling_index])
            else:
                proof.append(level[idx])
            idx = idx // 2
        return proof


def create_applicant_leaf(applicant_id_hash, file_hash, submission_ts_unix, wilaya_code):
    leaf_hash = Web3.solidity_keccak(
        ['bytes32', 'bytes32', 'uint64', 'uint16'],
        [
        bytes.fromhex(applicant_id_hash.replace("0x", "")),
        bytes.fromhex(file_hash.replace("0x", "")),
        submission_ts_unix,
        wilaya_code
        ]
    )
    return leaf_hash