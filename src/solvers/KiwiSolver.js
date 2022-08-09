var kiwi = require("kiwi.js");

// Create a solver
var solver = new kiwi.Solver();

// device 1
var number1 = new kiwi.Variable();
solver.addEditVariable(number1, kiwi.Strength.strong);
solver.suggestValue(number1, 1);
var range1 = new kiwi.Variable();
solver.addEditVariable(range1);
solver.suggestValue(range1, 1);

// device 2
var number2 = new kiwi.Variable();
solver.addEditVariable(number2, kiwi.Strength.strong);
solver.suggestValue(number2, 1);
var range2 = new kiwi.Variable();
solver.addEditVariable(range2);
solver.suggestValue(range2, 2);

// device 3
var number3 = new kiwi.Variable();
solver.addEditVariable(number3, kiwi.Strength.strong);
solver.suggestValue(number3, 1);
var range3 = new kiwi.Variable();
solver.addEditVariable(range3);
solver.suggestValue(range3, 3);

// device 4
var number4 = new kiwi.Variable();
solver.addEditVariable(number4, kiwi.Strength.strong);
solver.suggestValue(number4, 1);
var range4 = new kiwi.Variable();
solver.addEditVariable(range4);
solver.suggestValue(range4, 4);

// device 5
var number5 = new kiwi.Variable();
solver.addEditVariable(number5, kiwi.Strength.strong);
solver.suggestValue(number5, 1);
var range5 = new kiwi.Variable();
solver.addEditVariable(range5);
solver.suggestValue(range5, 5);

//solver.addEditVariable(number, kiwi.Strength.strong);
//solver.addEditVariable(range, kiwi.Strength.strong);

//solver.suggestValue(number, 10);
//solver.suggestValue(range, 5);

var suggestedNumber = new kiwi.Variable();
solver.addEditVariable(suggestedNumber);
solver.suggestValue(suggestedNumber, 3);

var suggestedRange = new kiwi.Variable();
solver.addEditVariable(suggestedRange, kiwi.Strength.strong);
solver.suggestValue(suggestedRange, 3);

// Create and add a constraint
solver.addConstraint(
  new kiwi.Constraint(
    new kiwi.Expression([-1, suggestedRange], 3),
    kiwi.Operator.Eq
  )
); //suggested range is less than or equal to 3
solver.addConstraint(
  new kiwi.Constraint(
    new kiwi.Expression(
      [-1, number1],
      [-1, number2],
      [-1, number3],
      [-1, number4],
      [-1, number5],
      5
    ),
    kiwi.Operator.Ge
  )
);

// Solve the constraints
solver.updateVariables();
console.log(suggestedRange.value());
console.log(number1.value());
console.log(number2.value());
console.log(number3.value());
console.log(number4.value());
console.log(number5.value());
//equal(right.value(), 500);
