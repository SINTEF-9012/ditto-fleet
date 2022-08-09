var Logic = require("logic-solver");

var solver = new Logic.Solver();

var device1 = {
  range: 1,
  device1: 1,
  count: 1
};
var device2 = {
  range: 1,
  device2: 1,
  count: 1
};
var device3 = {
  range: 1,
  device3: 1,
  count: 1
};

solver.require(Logic.atMostOne(device1, device2));
solver.require(Logic.or(device1, device2));

var sol1 = solver.solve();
console.log(sol1.getTrueVars()); // => ["Bob"]

// var sol2 = solver.solveAssuming(Alice);
// console.log(sol2.getTrueVars()); // => ["Alice", "Charlie"]

// var sol3 = solver.solveAssuming(Logic.and(Alice, "-Charlie"))
// console.log(sol3);

// var solutions = [];
// var curSol;
// while ((curSol = solver.solve())) {
//   solutions.push(curSol.getTrueVars());
//   solver.forbid(curSol.getFormula()); // forbid the current solution
// }
// console.log(solutions);
