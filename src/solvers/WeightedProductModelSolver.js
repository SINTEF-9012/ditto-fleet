import moment from "moment";

function solve(parameters, devices) {
  var number = parseInt(parameters.number.value);
  delete parameters.number;

  var matchingDevices = [];

  Object.keys(devices).forEach((keyDevice, index) => {
    let isMatch = true;

    Object.keys(parameters).forEach((keyParam, index) => {
      let parameter = parameters[keyParam].value;
      let tag = devices[keyDevice].tags[keyParam];

      if (Array.isArray(parameter)) {
        if (parameter.every(element => moment.isMoment(element))) {
          //TODO
        }
        if (
          parameter.every(
            element => typeof element === "string" || element instanceof String
          )
        ) {
          console.log("String array detected: " + parameter);
          if (!checkStringArray(parameter, tag)) {
            isMatch = false;
          }
        }
      }

      if (typeof parameter === "number" && isFinite(parameter)) {
        console.log("Number detected: " + parameter);
        if (!checkNumber(parameter, tag)) {
          console.log("numeric", isMatch);
          isMatch = false;
        }
      }
    });

    if (isMatch) {
      matchingDevices.push(devices[keyDevice]);
    }
  });

  console.log("Matching devices", matchingDevices);

  //var result = {};

  Object.keys(matchingDevices).forEach((key, index) => {
    let cpu = matchingDevices[key].tags.cpu;
    let ram = matchingDevices[key].tags.ram;
    let storage = matchingDevices[key].tags.storage;

    let weightedProduct =
      Math.pow(cpu, parameters.cpu.weight / 10) *
      Math.pow(ram, parameters.ram.weight / 10) *
      Math.pow(storage, parameters.storage.weight / 10);

    matchingDevices[key].weight = weightedProduct;

    console.log(matchingDevices[key].id + ": " + weightedProduct);
  });

  matchingDevices.sort((a, b) => (a.weight > b.weight ? 1 : -1));
  if (matchingDevices.length > number) {
    matchingDevices.length = number;
  }

  console.log("Matching devices sorted", matchingDevices);

  return matchingDevices;
}

/**
 * Dummy function without any checks.
 *
 * @param {*} parameters
 * @param {*} devices
 */
function solveDummy(parameters, devices) {
  return devices;
}

/**
 * Checks if the device date is within the the specified target date range.
 *
 * @param {*} startDate target start date
 * @param {*} endDate target end date
 * @param {*} date input date
 */
// function checkMomentArray(startDate, endDate, date) {
//   return date.isAfter(startDate) && date.isBefore(endDate);
// }

/**
 * Checks if the device tag is among the specified target parameters.
 *
 * @param {*} parameterArray target parameters
 * @param {*} tag input tag
 */
function checkStringArray(parameterArray, tag) {
  return (
    (typeof tag === "string" || tag instanceof String) &&
    parameterArray.includes(tag)
  );
}

/**
 * Checks if the device tag is greater or equal to the specified target numeric threshold.
 *
 * @param {*} parameter
 * @param {*} tag
 */
function checkNumber(parameter, tag) {
  let numTag = parseInt(tag);
  return numTag >= parameter;
}

export { solve, solveDummy };
