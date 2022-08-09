var solver = require("javascript-lp-solver"),
  results,
  model = {
    optimize: "count",
    opType: "max",
    constraints: {
      range: { max: 30 },
      device1: { max: 1 },
      device2: { max: 1 },
      device3: { max: 1 },
      device4: { max: 1 },
      device5: { max: 1 },
      device6: { max: 1 },
      device7: { max: 1 },
      device8: { max: 1 },
      device9: { max: 1 },
      device10: { max: 1 }
    },
    variables: {
      ddevice1: {
        range: 1,
        device1: 1,
        count: 1
      },
      ddevice2: {
        range: 2,
        device2: 1,
        count: 1
      },
      ddevice3: {
        range: 3,
        device3: 1,
        count: 1
      },
      ddevice4: {
        range: 4,
        device4: 1,
        count: 1
      },
      ddevice5: {
        range: 5,
        device5: 1,
        count: 1
      },
      ddevice6: {
        range: 6,
        device6: 1,
        count: 1
      },
      ddevice7: {
        range: 7,
        device7: 1,
        count: 1
      },
      ddevice8: {
        range: 8,
        device8: 1,
        count: 1
      },
      ddevice9: {
        range: 9,
        device9: 1,
        count: 1
      },
      ddevice10: {
        range: 10,
        device10: 1,
        count: 1
      }
    },
    ints: {
      count: 1,
      device1: 1,
      device2: 1,
      device3: 1,
      device4: 1,
      device5: 1,
      device6: 1,
      device7: 1,
      device8: 1,
      device9: 1,
      device10: 1
    }
  };

results = solver.Solve(model);
console.log(results);
