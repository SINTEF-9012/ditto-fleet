// The entire API is exported by the cassowary object
var c = require("cassowary");
var kiwi = require("kiwi.js");

var solver = new c.SimplexSolver();
var x = new c.Variable({ value: 167 });
var y = new c.Variable({ value: 2 });
var eq = new c.Equation(x, new c.Expression(y));
solver.addConstraint(eq);

console.log(c.LEQ);
console.log("done");

// Create a solver
var solver = new kiwi.Solver();

// Create edit variables
var left = new kiwi.Variable();
var width = new kiwi.Variable();
solver.addEditVariable(left, kiwi.Strength.strong);
solver.addEditVariable(width, kiwi.Strength.strong);
solver.suggestValue(left, 100);
solver.suggestValue(width, 400);

// Create and add a constraint
var right = new kiwi.Variable();
solver.addConstraint(
  new kiwi.Constraint(
    new kiwi.Expression([-1, right], left, width),
    kiwi.Operator.Eq
  )
);

// Solve the constraints
solver.updateVariables();
console.log(right.value());

function cube(x) {
  return x * x * x;
}

//export {cube};
