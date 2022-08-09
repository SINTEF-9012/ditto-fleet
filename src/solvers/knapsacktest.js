var bkp = require("./KnapsackSolver.js");

var list = [
  { item: "1", weight: 1, value: 1, pieces: 1 },
  { item: "2", weight: 2, value: 2, pieces: 1 },
  { item: "3", weight: 3, value: 3, pieces: 1 },
  { item: "4", weight: 4, value: 4, pieces: 1 },
  { item: "5", weight: 5, value: 5, pieces: 1 }
];

var items = [
  { item: "device1", weight: 70, value: 135, pieces: 1 },
  { item: "device2", weight: 73, value: 139, pieces: 1 },
  { item: "device3", weight: 77, value: 149, pieces: 1 },
  { item: "device4", weight: 80, value: 150, pieces: 1 },
  { item: "device5", weight: 82, value: 156, pieces: 1 },
  { item: "device6", weight: 87, value: 163, pieces: 1 },
  { item: "device7", weight: 90, value: 173, pieces: 1 },
  { item: "device8", weight: 94, value: 184, pieces: 1 },
  { item: "device9", weight: 98, value: 192, pieces: 1 },
  { item: "device10", weight: 106, value: 201, pieces: 1 },
  { item: "device11", weight: 110, value: 210, pieces: 1 },
  { item: "device12", weight: 113, value: 214, pieces: 1 },
  { item: "device13", weight: 115, value: 221, pieces: 1 },
  { item: "device14", weight: 118, value: 229, pieces: 1 },
  { item: "device15", weight: 120, value: 240, pieces: 1 }
];

//weight=range (needs to me smaller) value=some value (needs to be greater)
var devices = [
  { item: "device1", weight: 70, value: 135, pieces: 1 },
  { item: "device2", weight: 73, value: 139, pieces: 1 },
  { item: "device3", weight: 77, value: 149, pieces: 1 },
  { item: "device4", weight: 80, value: 150, pieces: 1 },
  { item: "device5", weight: 82, value: 156, pieces: 1 },
  { item: "device6", weight: 87, value: 163, pieces: 1 },
  { item: "device7", weight: 90, value: 173, pieces: 1 },
  { item: "device8", weight: 94, value: 184, pieces: 1 },
  { item: "device9", weight: 98, value: 192, pieces: 1 },
  { item: "device10", weight: 106, value: 201, pieces: 1 },
  { item: "device11", weight: 110, value: 210, pieces: 1 },
  { item: "device12", weight: 113, value: 214, pieces: 1 },
  { item: "device13", weight: 115, value: 221, pieces: 1 },
  { item: "device14", weight: 118, value: 229, pieces: 1 },
  { item: "device15", weight: 120, value: 240, pieces: 1 }
];

console.log(bkp.Bounded(items, 750));
