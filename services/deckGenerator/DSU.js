'use strict';

/**
 * Disjoint Set Union (Union-Find) with union-by-size and path compression.
 *
 * Nodes are arbitrary strings (e.g. "q,r" grid keys or resource+position combos).
 * find() runs in O(α(N)) ≈ O(1) amortised.
 *
 * One DSU instance per resource type per simulation is the intended usage.
 */
class DSU {
  constructor() {
    /** @type {Object.<string, string>} */
    this._parent = Object.create(null);
    /** @type {Object.<string, number>} */
    this._size = Object.create(null);
  }

  /** Lazily initialise a node the first time it is seen. */
  _init(x) {
    if (this._parent[x] === undefined) {
      this._parent[x] = x;
      this._size[x] = 1;
    }
  }

  /**
   * Find root of x with path compression.
   * @param {string} x
   * @returns {string} root
   */
  find(x) {
    this._init(x);
    if (this._parent[x] !== x) {
      this._parent[x] = this.find(this._parent[x]); // path compression
    }
    return this._parent[x];
  }

  /**
   * Union the sets containing a and b (union by size).
   * @param {string} a
   * @param {string} b
   */
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;

    if (this._size[ra] < this._size[rb]) {
      this._parent[ra] = rb;
      this._size[rb] += this._size[ra];
    } else {
      this._parent[rb] = ra;
      this._size[ra] += this._size[rb];
    }
  }

  /**
   * Return the size of the component containing x.
   * @param {string} x
   * @returns {number}
   */
  getSize(x) {
    return this._size[this.find(x)] ?? 1;
  }
}

module.exports = DSU;
