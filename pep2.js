// Parameters
let downsample = 2; // pixels / sample (Gitterpunkt)
let maxPot = 100 * 1000; // maximum Potential
let omega = 1.9; // Improves convergency speed
let maxerror = 0.1; // lasterror < maxerror -> done

function createStructures() {
  // Defines the sturctures present in simulation
  Rects.push(new Rect(new Vector(-5, 5), new Vector(5, -5), maxPot)); //Positively charged metal
  Rects.push(new Rect(new Vector(30, 20), new Vector(35, 2), 0)); // Neutral metal
  Rects.push(new Rect(new Vector(30, -2), new Vector(35, -20), 0)); //Neutral metal
}

//----------------------------------------------------------

class Vector {
  constructor (x, y) {
    this.x = x;
    this.y = y;
    this.potential = 0;
  }
  toString () { return '[' + this.x + ',' + this.y + ']'; }
}

class Rect {
  // Using top left and bottom right corners was a bit stupid, but it works...
  constructor (topLeft, bottomRight, potential) {
    this.tl = topLeft;
    this.br = bottomRight;
    this.potential = potential;
  }
  contains (vec) { // Check if vector is in rectangle
    return ((vec.x <= this.br.x) && (vec.x >= this.tl.x)) && ((vec.y <= this.tl.y) && (vec.y >= this.br.y));
  }
  toString () { return 'TL: ' + this.tl.toString() + ' BR: ' + this.br.toString(); }
}

// Set up the canvas and conversion (pixel -> coords)
let horPixels = 800; // Size of the canvas 
let vertPixels = 500;
let scale = 50; 
let origin = new Vector(0, 0); //From where to draw the vectors (rel in canvas) [px]
let center = new Vector(15, 0); //Center in the viewed space [1]

let Vectors = [];
let Rects = [];
let iterations = 0;
let errors = [];
let lasterror = 0; // Maximum error in this iteration

window.onload = () => { // Entry point. DOM is loaded from here
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  // downsample if necessary 
  horPixels /= downsample;
  vertPixels /= downsample;

  //Initialize simulation
  createStructures();
  createVectors();

  setText('drawing', 'Calculating...')
  update(); // Starts the update loop
  draw(ctx); // Starts the drawing loop
}

function update () {
  map(Vectors, (vec, x, y) => {
    calculatePot(vec, x, y);
  })
  iterations++;
  setText('iter', 'Iterations: ' + iterations);
  setText('delta', 'Maximum error: ' + lasterror.toFixed(2));

  if (lasterror < maxerror) {
    setText('drawing', 'Done.');
  } else {
    errors.push([iterations, lasterror]);
    Flotr.draw(document.getElementById('plot'), [ errors ], { yaxis: { min: 0, max: 40000}})
    lasterror = 0;
    setTimeout( () => update(), 1); // Recalculate the potential as fast as possible
  }
}

function draw (ctx) {
  map(Vectors, (vec, x, y) => {
    drawVector(ctx, vec, x, y);
  })
  setTimeout( () => draw(ctx), 800); // Only draw to screen every 800ms
}


function calculatePot(vec, x, y) {

  // check if the vector is inside a metal and fix its potential if it is
  let matched = false;
  Rects.forEach( rect => {
    if (rect.contains(vec)) {
      vec.potential = rect.potential;
      matched = true;
    }
  });
  if (matched) return;

  // calculate the new potential. The iteration order guarantees correct indices
  let pot1 = (x == horPixels-1) ? 0 : Vectors[x + 1][y].potential;
  let pot2 = (x == 0) ? 0 : Vectors[x - 1][y].potential;

  let pot3 = (y == vertPixels-1) ? 0 : Vectors[x][y + 1].potential;
  let pot4 = (y == 0) ? 0 : Vectors[x][y - 1].potential;

  // calcuate the deviation of the potential from its new value 
  let error = (0.25 * (pot1 + pot2 + pot3 + pot4)) - vec.potential;
  // update lasterror if error > lasterror
  lasterror = lasterror < error ? error : lasterror
  // assign vector it new potential
  vec.potential += error * omega;
}

function createVectors() { // populate our vectors array. This assigns coordinates to our pixels
  for (let x = 0; x < horPixels; x++) {
    Vectors.push(new Array(vertPixels));
    for (let y = 0; y < vertPixels; y++) {
      let vec = coord(x, y);
      Vectors[x][y] = vec;
    }
  }
}

function coord(x, y) { //Calculates real coordinates based on position in canvas
  coordX = center.x + ( (x / (horPixels -1.0))  -0.5 ) * scale;
  coordY = center.y + ( (y / (vertPixels -1.0)) -0.5 ) * scale *-1; //Canvas has origin in top left corner
  return new Vector(coordX, coordY);
}

// Helper function for elegant iteration of 2D array
function map (array2d, fn) {
  array2d.forEach((sub, x) => { sub.forEach((vec, y) => fn(vec, x, y)) });
}

// Helper function for updating labels
function setText (id, text) { document.getElementById(id).innerHTML = text; }

function drawVector (ctx, vec, x, y) {
  // Calculate the heatmap color for this potential
  // Hue from 0(red) to 250(blue) and Brightness exp. from 0 to 40%
  let potScale = (vec.potential / maxPot);
  let potExp = Math.exp(-1 / (potScale * 200));
  ctx.fillStyle = 'hsl('+ (1- potScale) * 250 +', 100%, '+ potExp * 40 +'%)';
  // Draw a rectangle (respective of previous downsampling)
  ctx.fillRect(origin.x + x * downsample, origin.y + y * downsample, downsample, downsample);
}