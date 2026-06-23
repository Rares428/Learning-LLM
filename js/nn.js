/* ============ Tiny neural network library (shared) ============ */
window.NN = (function () {
  'use strict';

  function randn() { // gaussian-ish
    return (Math.random() * 2 - 1 + Math.random() * 2 - 1 + Math.random() * 2 - 1) / 1.5;
  }

  // layers: array of layer sizes, e.g. [5, 8, 6, 2]
  function Network(layers) {
    this.layers = layers.slice();
    this.weights = []; // weights[l][j][i] : from neuron i in layer l to neuron j in layer l+1
    this.biases = [];  // biases[l][j]
    for (let l = 0; l < layers.length - 1; l++) {
      const inN = layers[l], outN = layers[l + 1];
      const w = [];
      for (let j = 0; j < outN; j++) {
        const row = [];
        for (let i = 0; i < inN; i++) row.push(randn());
        w.push(row);
      }
      this.weights.push(w);
      const b = [];
      for (let j = 0; j < outN; j++) b.push(randn());
      this.biases.push(b);
    }
    this.activations = []; // last forward pass, for visualization
  }

  Network.prototype.forward = function (input) {
    let a = input.slice();
    this.activations = [a.slice()];
    for (let l = 0; l < this.weights.length; l++) {
      const w = this.weights[l], b = this.biases[l];
      const out = [];
      for (let j = 0; j < w.length; j++) {
        let sum = b[j];
        for (let i = 0; i < a.length; i++) sum += w[j][i] * a[i];
        out.push(Math.tanh(sum)); // tanh everywhere keeps outputs in [-1,1]
      }
      a = out;
      this.activations.push(a.slice());
    }
    return a;
  };

  Network.prototype.copy = function () {
    const n = new Network(this.layers);
    n.weights = this.weights.map(w => w.map(row => row.slice()));
    n.biases = this.biases.map(b => b.slice());
    return n;
  };

  // mutate in place: each weight has `rate` chance to be nudged
  Network.prototype.mutate = function (rate, amount) {
    amount = amount || 0.5;
    const mut = v => Math.random() < rate ? v + randn() * amount : v;
    this.weights = this.weights.map(w => w.map(row => row.map(mut)));
    this.biases = this.biases.map(b => b.map(mut));
    return this;
  };

  // crossover: blend two parents
  Network.crossover = function (a, b) {
    const child = a.copy();
    for (let l = 0; l < child.weights.length; l++) {
      for (let j = 0; j < child.weights[l].length; j++) {
        for (let i = 0; i < child.weights[l][j].length; i++) {
          if (Math.random() < 0.5) child.weights[l][j][i] = b.weights[l][j][i];
        }
        if (Math.random() < 0.5) child.biases[l][j] = b.biases[l][j];
      }
    }
    return child;
  };

  return { Network };
})();
